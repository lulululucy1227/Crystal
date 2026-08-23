import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED = {
  protocol_version: 'AGENT-HANDOFF-V1', phase: 'P2A-2R',
  producer_type: 'assistant_model', producer_id: 'gpt-5.6-sol', analysis_version: 'p2a-vision-v1'
};
const allowed = {
  observation_scope: new Set(['product_design', 'promotional_visual']),
  assertion_class: new Set(['observation', 'inference']),
  confidence: new Set(['low', 'medium', 'high'])
};

function fail(message) { throw new Error(`P2A-2R preflight failed: ${message}`); }

function validateInput(input) {
  for (const [field, expected] of Object.entries(EXPECTED)) if (input[field] !== expected) fail(`${field} must be exactly ${JSON.stringify(expected)}; received ${JSON.stringify(input[field])}`);
  if (!Array.isArray(input.assets) || input.assets.length !== 10) fail(`expected exactly 10 assets; received ${input.assets?.length ?? 'non-array'}`);
  const keys = new Set();
  let rowCount = 0;
  for (const [assetIndex, asset] of input.assets.entries()) {
    if (!asset || typeof asset !== 'object') fail(`asset ${assetIndex} is not an object`);
    for (const field of ['asset_key', 'reference_key', 'source_content_sha256']) if (typeof asset[field] !== 'string' || !asset[field].trim()) fail(`asset ${assetIndex} has invalid ${field}`);
    if (keys.has(asset.asset_key)) fail(`duplicate asset_key ${asset.asset_key}`);
    keys.add(asset.asset_key);
    if (!/^[0-9a-fA-F]{64}$/.test(asset.source_content_sha256)) fail(`${asset.asset_key} has invalid source_content_sha256`);
    if (!Array.isArray(asset.observations) || asset.observations.length === 0) fail(`${asset.asset_key} has no observations`);
    for (const [rowIndex, row] of asset.observations.entries()) {
      const label = `${asset.asset_key} observation ${rowIndex}`;
      for (const field of Object.keys(allowed)) if (!allowed[field].has(row?.[field])) fail(`${label} has invalid ${field}: ${JSON.stringify(row?.[field])}`);
      for (const field of ['observation_type', 'observed_value']) if (typeof row?.[field] !== 'string' || !row[field].trim()) fail(`${label} has invalid ${field}`);
      rowCount += 1;
    }
  }
  return rowCount;
}

function ensureMigration008(db) {
  const applied = db.prepare("SELECT 1 FROM schema_migration WHERE version='008_p2a_visual_observation'").get();
  if (applied) return false;
  db.exec(readFileSync(join(root, 'migrations', '008_p2a_visual_observation.sql'), 'utf8'));
  db.prepare('INSERT INTO schema_migration(version) VALUES (?)').run('008_p2a_visual_observation');
  return true;
}

export function importVisualObservations(dbPath, inputPath) {
  const input = JSON.parse(readFileSync(inputPath, 'utf8'));
  const rowCount = validateInput(input);
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON');
  let migrated = false;
  try {
    migrated = ensureMigration008(db);
    db.exec('BEGIN IMMEDIATE');
    const resolved = new Map();
    for (const asset of input.assets) {
      const matches = db.prepare('SELECT id,image_hash FROM image_asset WHERE asset_key=?').all(asset.asset_key);
      if (matches.length !== 1) fail(`${asset.asset_key} resolved ${matches.length} times; expected exactly once`);
      const match = matches[0];
      if (String(match.image_hash ?? '').toLowerCase() !== asset.source_content_sha256.toLowerCase()) fail(`${asset.asset_key} SHA mismatch: DB=${JSON.stringify(match.image_hash)} input=${JSON.stringify(asset.source_content_sha256)}`);
      const links = db.prepare(`SELECT d.reference_key FROM design_reference_image dri JOIN design_reference d ON d.id=dri.design_reference_id WHERE dri.image_asset_id=? AND d.reference_key=?`).all(match.id, asset.reference_key);
      if (links.length !== 1) fail(`${asset.asset_key} reference mismatch: expected exactly one linkage to ${asset.reference_key}; found ${links.length}`);
      resolved.set(asset.asset_key, match);
    }

    const findExisting = db.prepare(`SELECT id,confidence FROM image_visual_observation WHERE image_asset_id=? AND source_content_sha256=? COLLATE NOCASE AND observation_scope=? AND assertion_class=? AND observation_type=? AND observed_value=? AND producer_type=? AND producer_id=? AND analysis_version=?`);
    const insert = db.prepare(`INSERT INTO image_visual_observation (image_asset_id,source_content_sha256,observation_scope,assertion_class,observation_type,observed_value,confidence,producer_type,producer_id,analysis_version) VALUES (?,?,?,?,?,?,?,?,?,?)`);
    let created = 0; let reused = 0;
    for (const asset of input.assets) for (const row of asset.observations) {
      const values = [resolved.get(asset.asset_key).id, asset.source_content_sha256, row.observation_scope, row.assertion_class, row.observation_type, row.observed_value, input.producer_type, input.producer_id, input.analysis_version];
      const existing = findExisting.get(...values);
      if (existing) {
        if (existing.confidence !== row.confidence) fail(`${asset.asset_key} existing row ${existing.id} has confidence ${existing.confidence}, input has ${row.confidence}`);
        reused += 1;
      } else { insert.run(...values.slice(0, 6), row.confidence, ...values.slice(6)); created += 1; }
    }
    db.exec('COMMIT');
    const counts = Object.fromEntries(db.prepare(`SELECT assertion_class AS key,COUNT(*) AS n FROM image_visual_observation WHERE producer_type=? AND producer_id=? AND analysis_version=? GROUP BY assertion_class`).all(input.producer_type, input.producer_id, input.analysis_version).map(x => [x.key, x.n]));
    const scopes = Object.fromEntries(db.prepare(`SELECT observation_scope AS key,COUNT(*) AS n FROM image_visual_observation WHERE producer_type=? AND producer_id=? AND analysis_version=? GROUP BY observation_scope`).all(input.producer_type, input.producer_id, input.analysis_version).map(x => [x.key, x.n]));
    return { migrated, input_assets: input.assets.length, input_observations: rowCount, created, reused, assertion_counts: counts, scope_counts: scopes };
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch {}
    throw error;
  } finally { db.close(); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const dbPath = resolve(process.argv[2] ?? join(root, 'data', 'crystal-design.sqlite'));
  const inputPath = resolve(process.argv[3] ?? join(root, 'inputs', 'p2a-2r-vision-observations.json'));
  console.log(JSON.stringify(importVisualObservations(dbPath, inputPath), null, 2));
}
