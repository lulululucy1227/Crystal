import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COMMON = { protocol_version: 'AGENT-HANDOFF-V1', producer_type: 'assistant_model', producer_id: 'gpt-5.6-sol', analysis_version: 'p2a-vision-v1' };
const B01 = {
  phase: 'P2A-HISTORICAL-UPGRADE-B01', assets: {
    'ASSET-000041': 'REF-000017', 'ASSET-000042': 'REF-000017', 'ASSET-000043': 'REF-000018', 'ASSET-000044': 'REF-000018', 'ASSET-000045': 'REF-000018'
  }, rows: 22
};
const COAST = {
  phase: 'P2A-NEW-REFERENCE-CRETACEOUS-COAST-FRAGMENTS-IMAGE-OBSERVATIONS', reference: 'REF-000026', rows: 13, assets: {
    'ASSET-000067': ['REF-000026', '1G3vgzk5As10zXs3pPfXdc-oA3dG5iiAk'],
    'ASSET-000068': ['REF-000026', '1laJm9mwscENnZ6agSLcvUitzsJyUfO_P'],
    'ASSET-000069': ['REF-000026', '1QH29N5T9k_AKmK36x_ytiEQ4gEyEKt3i']
  }
};
const allowed = {
  observation_scope: new Set(['product_design', 'promotional_visual']),
  assertion_class: new Set(['observation', 'inference']),
  confidence: new Set(['low', 'medium', 'high'])
};

function fail(message) { throw new Error(`P2A visual-observation preflight failed: ${message}`); }
function nonblank(value) { return typeof value === 'string' && value.trim().length > 0; }

function contractFor(input) {
  for (const [field, expected] of Object.entries(COMMON)) if (input?.[field] !== expected) fail(`${field} must be exactly ${JSON.stringify(expected)}; received ${JSON.stringify(input?.[field])}`);
  if (input.phase === 'P2A-2R') return { kind: 'pilot', assetCount: 10, rowCount: 45 };
  if (input.phase === B01.phase) return { kind: 'b01', assetCount: 5, rowCount: B01.rows };
  if (input.phase === COAST.phase) {
    if (input.reference_key !== COAST.reference || input.user_supplied_concept_name !== '白垩纪的海岸碎片') fail('coast reference/concept identity is not exact');
    return { kind: 'coast', assetCount: 3, rowCount: COAST.rows };
  }
  fail(`phase is not an authorized importer contract: ${JSON.stringify(input.phase)}`);
}

function validateInput(input, contract) {
  if (!Array.isArray(input.assets) || input.assets.length !== contract.assetCount) fail(`expected exactly ${contract.assetCount} assets; received ${input.assets?.length ?? 'non-array'}`);
  const keys = new Set(); let rowCount = 0;
  for (const [assetIndex, asset] of input.assets.entries()) {
    if (!asset || typeof asset !== 'object') fail(`asset ${assetIndex} is not an object`);
    for (const field of ['asset_key', 'reference_key', 'source_content_sha256']) if (!nonblank(asset[field])) fail(`asset ${assetIndex} has invalid ${field}`);
    if (keys.has(asset.asset_key)) fail(`duplicate asset_key ${asset.asset_key}`); keys.add(asset.asset_key);
    if (!/^[0-9a-fA-F]{64}$/.test(asset.source_content_sha256)) fail(`${asset.asset_key} has invalid source_content_sha256`);
    if (contract.kind === 'b01') {
      if (B01.assets[asset.asset_key] !== asset.reference_key) fail(`${asset.asset_key} is not in the exact B01 asset/reference set`);
      if (asset.provider !== 'google_drive' || !nonblank(asset.provider_file_id)) fail(`${asset.asset_key} has invalid Google Drive identity`);
    }
    if (contract.kind === 'coast') {
      const expected = COAST.assets[asset.asset_key];
      if (!expected || asset.reference_key !== expected[0] || asset.provider !== 'google_drive' || asset.provider_file_id !== expected[1]) fail(`${asset.asset_key} is not in the exact coast asset/reference set`);
    }
    if (!Array.isArray(asset.observations) || !asset.observations.length) fail(`${asset.asset_key} has no observations`);
    for (const [rowIndex, row] of asset.observations.entries()) {
      const label = `${asset.asset_key} observation ${rowIndex}`;
      for (const field of Object.keys(allowed)) if (!allowed[field].has(row?.[field])) fail(`${label} has invalid ${field}: ${JSON.stringify(row?.[field])}`);
      for (const field of ['observation_type', 'observed_value']) if (!nonblank(row?.[field])) fail(`${label} has invalid ${field}`);
      rowCount += 1;
    }
  }
  if (contract.kind === 'b01' && (keys.size !== 5 || [...keys].some(key => !(key in B01.assets)))) fail('B01 asset set is incomplete or unexpected');
  if (contract.kind === 'coast' && (keys.size !== 3 || [...keys].some(key => !(key in COAST.assets)))) fail('coast asset set is incomplete or unexpected');
  if (rowCount !== contract.rowCount) fail(`expected exactly ${contract.rowCount} observation rows; received ${rowCount}`);
  return rowCount;
}

function ensureMigration008(db, allowApply) {
  const applied = db.prepare("SELECT 1 FROM schema_migration WHERE version='008_p2a_visual_observation'").get();
  if (applied) return false;
  if (!allowApply) fail('migration 008 is required for B01 and may not be applied by this importer');
  db.exec(readFileSync(join(root, 'migrations', '008_p2a_visual_observation.sql'), 'utf8'));
  db.prepare('INSERT INTO schema_migration(version) VALUES (?)').run('008_p2a_visual_observation');
  return true;
}

function b01Baseline(db) {
  const fp = db.prepare('SELECT COUNT(*) count,MIN(id) min_id,MAX(id) max_id,SUM(id) id_sum,SUM(length(observed_value)) value_sum FROM image_visual_observation WHERE id<=45').get();
  const total = Number(db.prepare('SELECT COUNT(*) n FROM image_visual_observation').get().n);
  if (![45, 67].includes(total) || Number(fp.count) !== 45 || Number(fp.min_id) !== 1 || Number(fp.max_id) !== 45 || Number(fp.id_sum) !== 1035 || Number(fp.value_sum) !== 5479) fail(`B01 pilot baseline mismatch: total=${total}; ${JSON.stringify(fp)}`);
  if (Number(db.prepare('SELECT COUNT(*) n FROM design_reference_synthesis_assertion').get().n) !== 19 || Number(db.prepare('SELECT COUNT(*) n FROM design_reference_synthesis_source').get().n) !== 37) fail('B01 synthesis baseline mismatch');
  if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok' || db.prepare('PRAGMA foreign_key_check').all().length) fail('B01 database integrity check failed');
}

function coastBaseline(db) {
  const total = Number(db.prepare('SELECT COUNT(*) n FROM image_visual_observation').get().n);
  if (![67, 80].includes(total)) fail(`coast observation baseline mismatch: total=${total}`);
  if (Number(db.prepare('SELECT COUNT(*) n FROM design_reference_synthesis_assertion').get().n) !== 19 || Number(db.prepare('SELECT COUNT(*) n FROM design_reference_synthesis_source').get().n) !== 37) fail('coast synthesis baseline mismatch');
  if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok' || db.prepare('PRAGMA foreign_key_check').all().length) fail('coast database integrity check failed');
}

function identity(assetId, asset, row, input) { return [assetId, asset.source_content_sha256, row.observation_scope, row.assertion_class, row.observation_type, row.observed_value, input.producer_type, input.producer_id, input.analysis_version]; }

function checkExistingRows(db, input, resolved, label) {
  const expected = new Map();
  for (const asset of input.assets) for (const row of asset.observations) expected.set(JSON.stringify(identity(resolved.get(asset.asset_key).id, asset, row, input)), row.confidence);
  const ids = [...resolved.values()].map(row => row.id);
  const rows = db.prepare(`SELECT image_asset_id,source_content_sha256,observation_scope,assertion_class,observation_type,observed_value,confidence,producer_type,producer_id,analysis_version FROM image_visual_observation WHERE image_asset_id IN (${ids.map(() => '?').join(',')})`).all(...ids);
  for (const row of rows) {
    const key = JSON.stringify([row.image_asset_id, row.source_content_sha256, row.observation_scope, row.assertion_class, row.observation_type, row.observed_value, row.producer_type, row.producer_id, row.analysis_version]);
    if (!expected.has(key) || expected.get(key) !== row.confidence) fail(`${label} has unexpected pre-existing observation for asset id ${row.image_asset_id}`);
  }
}

export function importVisualObservations(dbPath, inputPath) {
  const input = JSON.parse(readFileSync(inputPath, 'utf8')); const contract = contractFor(input); const rowCount = validateInput(input, contract);
  const db = new DatabaseSync(dbPath); db.exec('PRAGMA foreign_keys = ON'); let migrated = false;
  try {
    migrated = ensureMigration008(db, contract.kind === 'pilot'); if (contract.kind === 'b01') b01Baseline(db); if (contract.kind === 'coast') coastBaseline(db);
    db.exec('BEGIN IMMEDIATE'); const resolved = new Map();
    for (const asset of input.assets) {
      const columns = ['b01', 'coast'].includes(contract.kind) ? 'id,image_hash,provider,provider_file_id,asset_status,mime_type,width_px,height_px,byte_size' : 'id,image_hash';
      const matches = db.prepare(`SELECT ${columns} FROM image_asset WHERE asset_key=?`).all(asset.asset_key);
      if (matches.length !== 1) fail(`${asset.asset_key} resolved ${matches.length} times; expected exactly once`);
      const match = matches[0];
      if (String(match.image_hash ?? '').toLowerCase() !== asset.source_content_sha256.toLowerCase()) fail(`${asset.asset_key} SHA mismatch: DB=${JSON.stringify(match.image_hash)} input=${JSON.stringify(asset.source_content_sha256)}`);
      const links = db.prepare('SELECT d.reference_key FROM design_reference_image dri JOIN design_reference d ON d.id=dri.design_reference_id WHERE dri.image_asset_id=? AND d.reference_key=?').all(match.id, asset.reference_key);
      if (links.length !== 1) fail(`${asset.asset_key} reference mismatch: expected exactly one linkage to ${asset.reference_key}; found ${links.length}`);
      if (['b01', 'coast'].includes(contract.kind)) {
        if (match.provider !== 'google_drive' || match.provider_file_id !== asset.provider_file_id) fail(`${asset.asset_key} provider identity mismatch`);
        if (match.asset_status !== 'available' || !nonblank(match.mime_type) || !Number.isInteger(match.width_px) || !Number.isInteger(match.height_px) || !Number.isInteger(match.byte_size)) fail(`${asset.asset_key} deterministic metadata is not resolved`);
      }
      resolved.set(asset.asset_key, match);
    }
    if (contract.kind === 'b01') checkExistingRows(db, input, resolved, 'B01');
    if (contract.kind === 'coast') checkExistingRows(db, input, resolved, 'coast');
    const findExisting = db.prepare('SELECT id,confidence FROM image_visual_observation WHERE image_asset_id=? AND source_content_sha256=? COLLATE NOCASE AND observation_scope=? AND assertion_class=? AND observation_type=? AND observed_value=? AND producer_type=? AND producer_id=? AND analysis_version=?');
    const insert = db.prepare('INSERT INTO image_visual_observation (image_asset_id,source_content_sha256,observation_scope,assertion_class,observation_type,observed_value,confidence,producer_type,producer_id,analysis_version) VALUES (?,?,?,?,?,?,?,?,?,?)');
    let created = 0; let reused = 0;
    for (const asset of input.assets) for (const row of asset.observations) {
      const values = identity(resolved.get(asset.asset_key).id, asset, row, input); const existing = findExisting.get(...values);
      if (existing) { if (existing.confidence !== row.confidence) fail(`${asset.asset_key} existing row ${existing.id} has confidence ${existing.confidence}, input has ${row.confidence}`); reused += 1; }
      else { insert.run(...values.slice(0, 6), row.confidence, ...values.slice(6)); created += 1; }
    }
    db.exec('COMMIT');
    const counts = Object.fromEntries(db.prepare('SELECT assertion_class AS key,COUNT(*) AS n FROM image_visual_observation WHERE producer_type=? AND producer_id=? AND analysis_version=? GROUP BY assertion_class').all(input.producer_type, input.producer_id, input.analysis_version).map(x => [x.key, x.n]));
    const scopes = Object.fromEntries(db.prepare('SELECT observation_scope AS key,COUNT(*) AS n FROM image_visual_observation WHERE producer_type=? AND producer_id=? AND analysis_version=? GROUP BY observation_scope').all(input.producer_type, input.producer_id, input.analysis_version).map(x => [x.key, x.n]));
    return { migrated, input_assets: input.assets.length, input_observations: rowCount, created, reused, assertion_counts: counts, scope_counts: scopes };
  } catch (error) { try { db.exec('ROLLBACK'); } catch {} throw error; } finally { db.close(); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const dbPath = resolve(process.argv[2] ?? join(root, 'data', 'crystal-design.sqlite')); const inputPath = resolve(process.argv[3] ?? join(root, 'inputs', 'p2a-2r-vision-observations.json'));
  console.log(JSON.stringify(importVisualObservations(dbPath, inputPath), null, 2));
}
