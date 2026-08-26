import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { importVisualObservations } from '../scripts/import-p2a-2r-visual-observations.mjs';

const root = process.cwd();
const inputSource = join(root, 'inputs', 'p2a-new-reference-cretaceous-coast-fragments-image-observations.json');
const migration = readFileSync(join(root, 'migrations', '008_p2a_visual_observation.sql'), 'utf8');
const keys = ['ASSET-000067', 'ASSET-000068', 'ASSET-000069'];

function fixture() {
  const dir = mkdtempSync(join(root, 'test', '.tmp-coast-observation-')); const dbPath = join(dir, 'test.sqlite'); const inputPath = join(dir, 'input.json');
  copyFileSync(join(root, 'data', 'crystal-design.sqlite'), dbPath); copyFileSync(inputSource, inputPath);
  const db = new DatabaseSync(dbPath); const prior = db.prepare('SELECT id,image_asset_id,source_content_sha256,observation_scope,assertion_class,observation_type,observed_value,confidence,producer_type,producer_id,analysis_version FROM image_visual_observation WHERE id<=67 ORDER BY id').all();
  db.exec('PRAGMA foreign_keys=OFF; DROP TRIGGER IF EXISTS trg_image_visual_observation_no_update; DROP TRIGGER IF EXISTS trg_image_visual_observation_source_sha_insert; DROP TABLE image_visual_observation;'); db.exec(migration);
  const insert = db.prepare('INSERT INTO image_visual_observation(id,image_asset_id,source_content_sha256,observation_scope,assertion_class,observation_type,observed_value,confidence,producer_type,producer_id,analysis_version) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
  for (const row of prior) insert.run(row.id,row.image_asset_id,row.source_content_sha256,row.observation_scope,row.assertion_class,row.observation_type,row.observed_value,row.confidence,row.producer_type,row.producer_id,row.analysis_version);
  db.exec('PRAGMA foreign_keys=ON'); db.close(); return { dir, dbPath, inputPath, close() { rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } };
}
function mutate(path, fn) { const input = JSON.parse(readFileSync(path, 'utf8')); fn(input); writeFileSync(path, JSON.stringify(input)); }
function batch(path) { const db = new DatabaseSync(path); const rows = db.prepare(`SELECT o.assertion_class,o.observation_scope,COUNT(*) n FROM image_visual_observation o JOIN image_asset a ON a.id=o.image_asset_id WHERE a.asset_key IN (${keys.map(() => '?').join(',')}) GROUP BY o.assertion_class,o.observation_scope ORDER BY o.assertion_class,o.observation_scope`).all(...keys).map(row => ({ ...row })); const total = Number(db.prepare('SELECT COUNT(*) n FROM image_visual_observation').get().n); db.close(); return { rows, total }; }

test('Coast observations import exact 13 rows and fully replay', () => {
  const f = fixture(); try {
    const first = importVisualObservations(f.dbPath, f.inputPath); const replay = importVisualObservations(f.dbPath, f.inputPath);
    assert.deepEqual([first.input_assets, first.input_observations, first.created, first.reused], [3, 13, 13, 0]); assert.deepEqual([replay.created, replay.reused], [0, 13]);
    assert.deepEqual(batch(f.dbPath), { total: 80, rows: [{ assertion_class: 'inference', observation_scope: 'product_design', n: 2 }, { assertion_class: 'observation', observation_scope: 'product_design', n: 8 }, { assertion_class: 'observation', observation_scope: 'promotional_visual', n: 3 }] });
    const db = new DatabaseSync(f.dbPath); assert.equal(db.prepare('SELECT COUNT(*) n FROM design_reference_synthesis_assertion').get().n, 19); assert.equal(db.prepare('SELECT COUNT(*) n FROM design_reference_synthesis_source').get().n, 37); db.close();
  } finally { f.close(); }
});
for (const [name, change, pattern] of [
  ['wrong phase', input => { input.phase = 'wrong'; }, /phase is not an authorized/],
  ['wrong asset set', input => { input.assets[0].asset_key = 'ASSET-000070'; }, /exact coast asset\/reference set/],
  ['SHA mismatch', input => { input.assets[0].source_content_sha256 = 'f'.repeat(64); }, /SHA mismatch/],
  ['reference mismatch', input => { input.assets[0].reference_key = 'REF-000025'; }, /exact coast asset\/reference set/],
  ['invalid enum', input => { input.assets[0].observations[0].confidence = 'certain'; }, /invalid confidence/],
  ['blank semantic field', input => { input.assets[0].observations[0].observed_value = ' '; }, /invalid observed_value/]
]) test(`Coast observations reject ${name} before writes`, () => {
  const f = fixture(); try { mutate(f.inputPath, change); assert.throws(() => importVisualObservations(f.dbPath, f.inputPath), pattern); assert.deepEqual(batch(f.dbPath), { total: 67, rows: [] }); } finally { f.close(); }
});
