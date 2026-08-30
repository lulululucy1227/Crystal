import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REQUIRED_GROUPS = 18;
const scopes = new Set(['product_design']);
const classes = new Set(['observation', 'inference']);
const confidence = new Set(['high', 'medium']);
function fail(message) { throw new Error(`P2A early-C structured completion failed: ${message}`); }
function req(value, label) { if (typeof value !== 'string' || !value.trim()) fail(`${label} is blank`); return value; }
function loadJson(path) { return JSON.parse(readFileSync(path, 'utf8')); }

function validate(original, completion) {
  if (completion.contract_version !== 'P2A-GPT-SEMANTIC-COMPLETION-SPEC-V1') fail('completion contract is invalid');
  for (const field of ['producer_type', 'producer_id', 'analysis_version', 'synthesis_analysis_version', 'batch_key']) req(completion[field], field);
  if (completion.producer_type !== original.producer_type || completion.producer_id !== original.producer_id || completion.analysis_version !== original.analysis_version || completion.batch_key !== 'P2A-GPT-HISTORICAL-EARLY-C-STRUCTURED-COMPLETION-20260830') fail('completion producer/batch does not match original GPT authority');
  const groups = new Map((original.semantic_groups ?? []).map(group => [group.group_key, group]));
  const map = completion.canonical_reference_map_after_authorized_regroup ?? {};
  const assignments = completion.group_asset_assignment ?? {};
  if (groups.size !== REQUIRED_GROUPS || Object.keys(map).length !== REQUIRED_GROUPS || Object.keys(assignments).length !== REQUIRED_GROUPS) fail('expected exactly 18 complete group mappings');
  const provenance = original.asset_provenance ?? {}; const result = [];
  for (const [groupKey, group] of groups) {
    const refKey = map[groupKey]; const assignment = assignments[groupKey];
    if (!req(refKey, `${groupKey} reference mapping`) || !assignment || !req(assignment.primary_asset, `${groupKey} primary_asset`)) fail(`${groupKey} mapping is invalid`);
    const expectedAssets = [assignment.primary_asset, ...(assignment.secondary_assets ?? [])];
    if (JSON.stringify(expectedAssets) !== JSON.stringify(group.assets)) fail(`${groupKey} asset assignment differs from original semantic group`);
    for (const filename of expectedAssets) { const p = provenance[filename]; if (!p || !req(p.provider_file_id, `${filename} provider_file_id`) || !/^[0-9a-f]{64}$/i.test(p.sha256)) fail(`${filename} provenance is invalid`); }
    result.push({ group, groupKey, refKey, assignment, provenance });
  }
  return result;
}

function resolveAsset(db, filename, provenance, refKey) {
  const rows = db.prepare('SELECT a.*,r.reference_key FROM image_asset a JOIN design_reference_image ri ON ri.image_asset_id=a.id JOIN design_reference r ON r.id=ri.design_reference_id WHERE a.original_filename=?').all(filename);
  if (rows.length !== 1) fail(`${filename} resolved ${rows.length} times`);
  let row = rows[0]; const p = provenance[filename];
  if (row.reference_key !== refKey || row.provider !== 'google_drive' || row.provider_file_id !== p.provider_file_id) fail(`${filename} reference/provider identity mismatch`);
  if (row.image_hash != null && String(row.image_hash).toLowerCase() !== p.sha256.toLowerCase()) fail(`${filename} canonical SHA conflicts with GPT provenance`);
  if (row.image_hash == null) {
    db.prepare("UPDATE image_asset SET image_hash=?, asset_status=CASE WHEN asset_status='unresolved' THEN 'available' ELSE asset_status END, notes=? WHERE id=?")
      .run(p.sha256, `${row.notes ?? ''}\nP2A-GPT-HISTORICAL-EARLY-C-STRUCTURED-COMPLETION | provider/SHA identity resolved from GPT-authored provenance; no pHash or semantic change.`, row.id);
    row = db.prepare('SELECT * FROM image_asset WHERE id=?').get(row.id);
  }
  return { ...row, sourceSha: p.sha256 };
}

export function importHistoricalEarlyCStructured(dbPath, originalPath = join(root, 'inputs', 'p2a-gpt-historical-early-c-analysis-and-regroup-plan.json'), completionPath = join(root, 'inputs', 'p2a-gpt-historical-early-c-structured-completion-20260830.json')) {
  const original = loadJson(originalPath); const completion = loadJson(completionPath); const items = validate(original, completion);
  const db = new DatabaseSync(resolve(dbPath)); db.exec('PRAGMA foreign_keys=ON');
  const counts = { assets_covered: 0, created_observations: 0, reused_observations: 0, created_assertions: 0, reused_assertions: 0, created_sources: 0, reused_sources: 0, observations_materialized: 0, groups: [] };
  try {
    if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok' || db.prepare('PRAGMA foreign_key_check').all().length) fail('pre-write integrity failure');
    db.exec('BEGIN IMMEDIATE');
    const findObs = db.prepare('SELECT id,confidence FROM image_visual_observation WHERE image_asset_id=? AND source_content_sha256=? COLLATE NOCASE AND observation_scope=? AND assertion_class=? AND observation_type=? AND observed_value=? AND producer_type=? AND producer_id=? AND analysis_version=?');
    const insertObs = db.prepare('INSERT INTO image_visual_observation(image_asset_id,source_content_sha256,observation_scope,assertion_class,observation_type,observed_value,confidence,producer_type,producer_id,analysis_version) VALUES (?,?,?,?,?,?,?,?,?,?)');
    const findAssertion = db.prepare('SELECT * FROM design_reference_synthesis_assertion WHERE assertion_key=?');
    const insertAssertion = db.prepare('INSERT INTO design_reference_synthesis_assertion(assertion_key,design_reference_id,synthesis_scope,assertion_class,assertion_type,asserted_value,confidence,producer_type,producer_id,analysis_version,synthesis_run_key) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    const findSource = db.prepare('SELECT 1 FROM design_reference_synthesis_source WHERE synthesis_assertion_id=? AND image_visual_observation_id=?');
    const insertSource = db.prepare('INSERT INTO design_reference_synthesis_source(synthesis_assertion_id,image_visual_observation_id) VALUES (?,?)');
    for (const item of items) {
      const ref = db.prepare('SELECT id,reference_key FROM design_reference WHERE reference_key=?').get(item.refKey); if (!ref) fail(`${item.groupKey} reference ${item.refKey} missing`);
      const assets = new Map(item.group.assets.map(filename => [filename, resolveAsset(db, filename, item.provenance, item.refKey)]));
      const obsIds = [];
      for (const [index, wording] of item.group.observations.entries()) {
        const asset = assets.get(item.assignment.primary_asset); const type = `historical_group_observation_${String(index + 1).padStart(2, '0')}`; const values = [asset.id, asset.sourceSha, 'product_design', 'observation', type, wording, completion.producer_type, completion.producer_id, completion.analysis_version];
        const existing = findObs.get(...values); let id;
        if (existing) { if (existing.confidence !== 'high') fail(`${item.groupKey} existing observation confidence mismatch`); id = Number(existing.id); counts.reused_observations += 1; }
        else { id = Number(insertObs.run(...values.slice(0, 6), 'high', ...values.slice(6)).lastInsertRowid); counts.created_observations += 1; }
        obsIds.push(id);
      }
      const primary = assets.get(item.assignment.primary_asset); const inferenceValues = [primary.id, primary.sourceSha, 'product_design', 'inference', 'historical_group_design_inference', item.group.inference, completion.producer_type, completion.producer_id, completion.analysis_version];
      const existingInference = findObs.get(...inferenceValues); let inferenceId;
      if (existingInference) { if (existingInference.confidence !== 'medium') fail(`${item.groupKey} inference confidence mismatch`); inferenceId = Number(existingInference.id); counts.reused_observations += 1; }
      else { inferenceId = Number(insertObs.run(...inferenceValues.slice(0, 6), 'medium', ...inferenceValues.slice(6)).lastInsertRowid); counts.created_observations += 1; }
      obsIds.push(inferenceId);
      for (const filename of item.assignment.secondary_assets ?? []) {
        const asset = assets.get(filename); const wording = `This image is an alternate source view of the same ${item.group.working_name} design composition represented by ${item.groupKey}; it confirms the asset belongs to the same product/design reference.`; const values = [asset.id, asset.sourceSha, 'product_design', 'observation', 'alternate_view_same_reference', wording, completion.producer_type, completion.producer_id, completion.analysis_version];
        const existing = findObs.get(...values); let id;
        if (existing) { if (existing.confidence !== 'high') fail(`${item.groupKey} secondary confidence mismatch`); id = Number(existing.id); counts.reused_observations += 1; }
        else { id = Number(insertObs.run(...values.slice(0, 6), 'high', ...values.slice(6)).lastInsertRowid); counts.created_observations += 1; }
        obsIds.push(id);
      }
      const key = `${completion.batch_key}:${item.refKey}:GROUP-SYNTHESIS`; let assertion = findAssertion.get(key);
      if (assertion) { if (assertion.design_reference_id !== ref.id || assertion.asserted_value !== item.group.synthesis || assertion.confidence !== 'medium') fail(`${key} existing synthesis mismatch`); counts.reused_assertions += 1; }
      else { const id = Number(insertAssertion.run(key, ref.id, 'product_design', 'inference', 'historical_group_design_synthesis', item.group.synthesis, 'medium', completion.producer_type, completion.producer_id, completion.synthesis_analysis_version, completion.batch_key).lastInsertRowid); assertion = { id }; counts.created_assertions += 1; }
      for (const obsId of obsIds) { if (findSource.get(assertion.id, obsId)) counts.reused_sources += 1; else { insertSource.run(assertion.id, obsId); counts.created_sources += 1; } }
      counts.assets_covered += item.group.assets.length; counts.observations_materialized += obsIds.length; counts.groups.push({ group: item.groupKey, reference_key: item.refKey, observations: obsIds.length });
    }
    if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok' || db.prepare('PRAGMA foreign_key_check').all().length) fail('post-write integrity failure');
    db.exec('COMMIT'); return counts;
  } catch (error) { try { db.exec('ROLLBACK'); } catch {} throw error; } finally { db.close(); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) console.log(JSON.stringify(importHistoricalEarlyCStructured(resolve(process.argv[2] ?? join(root, 'data', 'crystal-design.sqlite'))), null, 2));
