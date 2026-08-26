import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED_GROUPING = {
  'REF-000002': ['ASSET-000001', 'ASSET-000002'],
  'REF-000006': ['ASSET-000015', 'ASSET-000016'],
  'REF-000019': ['ASSET-000046', 'ASSET-000047', 'ASSET-000048'],
  'REF-000025': ['ASSET-000064', 'ASSET-000065', 'ASSET-000066']
};
const SCOPES = new Set(['product_design', 'promotional_visual']);
const CLASSES = new Set(['observation', 'inference']);
const CONFIDENCE = new Set(['low', 'medium', 'high']);

function fail(message) { throw new Error(`P2A-3R preflight failed: ${message}`); }
function nonblank(value) { return typeof value === 'string' && value.trim().length > 0; }
function sameArray(left, right) { return left.length === right.length && left.every((value, index) => value === right[index]); }

function flatten(input) {
  return input.references.flatMap(reference => reference.assertions.map(assertion => ({ ...assertion, reference_key: reference.reference_key })));
}

function snapshotObservations(db) {
  const total = Number(db.prepare('SELECT COUNT(*) AS count FROM image_visual_observation').get().count);
  const row = db.prepare(`SELECT COUNT(*) AS count, MIN(id) AS min_id, MAX(id) AS max_id,
    COALESCE(SUM(id), 0) AS id_sum, COALESCE(SUM(length(observed_value)), 0) AS value_length_sum
    FROM image_visual_observation WHERE id <= 45`).get();
  if (![45, 67, 80].includes(total) || Number(row.count) !== 45 || Number(row.min_id) !== 1 || Number(row.max_id) !== 45 || Number(row.id_sum) !== 1035 || Number(row.value_length_sum) !== 5479)
    fail(`observation fingerprint mismatch: ${JSON.stringify({ total, ...row })}`);
  return { count: Number(row.count), id_sum: Number(row.id_sum), value_length_sum: Number(row.value_length_sum) };
}

function assertSchema(db) {
  if (!db.prepare("SELECT 1 FROM schema_migration WHERE version='009_p2a_reference_synthesis'").get()) fail('migration 009 is not recorded');
  for (const table of ['design_reference_synthesis_assertion', 'design_reference_synthesis_source'])
    if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table)) fail(`${table} is missing`);
  if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') fail('integrity_check is not ok');
  if (db.prepare('PRAGMA foreign_key_check').all().length) fail('foreign_key_check has violations');
}

function validateInput(input) {
  if (input?.contract_version !== 'P2A-REFERENCE-SYNTHESIS-V1') fail('contract_version is invalid');
  for (const field of ['analysis_version', 'producer_type', 'producer_id', 'synthesis_run_key']) if (!nonblank(input[field])) fail(`${field} is blank`);
  if (input.producer_type !== 'assistant_model') fail('producer_type must be assistant_model');
  if (!Array.isArray(input.proposed_pattern_changes) || input.proposed_pattern_changes.length) fail('proposed_pattern_changes must be empty');
  if (!Array.isArray(input.proposed_theme_changes) || input.proposed_theme_changes.length) fail('proposed_theme_changes must be empty');
  if (!Array.isArray(input.references) || input.references.length !== Object.keys(EXPECTED_GROUPING).length) fail('reference set is invalid');
  const keys = input.references.map(row => row?.reference_key);
  if (new Set(keys).size !== keys.length || !sameArray([...keys].sort(), Object.keys(EXPECTED_GROUPING).sort())) fail('reference set is not the exact pilot set');
  const assertions = flatten(input); const assertionKeys = new Set(); let sourceCount = 0;
  for (const reference of input.references) {
    if (!sameArray(reference.expected_asset_keys ?? [], EXPECTED_GROUPING[reference.reference_key])) fail(`${reference.reference_key} expected_asset_keys mismatch`);
    if (!Array.isArray(reference.assertions) || !reference.assertions.length) fail(`${reference.reference_key} has no assertions`);
    for (const assertion of reference.assertions) {
      if (!nonblank(assertion.assertion_key) || assertionKeys.has(assertion.assertion_key)) fail(`invalid or duplicate assertion_key ${JSON.stringify(assertion.assertion_key)}`);
      assertionKeys.add(assertion.assertion_key);
      if (!SCOPES.has(assertion.synthesis_scope) || !CLASSES.has(assertion.assertion_class) || !CONFIDENCE.has(assertion.confidence)) fail(`${assertion.assertion_key} has invalid enum`);
      if (!nonblank(assertion.assertion_type) || !nonblank(assertion.asserted_value)) fail(`${assertion.assertion_key} has blank semantic fields`);
      if (!Array.isArray(assertion.source_image_observation_ids) || !assertion.source_image_observation_ids.length) fail(`${assertion.assertion_key} has no sources`);
      const ids = assertion.source_image_observation_ids;
      if (!ids.every(Number.isInteger) || new Set(ids).size !== ids.length) fail(`${assertion.assertion_key} sources must be unique integer ids`);
      sourceCount += ids.length;
    }
  }
  return { assertions, expected_assertions: assertions.length, expected_sources: sourceCount };
}

function validateEvidenceMap(input, db) {
  if (input.source_evidence_map !== 'outputs/p2a-3s0-reference-evidence-map.json') fail('source_evidence_map is unexpected');
  const map = JSON.parse(readFileSync(join(root, input.source_evidence_map), 'utf8'));
  const summary = map.summary ?? {};
  if (summary.reference_count !== 4 || summary.asset_count !== 10 || summary.observation_count !== 45 || summary.observation_id_sum !== 1035 || summary.observed_value_length_sum !== 5479) fail('evidence map summary mismatch');
  if (JSON.stringify(map.source?.grouping) !== JSON.stringify(EXPECTED_GROUPING)) fail('evidence map grouping mismatch');
  const byId = new Map((map.observations ?? []).map(row => [row.image_visual_observation_id, row]));
  if (byId.size !== 45) fail('evidence map observation set is invalid');
  return byId;
}

function resolveAndValidate(db, input, planned, evidenceMap) {
  const referenceIds = new Map();
  for (const [referenceKey, assets] of Object.entries(EXPECTED_GROUPING)) {
    const ref = db.prepare('SELECT id FROM design_reference WHERE reference_key=?').all(referenceKey);
    if (ref.length !== 1) fail(`${referenceKey} resolved ${ref.length} times`);
    referenceIds.set(referenceKey, Number(ref[0].id));
    for (const assetKey of assets) {
      const asset = db.prepare('SELECT id FROM image_asset WHERE asset_key=?').all(assetKey);
      if (asset.length !== 1) fail(`${assetKey} resolved ${asset.length} times`);
      const links = db.prepare(`SELECT d.reference_key FROM design_reference_image dri JOIN design_reference d ON d.id=dri.design_reference_id
        WHERE dri.image_asset_id=?`).all(asset[0].id).map(row => row.reference_key);
      if (!sameArray(links, [referenceKey])) fail(`${assetKey} is not linked exclusively to ${referenceKey}`);
    }
  }
  const sourceRows = new Map();
  for (const assertion of planned.assertions) for (const id of assertion.source_image_observation_ids) {
    const row = db.prepare(`SELECT o.id,o.observation_scope,o.assertion_class,o.observation_type,o.observed_value,o.confidence,o.producer_type,o.producer_id,o.analysis_version,
      a.asset_key,d.reference_key FROM image_visual_observation o JOIN image_asset a ON a.id=o.image_asset_id
      JOIN design_reference_image dri ON dri.image_asset_id=a.id JOIN design_reference d ON d.id=dri.design_reference_id WHERE o.id=?`).all(id);
    if (row.length !== 1) fail(`source observation ${id} resolved ${row.length} times`);
    const source = row[0]; const map = evidenceMap.get(id);
    if (!map || map.design_reference_key !== assertion.reference_key || map.asset_key !== source.asset_key) fail(`source observation ${id} evidence-map provenance mismatch`);
    for (const [dbField, mapField] of [['observation_scope','scope'], ['assertion_class','assertion_class'], ['observation_type','observation_type'], ['observed_value','observed_value'], ['confidence','confidence'], ['producer_type','producer_type'], ['producer_id','producer_id'], ['analysis_version','analysis_version']])
      if (source[dbField] !== map[mapField]) fail(`source observation ${id} evidence-map metadata mismatch`);
    if (source.reference_key !== assertion.reference_key || !EXPECTED_GROUPING[assertion.reference_key].includes(source.asset_key)) fail(`source observation ${id} belongs to a different reference`);
    if (source.observation_scope !== assertion.synthesis_scope) fail(`source observation ${id} scope does not match ${assertion.assertion_key}`);
    sourceRows.set(id, source);
  }
  return { referenceIds, sourceRows };
}

function verifyExisting(db, input, planned, referenceIds) {
  const existing = db.prepare(`SELECT a.*, d.reference_key FROM design_reference_synthesis_assertion a JOIN design_reference d ON d.id=a.design_reference_id`).all();
  if (!existing.length) return;
  if (existing.length !== planned.expected_assertions) fail('unexpected pre-existing synthesis assertions');
  const inputByKey = new Map(planned.assertions.map(row => [row.assertion_key, row]));
  for (const row of existing) {
    const expected = inputByKey.get(row.assertion_key);
    if (!expected || row.design_reference_id !== referenceIds.get(expected.reference_key) || row.synthesis_scope !== expected.synthesis_scope || row.assertion_class !== expected.assertion_class || row.assertion_type !== expected.assertion_type || row.asserted_value !== expected.asserted_value || row.confidence !== expected.confidence || row.producer_type !== input.producer_type || row.producer_id !== input.producer_id || row.analysis_version !== input.analysis_version) fail(`unexpected pre-existing synthesis assertion ${row.assertion_key}`);
    const actualSources = db.prepare('SELECT image_visual_observation_id FROM design_reference_synthesis_source WHERE synthesis_assertion_id=? ORDER BY image_visual_observation_id').all(row.id).map(source => Number(source.image_visual_observation_id));
    const expectedSources = [...expected.source_image_observation_ids].sort((a, b) => a - b);
    if (!sameArray(actualSources, expectedSources)) fail(`pre-existing source links mismatch for ${row.assertion_key}`);
  }
  if (db.prepare('SELECT COUNT(*) AS n FROM design_reference_synthesis_source').get().n !== planned.expected_sources) fail('unexpected pre-existing synthesis source count');
}

function legacyFingerprint(db) {
  const tables = ['design_reference_observation', 'design_assessment', 'visual_communication_reference', 'design_reference_pattern', 'design_reference_theme', 'preference_evidence', 'image_visual_observation'];
  return Object.fromEntries(tables.map(table => [table, JSON.stringify(db.prepare(`SELECT * FROM ${table} ORDER BY id`).all())]));
}

export function importReferenceSynthesis(dbPath, inputPath, { dryRun = false } = {}) {
  const input = JSON.parse(readFileSync(inputPath, 'utf8'));
  const planned = validateInput(input); const db = new DatabaseSync(dbPath); db.exec('PRAGMA foreign_keys=ON');
  try {
    assertSchema(db); const observation_fingerprint = snapshotObservations(db); const evidenceMap = validateEvidenceMap(input, db);
    const resolved = resolveAndValidate(db, input, planned, evidenceMap); verifyExisting(db, input, planned, resolved.referenceIds);
    if (dryRun) return { dry_run: true, expected_assertions: planned.expected_assertions, expected_sources: planned.expected_sources, created_assertions: 0, reused_assertions: 0, created_sources: 0, reused_sources: 0, observation_fingerprint };
    const legacyBefore = legacyFingerprint(db); let createdAssertions = 0; let reusedAssertions = 0; let createdSources = 0; let reusedSources = 0;
    db.exec('BEGIN IMMEDIATE');
    const find = db.prepare('SELECT id FROM design_reference_synthesis_assertion WHERE assertion_key=?');
    const insert = db.prepare(`INSERT INTO design_reference_synthesis_assertion (assertion_key,design_reference_id,synthesis_scope,assertion_class,assertion_type,asserted_value,confidence,producer_type,producer_id,analysis_version,synthesis_run_key) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
    const sourceFind = db.prepare('SELECT 1 FROM design_reference_synthesis_source WHERE synthesis_assertion_id=? AND image_visual_observation_id=?');
    const sourceInsert = db.prepare('INSERT INTO design_reference_synthesis_source(synthesis_assertion_id,image_visual_observation_id) VALUES (?,?)');
    for (const assertion of planned.assertions) {
      let row = find.get(assertion.assertion_key);
      if (row) reusedAssertions += 1;
      else { row = { id: Number(insert.run(assertion.assertion_key, resolved.referenceIds.get(assertion.reference_key), assertion.synthesis_scope, assertion.assertion_class, assertion.assertion_type, assertion.asserted_value, assertion.confidence, input.producer_type, input.producer_id, input.analysis_version, input.synthesis_run_key).lastInsertRowid) }; createdAssertions += 1; }
      for (const sourceId of [...assertion.source_image_observation_ids].sort((a, b) => a - b)) {
        if (sourceFind.get(row.id, sourceId)) reusedSources += 1;
        else { sourceInsert.run(row.id, sourceId); createdSources += 1; }
      }
    }
    db.exec('COMMIT');
    verifyExisting(db, input, planned, resolved.referenceIds);
    if (JSON.stringify(legacyBefore) !== JSON.stringify(legacyFingerprint(db))) fail('legacy/P1C/image-observation tables changed');
    snapshotObservations(db); assertSchema(db);
    return { dry_run: false, expected_assertions: planned.expected_assertions, expected_sources: planned.expected_sources, created_assertions: createdAssertions, reused_assertions: reusedAssertions, created_sources: createdSources, reused_sources: reusedSources, observation_fingerprint };
  } catch (error) { try { db.exec('ROLLBACK'); } catch {} throw error; } finally { db.close(); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = process.argv.slice(2); const dryRun = args.includes('--dry-run'); const paths = args.filter(value => value !== '--dry-run');
  console.log(JSON.stringify(importReferenceSynthesis(resolve(paths[0] ?? join(root, 'data', 'crystal-design.sqlite')), resolve(paths[1] ?? join(root, 'inputs', 'p2a-3s1-reference-synthesis.json')), { dryRun }), null, 2));
}
