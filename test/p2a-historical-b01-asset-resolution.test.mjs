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
  const db = new DatabaseSync(dbPath); for (const key of targets) db.prepare("UPDATE image_asset SET image_hash=NULL,mime_type=NULL,width_px=NULL,height_px=NULL,byte_size=NULL,asset_status='unresolved' WHERE asset_key=?").run(key); db.close();
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
