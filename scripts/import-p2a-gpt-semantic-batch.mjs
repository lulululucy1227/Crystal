import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scopes = new Set(['product_design', 'promotional_visual']);
const classes = new Set(['observation', 'inference']);
const confidence = new Set(['low', 'medium', 'high']);

function fail(message) { throw new Error(`P2A GPT semantic batch preflight failed: ${message}`); }
function text(value) { return typeof value === 'string' && value.trim() ? value : null; }
function requireText(value, label) { if (!text(value)) fail(`${label} is blank`); return value; }
function requireEnum(value, values, label) { if (!values.has(value)) fail(`${label} is invalid: ${JSON.stringify(value)}`); return value; }
function json(value) { return JSON.stringify(value ?? null); }

function normalize(input) {
  if (input?.contract_version !== 'P2A-GPT-SEMANTIC-BATCH-V1') fail('contract_version is not P2A-GPT-SEMANTIC-BATCH-V1');
  for (const field of ['analysis_version', 'synthesis_analysis_version', 'producer_type', 'producer_id', 'batch_key']) requireText(input[field], field);
  if (input.producer_type !== 'assistant_model') fail('producer_type must be assistant_model');
  for (const field of ['proposed_pattern_changes', 'proposed_theme_changes', 'proposed_preference_changes']) if (input[field] && (!Array.isArray(input[field]) || input[field].length)) fail(`${field} must be empty or absent`);
  const groups = input.reference_groups ?? input.existing_reference_batches;
  if (!Array.isArray(groups) || !groups.length) fail('no reference groups supplied');
  const newGroups = Array.isArray(input.reference_groups);
  const seen = new Set();
  return groups.map((group, index) => {
    const groupKey = newGroups ? requireText(group.reference_group_key, `group ${index} reference_group_key`) : requireText(group.reference_key, `group ${index} reference_key`);
    if (seen.has(groupKey)) fail(`duplicate group key ${groupKey}`); seen.add(groupKey);
    const canonicalOnly = group.image_observations_already_canonical === true;
    if ((!Array.isArray(group.assets) || !group.assets.length) && !canonicalOnly) fail(`${groupKey} has no assets`);
    if (!Array.isArray(group.image_observations) && !canonicalOnly) fail(`${groupKey} image_observations is not an array`);
    if (!Array.isArray(group.reference_synthesis_draft)) fail(`${groupKey} reference_synthesis_draft is not an array`);
    const filenames = new Set(); const assetByFilename = new Map();
    for (const asset of group.assets ?? []) {
      for (const field of ['filename', 'provider', 'provider_file_id', 'source_content_sha256', 'mime_type']) requireText(asset[field], `${groupKey} asset ${field}`);
      if (asset.provider !== 'google_drive' || !/^[0-9a-f]{64}$/i.test(asset.source_content_sha256)) fail(`${groupKey} asset ${asset.filename} has invalid provider or SHA`);
      if (!Number.isInteger(asset.width_px) || !Number.isInteger(asset.height_px) || !Number.isInteger(asset.byte_size) || asset.width_px <= 0 || asset.height_px <= 0 || asset.byte_size < 0) fail(`${groupKey} asset ${asset.filename} metadata is invalid`);
      if (filenames.has(asset.filename)) fail(`${groupKey} repeats filename ${asset.filename}`); filenames.add(asset.filename); assetByFilename.set(asset.filename, asset);
    }
    const observations = (group.image_observations ?? []).map((row, rowIndex) => {
      if (!assetByFilename.has(row?.filename)) fail(`${groupKey} observation ${rowIndex} has unknown filename`);
      requireEnum(row.observation_scope, scopes, `${groupKey} observation ${rowIndex} scope`); requireEnum(row.assertion_class, classes, `${groupKey} observation ${rowIndex} class`); requireEnum(row.confidence, confidence, `${groupKey} observation ${rowIndex} confidence`);
      requireText(row.observation_type, `${groupKey} observation ${rowIndex} type`); requireText(row.observed_value, `${groupKey} observation ${rowIndex} value`); return row;
    });
    const syntheses = group.reference_synthesis_draft.map((row, rowIndex) => {
      requireText(row.assertion_key_suffix, `${groupKey} synthesis ${rowIndex} key suffix`); requireEnum(row.synthesis_scope, scopes, `${groupKey} synthesis ${rowIndex} scope`); requireEnum(row.assertion_class, classes, `${groupKey} synthesis ${rowIndex} class`); requireEnum(row.confidence, confidence, `${groupKey} synthesis ${rowIndex} confidence`);
      requireText(row.assertion_type, `${groupKey} synthesis ${rowIndex} type`); requireText(row.asserted_value, `${groupKey} synthesis ${rowIndex} value`);
      const sources = row.source_image_observation_ids ?? row.source_observation_selectors;
      if (!Array.isArray(sources) || !sources.length) fail(`${groupKey} synthesis ${rowIndex} has no source selectors`);
      if (row.source_image_observation_ids && (!sources.every(Number.isInteger) || new Set(sources).size !== sources.length)) fail(`${groupKey} synthesis ${rowIndex} has invalid source observation ids`);
      return row;
    });
    return { group, groupKey, newGroup: newGroups, canonicalOnly, assetByFilename, observations, syntheses };
  });
}

function findReferenceByMarker(db, batchKey, groupKey) {
  return db.prepare('SELECT * FROM design_reference WHERE notes LIKE ?').get(`%P2A-GPT-SEMANTIC-BATCH-V1 | batch=${batchKey} | group=${groupKey}%`);
}

function createReference(db, input, item) {
  const sourceName = `GPT semantic source: ${item.group.working_name}`;
  const sourceNotes = `P2A-GPT-SEMANTIC-BATCH-V1 | batch=${input.batch_key} | group=${item.groupKey} | source_context=${json(item.group.source_context)} | source claims remain source claims only.`;
  let source = db.prepare('SELECT id FROM source WHERE name=? AND notes=?').get(sourceName, sourceNotes);
  if (!source) source = { id: Number(db.prepare("INSERT INTO source(source_type,name,verification_status,evidence_strength,notes) VALUES ('social',?,'unverified','low',?)").run(sourceName, sourceNotes).lastInsertRowid) };
  const notes = `P2A-GPT-SEMANTIC-BATCH-V1 | batch=${input.batch_key} | group=${item.groupKey} | working_name=${item.group.working_name} | semantic source content is GPT-authored; source labels remain unconfirmed claims.`;
  const id = Number(db.prepare("INSERT INTO design_reference(reference_type,source_id,brand_or_designer,relevance_score,notes,record_status,evidence_status) VALUES ('social',?,?,?,?,'real','assistant_observed')")
    .run(source.id, item.group.source_context?.account_visible ?? null, 5, notes).lastInsertRowid);
  return db.prepare('SELECT * FROM design_reference WHERE id=?').get(id);
}

function resolveReference(db, input, item, counts) {
  if (!item.newGroup) {
    const row = db.prepare('SELECT * FROM design_reference WHERE reference_key=?').get(item.groupKey);
    if (!row) fail(`${item.groupKey} does not exist`); return row;
  }
  const existing = findReferenceByMarker(db, input.batch_key, item.groupKey);
  if (existing) { counts.reused_references += 1; return existing; }
  counts.created_references += 1; return createReference(db, input, item);
}

function resolveAsset(db, ref, input, item, asset, counts) {
  let row = db.prepare('SELECT * FROM image_asset WHERE provider=? AND provider_file_id=?').get(asset.provider, asset.provider_file_id);
  if (row) {
    if (row.original_filename !== asset.filename) fail(`${item.groupKey} ${asset.filename} existing asset filename mismatch`);
    const supplied = { image_hash: asset.source_content_sha256, mime_type: asset.mime_type, width_px: asset.width_px, height_px: asset.height_px, byte_size: asset.byte_size };
    for (const [field, expected] of Object.entries(supplied)) {
      const current = row[field]; const equal = field === 'image_hash' ? String(current).toLowerCase() === String(expected).toLowerCase() : current === expected;
      if (current != null && !equal) fail(`${item.groupKey} ${asset.filename} existing asset ${field} mismatch`);
    }
    if (row.asset_status !== 'available' && row.asset_status !== 'unresolved') fail(`${item.groupKey} ${asset.filename} has unsupported existing asset_status ${row.asset_status}`);
    if (Object.keys(supplied).some(field => row[field] == null) || row.asset_status === 'unresolved') {
      db.prepare("UPDATE image_asset SET image_hash=?,mime_type=?,width_px=?,height_px=?,byte_size=?,asset_status='available',notes=? WHERE id=?").run(
        asset.source_content_sha256, asset.mime_type, asset.width_px, asset.height_px, asset.byte_size,
        `${row.notes ?? ''}\nP2A-GPT-SEMANTIC-BATCH-V1 | batch=${input.batch_key} | identity metadata resolved from authoritative provider/SHA record.`, row.id
      );
      row = db.prepare('SELECT * FROM image_asset WHERE id=?').get(row.id); counts.resolved_assets += 1;
    }
    counts.reused_assets += 1;
  } else {
    const notes = `P2A-GPT-SEMANTIC-BATCH-V1 | batch=${input.batch_key} | group=${item.groupKey} | source SHA verified against GPT input.`;
    const id = Number(db.prepare("INSERT INTO image_asset(provider,provider_file_id,original_filename,mime_type,width_px,height_px,byte_size,image_hash,asset_status,notes) VALUES (?,?,?,?,?,?,?,?, 'available',?)")
      .run(asset.provider, asset.provider_file_id, asset.filename, asset.mime_type, asset.width_px, asset.height_px, asset.byte_size, asset.source_content_sha256, notes).lastInsertRowid);
    row = db.prepare('SELECT * FROM image_asset WHERE id=?').get(id); counts.created_assets += 1;
  }
  const link = db.prepare('SELECT design_reference_id FROM design_reference_image WHERE image_asset_id=?').get(row.id);
  if (link && Number(link.design_reference_id) !== Number(ref.id)) fail(`${item.groupKey} ${asset.filename} is already linked to a different reference`);
  if (!link) {
    const order = Number(db.prepare('SELECT COALESCE(MAX(display_order), -1) + 1 n FROM design_reference_image WHERE design_reference_id=?').get(ref.id).n);
    db.prepare('INSERT INTO design_reference_image(design_reference_id,image_asset_id,display_order,image_role,notes) VALUES (?,?,?,?,?)').run(ref.id, row.id, order, 'unknown', `P2A-GPT-SEMANTIC-BATCH-V1 | batch=${input.batch_key} | group=${item.groupKey}`);
  }
  return row;
}

function resolveObservation(db, asset, row, input, counts) {
  const values = [asset.id, asset.image_hash, row.observation_scope, row.assertion_class, row.observation_type, row.observed_value, input.producer_type, input.producer_id, input.analysis_version];
  const found = db.prepare('SELECT id,confidence FROM image_visual_observation WHERE image_asset_id=? AND source_content_sha256=? COLLATE NOCASE AND observation_scope=? AND assertion_class=? AND observation_type=? AND observed_value=? AND producer_type=? AND producer_id=? AND analysis_version=?').get(...values);
  if (found) { if (found.confidence !== row.confidence) fail(`existing observation ${found.id} confidence mismatch`); counts.reused_observations += 1; return found.id; }
  const id = Number(db.prepare('INSERT INTO image_visual_observation(image_asset_id,source_content_sha256,observation_scope,assertion_class,observation_type,observed_value,confidence,producer_type,producer_id,analysis_version) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(...values.slice(0, 6), row.confidence, ...values.slice(6)).lastInsertRowid);
  counts.created_observations += 1; return id;
}

function resolveExistingSelector(db, ref, draft, selector) {
  if (Number.isInteger(selector)) {
    const row = db.prepare(`SELECT o.id,o.observation_scope FROM image_visual_observation o JOIN design_reference_image ri ON ri.image_asset_id=o.image_asset_id WHERE o.id=? AND ri.design_reference_id=?`).get(selector, ref.id);
    if (!row) fail(`synthesis source observation id ${selector} is not linked to ${ref.reference_key}`); return row;
  }
  const field = selector.asset_key ? 'a.asset_key' : 'a.original_filename'; const value = selector.asset_key ?? selector.filename;
  if (!text(value) || !text(selector.observation_type)) fail('synthesis source selector is incomplete');
  const rows = db.prepare(`SELECT o.id,o.observation_scope FROM image_visual_observation o JOIN image_asset a ON a.id=o.image_asset_id JOIN design_reference_image ri ON ri.image_asset_id=a.id WHERE ri.design_reference_id=? AND ${field}=? AND o.observation_type=?`).all(ref.id, value, selector.observation_type);
  if (rows.length !== 1) fail(`synthesis selector ${value}/${selector.observation_type} resolved ${rows.length} times at ${ref.reference_key}`); return rows[0];
}

function resolveSynthesis(db, ref, item, draft, input, observationIds, counts) {
  const key = `${input.batch_key}:${ref.reference_key}:${draft.assertion_key_suffix}`;
  let row = db.prepare('SELECT * FROM design_reference_synthesis_assertion WHERE assertion_key=?').get(key);
  if (row) {
    for (const [field, expected] of Object.entries({ design_reference_id: ref.id, synthesis_scope: draft.synthesis_scope, assertion_class: draft.assertion_class, assertion_type: draft.assertion_type, asserted_value: draft.asserted_value, confidence: draft.confidence, producer_type: input.producer_type, producer_id: input.producer_id, analysis_version: input.synthesis_analysis_version, synthesis_run_key: input.batch_key }))
      if (row[field] !== expected) fail(`existing synthesis ${key} ${field} mismatch`);
    counts.reused_assertions += 1;
  } else {
    const id = Number(db.prepare('INSERT INTO design_reference_synthesis_assertion(assertion_key,design_reference_id,synthesis_scope,assertion_class,assertion_type,asserted_value,confidence,producer_type,producer_id,analysis_version,synthesis_run_key) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .run(key, ref.id, draft.synthesis_scope, draft.assertion_class, draft.assertion_type, draft.asserted_value, draft.confidence, input.producer_type, input.producer_id, input.synthesis_analysis_version, input.batch_key).lastInsertRowid);
    row = db.prepare('SELECT * FROM design_reference_synthesis_assertion WHERE id=?').get(id); counts.created_assertions += 1;
  }
  const selectors = draft.source_image_observation_ids ?? draft.source_observation_selectors;
  const sourceIds = [];
  for (const selector of selectors) {
    const local = typeof selector === 'object' && selector.filename ? observationIds.get(`${selector.filename}\u0000${selector.observation_type}`) : null;
    const source = local ? db.prepare('SELECT id,observation_scope FROM image_visual_observation WHERE id=?').get(local) : resolveExistingSelector(db, ref, draft, selector);
    sourceIds.push(source.id);
  }
  if (new Set(sourceIds).size !== sourceIds.length) fail(`${key} repeats a source observation`);
  for (const sourceId of sourceIds) {
    if (db.prepare('SELECT 1 FROM design_reference_synthesis_source WHERE synthesis_assertion_id=? AND image_visual_observation_id=?').get(row.id, sourceId)) counts.reused_sources += 1;
    else { db.prepare('INSERT INTO design_reference_synthesis_source(synthesis_assertion_id,image_visual_observation_id) VALUES (?,?)').run(row.id, sourceId); counts.created_sources += 1; }
  }
}

export function importGptSemanticBatch(dbPath, inputPath) {
  const input = JSON.parse(readFileSync(inputPath, 'utf8')); const items = normalize(input); const db = new DatabaseSync(resolve(dbPath)); db.exec('PRAGMA foreign_keys=ON');
  const counts = { created_references: 0, reused_references: 0, created_assets: 0, reused_assets: 0, resolved_assets: 0, created_observations: 0, reused_observations: 0, created_assertions: 0, reused_assertions: 0, created_sources: 0, reused_sources: 0, references: [] };
  try {
    if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok' || db.prepare('PRAGMA foreign_key_check').all().length) fail('pre-existing database integrity failure');
    db.exec('BEGIN IMMEDIATE');
    for (const item of items) {
      const ref = resolveReference(db, input, item, counts); const assets = new Map();
      for (const asset of item.group.assets ?? []) assets.set(asset.filename, resolveAsset(db, ref, input, item, asset, counts));
      const observations = new Map();
      for (const row of item.observations) observations.set(`${row.filename}\u0000${row.observation_type}`, resolveObservation(db, assets.get(row.filename), row, input, counts));
      for (const draft of item.syntheses) resolveSynthesis(db, ref, item, draft, input, observations, counts);
      counts.references.push({ group: item.groupKey, reference_key: ref.reference_key });
    }
    if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok' || db.prepare('PRAGMA foreign_key_check').all().length) fail('post-write database integrity failure');
    db.exec('COMMIT'); return counts;
  } catch (error) { try { db.exec('ROLLBACK'); } catch {} throw error; } finally { db.close(); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  console.log(JSON.stringify(importGptSemanticBatch(resolve(process.argv[2] ?? join(root, 'data', 'crystal-design.sqlite')), resolve(process.argv[3])), null, 2));
}
