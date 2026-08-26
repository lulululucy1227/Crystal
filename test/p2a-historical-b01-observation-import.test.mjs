import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { importVisualObservations } from '../scripts/import-p2a-2r-visual-observations.mjs';

const root = process.cwd();
const inputSource = join(root, 'inputs', 'p2a-historical-upgrade-b01-vision-observations.json');
const migration = readFileSync(join(root, 'migrations', '008_p2a_visual_observation.sql'), 'utf8');

function fixture() {
  const dir = mkdtempSync(join(root, 'test', '.tmp-b01-observation-')); const dbPath = join(dir, 'test.sqlite'); const inputPath = join(dir, 'input.json');
  copyFileSync(join(root, 'data', 'crystal-design.sqlite'), dbPath); copyFileSync(inputSource, inputPath);
  const db = new DatabaseSync(dbPath); const pilot = db.prepare('SELECT id,image_asset_id,source_content_sha256,observation_scope,assertion_class,observation_type,observed_value,confidence,producer_type,producer_id,analysis_version FROM image_visual_observation WHERE id<=45 ORDER BY id').all();
  db.exec('PRAGMA foreign_keys=OFF; DROP TRIGGER IF EXISTS trg_image_visual_observation_no_update; DROP TRIGGER IF EXISTS trg_image_visual_observation_source_sha_insert; DROP TABLE image_visual_observation;'); db.exec(migration);
  const insert = db.prepare('INSERT INTO image_visual_observation(id,image_asset_id,source_content_sha256,observation_scope,assertion_class,observation_type,observed_value,confidence,producer_type,producer_id,analysis_version) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
  for (const row of pilot) insert.run(row.id,row.image_asset_id,row.source_content_sha256,row.observation_scope,row.assertion_class,row.observation_type,row.observed_value,row.confidence,row.producer_type,row.producer_id,row.analysis_version);
  db.exec('PRAGMA foreign_keys=ON');
  db.close(); return { dir, dbPath, inputPath, input: JSON.parse(readFileSync(inputPath, 'utf8')), close() { rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } };
}
function mutate(f, fn) { const input = structuredClone(f.input); fn(input); writeFileSync(f.inputPath, JSON.stringify(input)); }
function b01Count(path) { const db = new DatabaseSync(path); const n = Number(db.prepare("SELECT COUNT(*) n FROM image_visual_observation o JOIN image_asset a ON a.id=o.image_asset_id WHERE a.asset_key BETWEEN 'ASSET-000041' AND 'ASSET-000045'").get().n); db.close(); return n; }

test('B01 imports the fixed 22 rows once and then exactly reuses them', () => {
  const f = fixture(); try {
    const first = importVisualObservations(f.dbPath, f.inputPath); const replay = importVisualObservations(f.dbPath, f.inputPath);
    assert.deepEqual([first.input_assets, first.input_observations, first.created, first.reused], [5, 22, 22, 0]);
    assert.deepEqual([first.assertion_counts.observation, first.assertion_counts.inference, first.scope_counts.product_design, first.scope_counts.promotional_visual], [60, 7, 52, 15]);
    assert.deepEqual([replay.created, replay.reused], [0, 22]); assert.equal(b01Count(f.dbPath), 22);
    const db = new DatabaseSync(f.dbPath); assert.equal(db.prepare('SELECT COUNT(*) n FROM image_visual_observation').get().n, 67); assert.equal(db.prepare('SELECT COUNT(*) n FROM design_reference_synthesis_assertion').get().n, 19); assert.equal(db.prepare('SELECT COUNT(*) n FROM design_reference_synthesis_source').get().n, 37); db.close();
  } finally { f.close(); }
});

for (const [name, mutation, pattern] of [
  ['wrong phase', x => { x.phase = 'P2A-OTHER'; }, /phase is not an authorized/],
  ['wrong asset set', x => { x.assets[0].asset_key = 'ASSET-000046'; }, /exact B01 asset\/reference set/],
  ['SHA mismatch', x => { x.assets[0].source_content_sha256 = 'f'.repeat(64); }, /SHA mismatch|source identity/],
  ['reference mismatch', x => { x.assets[0].reference_key = 'REF-000018'; }, /exact B01 asset\/reference set/],
  ['invalid enum', x => { x.assets[0].observations[0].confidence = 'certain'; }, /invalid confidence/],
  ['blank semantic field', x => { x.assets[0].observations[0].observed_value = ' '; }, /invalid observed_value/]
]) test(`B01 rejects ${name} before writes`, () => {
  const f = fixture(); try { mutate(f, mutation); assert.throws(() => importVisualObservations(f.dbPath, f.inputPath), pattern); assert.equal(b01Count(f.dbPath), 0); } finally { f.close(); }
});
