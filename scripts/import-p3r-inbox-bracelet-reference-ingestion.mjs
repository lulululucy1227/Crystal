import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const phase = 'P3R-INBOX-BRACELET-REFERENCE-INGESTION';
const batchKey = 'P3R-INBOX-BRACELETS-20260901';
const roleMap = {
  primary_overview: 'overall', secondary_overview: 'overall', secondary_detail: 'detail',
  secondary_worn_scale: 'on_wrist', secondary_hardware_detail: 'detail'
};
const relevance = { high: 'strong', medium: 'moderate', low: 'low' };

function fail(message) { throw new Error(`${phase}: ${message}`); }
function exactText(value, name) { if (typeof value !== 'string' || !value.trim()) fail(`${name} is blank`); return value; }
function marker(groupKey) { return `${phase} | batch=${batchKey} | group=${groupKey}`; }
function parsedInput(path) {
  const input = JSON.parse(readFileSync(path, 'utf8'));
  if (input.contract_version !== 'P3R-GPT-INBOX-REFERENCE-ANALYSIS-V1') fail('wrong semantic input contract');
  if (input.batch_key !== batchKey || input.producer_type !== 'assistant_model') fail('wrong batch identity');
  if (!Array.isArray(input.assets) || input.assets.length !== 7 || !Array.isArray(input.reference_groups) || input.reference_groups.length !== 2) fail('expected exactly 7 assets and 2 reference groups');
  return input;
}

function validate(input) {
  const assets = new Map();
  for (const asset of input.assets) {
    for (const field of ['filename', 'google_drive_file_id', 'group_key', 'role', 'source_context', 'visible_source_account']) exactText(asset[field], `asset.${field}`);
    if (assets.has(asset.filename) || [...assets.values()].some(row => row.google_drive_file_id === asset.google_drive_file_id)) fail(`duplicate asset identity ${asset.filename}`);
    if (!roleMap[asset.role]) fail(`unsupported role ${asset.role}`);
    assets.set(asset.filename, asset);
  }
  const groups = new Map();
  for (const group of input.reference_groups) {
    for (const field of ['group_key', 'working_title_zh', 'working_title_en', 'primary_asset', 'design_inference', 'reference_synthesis']) exactText(group[field], `group.${field}`);
    if (groups.has(group.group_key) || !assets.has(group.primary_asset)) fail(`invalid group ${group.group_key}`);
    const names = [group.primary_asset, ...(group.secondary_assets ?? [])];
    if (new Set(names).size !== names.length || !names.every(name => assets.get(name)?.group_key === group.group_key)) fail(`group ${group.group_key} asset grouping is invalid`);
    if (assets.get(group.primary_asset).role !== 'primary_overview') fail(`group ${group.group_key} primary is not primary_overview`);
    if (!Array.isArray(group.product_design_observations) || group.product_design_observations.length === 0 || !Array.isArray(group.promotional_visual_observations) || group.promotional_visual_observations.length === 0) fail(`group ${group.group_key} observations are incomplete`);
    groups.set(group.group_key, group);
  }
  if (groups.size !== 2 || [...assets.values()].some(asset => !groups.has(asset.group_key))) fail('asset/group coverage is incomplete');
  return { assets, groups };
}

function findOrCreateReference(db, input, group, counts) {
  const note = marker(group.group_key);
  let ref = db.prepare('SELECT * FROM design_reference WHERE notes LIKE ?').get(`${note}%`);
  if (ref) { counts.references_reused += 1; return ref; }
  const sourceName = `P3R Inbox screenshot source | ${group.working_title_zh}`;
  const sourceNote = `${note} | screenshots from Google Drive Inbox; visible account/marketing wording retained as unverified source context only.`;
  let source = db.prepare('SELECT id FROM source WHERE name=? AND notes=?').get(sourceName, sourceNote);
  if (!source) source = { id: Number(db.prepare("INSERT INTO source(source_type,name,verification_status,evidence_strength,notes) VALUES ('social',?,'unverified','low',?)").run(sourceName, sourceNote).lastInsertRowid) };
  const refNote = `${note} | title_zh=${group.working_title_zh} | title_en=${group.working_title_en} | GPT semantic authority=${input.analysis_version}; no material identity or user preference is implied.`;
  const id = Number(db.prepare("INSERT INTO design_reference(reference_type,source_id,brand_or_designer,relevance_score,notes,record_status,evidence_status) VALUES ('social',?,?,?,?,'real','assistant_observed')")
    .run(source.id, group.source_marketing_context?.visible_account ?? null, 5, refNote).lastInsertRowid);
  counts.references_created += 1;
  return db.prepare('SELECT * FROM design_reference WHERE id=?').get(id);
}

function findOrCreateAsset(db, ref, asset, displayOrder, counts) {
  let row = db.prepare('SELECT * FROM image_asset WHERE provider=? AND provider_file_id=?').get('google_drive', asset.google_drive_file_id);
  if (row) {
    if (row.original_filename !== asset.filename) fail(`${asset.filename} conflicts with existing provider identity`);
    counts.assets_reused += 1;
  } else {
    const note = `${phase} | batch=${batchKey} | source_context=${asset.source_context} | visible_source_account=${asset.visible_source_account} | source bytes/SHA unavailable from the authorized local intake path.`;
    const id = Number(db.prepare("INSERT INTO image_asset(provider,provider_file_id,original_filename,asset_status,notes) VALUES ('google_drive',?,?, 'unresolved',?)")
      .run(asset.google_drive_file_id, asset.filename, note).lastInsertRowid);
    row = db.prepare('SELECT * FROM image_asset WHERE id=?').get(id); counts.assets_created += 1;
  }
  const link = db.prepare('SELECT * FROM design_reference_image WHERE image_asset_id=?').get(row.id);
  if (link && Number(link.design_reference_id) !== Number(ref.id)) fail(`${asset.filename} is linked to a different reference`);
  if (!link) {
    db.prepare('INSERT INTO design_reference_image(design_reference_id,image_asset_id,display_order,image_role,notes) VALUES (?,?,?,?,?)')
      .run(ref.id, row.id, displayOrder, roleMap[asset.role], `${phase} | role=${asset.role}`);
    counts.links_created += 1;
  } else {
    if (Number(link.display_order) !== displayOrder || link.image_role !== roleMap[asset.role]) fail(`${asset.filename} existing display metadata conflicts`);
    counts.links_reused += 1;
  }
  return row;
}

function createObservation(db, asset, scope, assertionClass, type, value, confidence, input, counts) {
  const found = db.prepare('SELECT id FROM image_visual_observation WHERE image_asset_id=? AND source_content_sha256=? COLLATE NOCASE AND observation_scope=? AND assertion_class=? AND observation_type=? AND observed_value=? AND confidence=? AND producer_type=? AND producer_id=? AND analysis_version=?')
    .get(asset.id, asset.image_hash, scope, assertionClass, type, value, confidence, input.producer_type, input.producer_id, input.analysis_version);
  if (found) { counts.observations_reused += 1; return found.id; }
  const id = Number(db.prepare('INSERT INTO image_visual_observation(image_asset_id,source_content_sha256,observation_scope,assertion_class,observation_type,observed_value,confidence,producer_type,producer_id,analysis_version,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .run(asset.id, asset.image_hash, scope, assertionClass, type, value, confidence, input.producer_type, input.producer_id, input.analysis_version, `${phase} | GPT-authoritative input; no material or preference fact.`).lastInsertRowid);
  counts.observations_created += 1; return id;
}

function materializeSemantics(db, ref, group, rows, input, counts, blockers) {
  if (rows.some(row => !row.image_hash)) {
    for (const row of rows.filter(row => !row.image_hash)) blockers.push({ filename: row.original_filename, provider_file_id: row.provider_file_id, reason: 'source_content_sha256 unavailable from the authorized local intake path; append-only image observations and synthesis provenance require a resolved SHA-256.' });
    return;
  }
  const byFilename = new Map(rows.map(row => [row.original_filename, row])); const ids = [];
  const primary = byFilename.get(group.primary_asset);
  for (const value of group.product_design_observations) ids.push(createObservation(db, primary, 'product_design', 'observation', 'product_design_observation', value, 'high', input, counts));
  ids.push(createObservation(db, primary, 'product_design', 'inference', 'design_inference', group.design_inference, 'medium', input, counts));
  for (const [filename, value] of Object.entries(group.alternate_view_observations ?? {})) ids.push(createObservation(db, byFilename.get(filename), 'product_design', 'observation', 'alternate_view_same_reference', value, 'high', input, counts));
  for (const value of group.promotional_visual_observations) ids.push(createObservation(db, primary, 'promotional_visual', 'observation', 'promotional_visual_observation', value, 'high', input, counts));
  const key = `${batchKey}:${ref.reference_key}:REFERENCE-SYNTHESIS`;
  let assertion = db.prepare('SELECT * FROM design_reference_synthesis_assertion WHERE assertion_key=?').get(key);
  if (!assertion) {
    const id = Number(db.prepare('INSERT INTO design_reference_synthesis_assertion(assertion_key,design_reference_id,synthesis_scope,assertion_class,assertion_type,asserted_value,confidence,producer_type,producer_id,analysis_version,synthesis_run_key,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(key, ref.id, 'product_design', 'inference', 'reference_synthesis', group.reference_synthesis, 'medium', input.producer_type, input.producer_id, input.analysis_version, batchKey, `${phase} | GPT-authoritative synthesis.`).lastInsertRowid);
    assertion = db.prepare('SELECT * FROM design_reference_synthesis_assertion WHERE id=?').get(id); counts.syntheses_created += 1;
  } else counts.syntheses_reused += 1;
  for (const observationId of ids) {
    if (db.prepare('SELECT 1 FROM design_reference_synthesis_source WHERE synthesis_assertion_id=? AND image_visual_observation_id=?').get(assertion.id, observationId)) counts.sources_reused += 1;
    else { db.prepare('INSERT INTO design_reference_synthesis_source(synthesis_assertion_id,image_visual_observation_id) VALUES (?,?)').run(assertion.id, observationId); counts.sources_created += 1; }
  }
}

function reconcileRelations(db, ref, group, counts) {
  for (const candidate of group.theme_candidates ?? []) {
    const row = db.prepare('SELECT id FROM design_reference_theme WHERE design_reference_id=? AND theme=?').get(ref.id, candidate.theme);
    if (!row) { db.prepare('INSERT INTO design_reference_theme(design_reference_id,theme,relevance,notes) VALUES (?,?,?,?)').run(ref.id, candidate.theme, relevance[candidate.confidence], `${phase} | GPT-authorized theme inference.`); counts.themes_created += 1; }
    else counts.themes_reused += 1;
  }
  for (const candidate of group.existing_pattern_candidates ?? []) {
    const pattern = db.prepare('SELECT id FROM design_pattern WHERE name=?').get(candidate.name);
    if (!pattern) { counts.patterns_skipped.push(candidate.name); continue; }
    const row = db.prepare('SELECT id FROM design_reference_pattern WHERE design_reference_id=? AND design_pattern_id=?').get(ref.id, pattern.id);
    if (!row) { db.prepare('INSERT INTO design_reference_pattern(design_reference_id,design_pattern_id,relevance,notes) VALUES (?,?,?,?)').run(ref.id, pattern.id, relevance[candidate.confidence], `${phase} | GPT-authorized exact canonical pattern reuse.`); counts.patterns_created += 1; }
    else counts.patterns_reused += 1;
  }
}

export function importP3rInboxBraceletReferences(dbPath, inputPath) {
  const input = parsedInput(inputPath); const { assets, groups } = validate(input);
  const db = new DatabaseSync(resolve(dbPath)); db.exec('PRAGMA foreign_keys=ON');
  const counts = { references_created: 0, references_reused: 0, assets_created: 0, assets_reused: 0, links_created: 0, links_reused: 0, observations_created: 0, observations_reused: 0, syntheses_created: 0, syntheses_reused: 0, sources_created: 0, sources_reused: 0, themes_created: 0, themes_reused: 0, patterns_created: 0, patterns_reused: 0, patterns_skipped: [], references: [], intake_blockers: [] };
  try {
    if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok' || db.prepare('PRAGMA foreign_key_check').all().length) fail('pre-existing DB integrity failure');
    db.exec('BEGIN IMMEDIATE');
    for (const group of groups.values()) {
      const ref = findOrCreateReference(db, input, group, counts);
      const ordered = [group.primary_asset, ...(group.secondary_assets ?? [])];
      const rows = ordered.map((filename, order) => findOrCreateAsset(db, ref, assets.get(filename), order, counts));
      materializeSemantics(db, ref, group, rows, input, counts, counts.intake_blockers);
      reconcileRelations(db, ref, group, counts);
      counts.references.push({ group_key: group.group_key, reference_key: ref.reference_key, assets: ordered });
    }
    if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok' || db.prepare('PRAGMA foreign_key_check').all().length) fail('post-write DB integrity failure');
    db.exec('COMMIT'); return counts;
  } catch (error) { try { db.exec('ROLLBACK'); } catch {} throw error; } finally { db.close(); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  console.log(JSON.stringify(importP3rInboxBraceletReferences(resolve(process.argv[2] ?? join(root, 'data', 'crystal-design.sqlite')), resolve(process.argv[3] ?? join(root, 'inputs', 'p3r-gpt-inbox-bracelet-analysis-20260901.json'))), null, 2));
}
