import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveHistoricalAssets } from '../scripts/resolve-p2a-historical-assets.mjs';

const root = process.cwd();
const targets = ['ASSET-000041', 'ASSET-000042', 'ASSET-000043', 'ASSET-000044', 'ASSET-000045'];

function fixture() {
  const dir = mkdtempSync(join(root, 'test', '.tmp-b01-resolution-')); const dbPath = join(dir, 'test.sqlite'); const manifestPath = join(dir, 'manifest.json');
  copyFileSync(join(root, 'data', 'crystal-design.sqlite'), dbPath); copyFileSync(join(root, 'inputs', 'p2a-historical-upgrade-b01-asset-resolution-manifest.json'), manifestPath);
  const db = new DatabaseSync(dbPath);
  const pilotRows = db.prepare('SELECT id,image_asset_id,source_content_sha256,observation_scope,assertion_class,observation_type,observed_value,confidence,producer_type,producer_id,analysis_version FROM image_visual_observation WHERE id<=45 ORDER BY id').all();
  db.exec('PRAGMA foreign_keys=OFF; DROP TRIGGER IF EXISTS trg_image_visual_observation_no_update; DROP TRIGGER IF EXISTS trg_image_visual_observation_source_sha_insert; DROP TABLE image_visual_observation;');
  db.exec(readFileSync(join(root, 'migrations', '008_p2a_visual_observation.sql'), 'utf8'));
  const insert = db.prepare('INSERT INTO image_visual_observation(id,image_asset_id,source_content_sha256,observation_scope,assertion_class,observation_type,observed_value,confidence,producer_type,producer_id,analysis_version) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
  for (const row of pilotRows) insert.run(row.id,row.image_asset_id,row.source_content_sha256,row.observation_scope,row.assertion_class,row.observation_type,row.observed_value,row.confidence,row.producer_type,row.producer_id,row.analysis_version);
  db.exec('PRAGMA foreign_keys=ON;');
  for (const key of targets) db.prepare("UPDATE image_asset SET image_hash=NULL,mime_type=NULL,width_px=NULL,height_px=NULL,byte_size=NULL,asset_status='unresolved' WHERE asset_key=?").run(key); db.close();
  return { dir, dbPath, manifestPath, close() { rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } };
}
function targetState(dbPath) { const db = new DatabaseSync(dbPath); const value = db.prepare("SELECT asset_key,image_hash,mime_type,width_px,height_px,byte_size,asset_status FROM image_asset WHERE asset_key IN ('ASSET-000041','ASSET-000042','ASSET-000043','ASSET-000044','ASSET-000045') ORDER BY asset_key").all(); db.close(); return value; }
function mutate(path, fn) { const value = JSON.parse(readFileSync(path, 'utf8')); fn(value); writeFileSync(path, JSON.stringify(value, null, 2)); }

test('B01 resolver dry-run is read-only, then applies exactly five fixed metadata identities and replays', () => {
  const f = fixture(); try {
    const before = targetState(f.dbPath); const dry = resolveHistoricalAssets(f.dbPath, f.manifestPath, undefined, { dryRun: true });
    assert.equal(dry.requested, 5); assert.deepEqual(targetState(f.dbPath), before);
    const first = resolveHistoricalAssets(f.dbPath, f.manifestPath); const replay = resolveHistoricalAssets(f.dbPath, f.manifestPath);
    assert.deepEqual([first.updated_assets, first.reused_assets, first.phash.created, first.phash.deferred], [5, 0, 0, 5]);
    assert.deepEqual([replay.updated_assets, replay.reused_assets, replay.phash.created, replay.phash.deferred], [0, 5, 0, 5]);
    const db = new DatabaseSync(f.dbPath); assert.equal(db.prepare('SELECT COUNT(*) n FROM image_visual_observation').get().n, 45); assert.equal(db.prepare('SELECT COUNT(*) n FROM design_reference_synthesis_assertion').get().n, 19); assert.equal(db.prepare('SELECT COUNT(*) n FROM design_reference_synthesis_source').get().n, 37); assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok'); assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []); db.close();
  } finally { f.close(); }
});

for (const [name, mutation, pattern] of [
  ['invalid SHA', input => { input.assets[0].sha256 = 'not-a-sha'; }, /SHA-256/],
  ['provider file identity conflict', input => { input.assets[0].provider_file_id = 'wrong'; }, /source identity/],
  ['reference linkage conflict', input => { input.assets[0].reference_key = 'REF-000018'; }, /filename\/reference mismatch/]
]) test(`B01 resolver rejects ${name} without partial updates`, () => {
  const f = fixture(); try { const before = targetState(f.dbPath); mutate(f.manifestPath, mutation); assert.throws(() => resolveHistoricalAssets(f.dbPath, f.manifestPath), pattern); assert.deepEqual(targetState(f.dbPath), before); } finally { f.close(); }
});

test('B01 resolver rejects a manifest metadata change after an exact identity has been resolved', () => {
  const f = fixture(); try {
    resolveHistoricalAssets(f.dbPath, f.manifestPath); const before = targetState(f.dbPath);
    mutate(f.manifestPath, input => { input.assets[0].width_px = 1; });
    assert.throws(() => resolveHistoricalAssets(f.dbPath, f.manifestPath), /width_px/);
    assert.deepEqual(targetState(f.dbPath), before);
  } finally { f.close(); }
});
