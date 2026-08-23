import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { initialize, validate } from '../scripts/crystal-db.mjs';

const SHA_A = 'a'.repeat(64);
const SHA_B = 'b'.repeat(64);

function withDb(fn) {
  const dir = mkdtempSync(join(process.cwd(), 'test', '.tmp-p2a-1f0-'));
  const path = join(dir, 'test.sqlite');
  try { initialize(path); fn(path); } finally { try { rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {} }
}

function insertAsset(db, providerFileId, filename, sha256 = SHA_A) {
  return Number(db.prepare('INSERT INTO image_asset(provider,provider_file_id,original_filename,image_hash) VALUES (?,?,?,?)')
    .run('google_drive', providerFileId, filename, sha256).lastInsertRowid);
}

test('007 applies on a clean database and exposes only the pHash foundation', () => withDb(path => {
  const db = new DatabaseSync(path);
  assert.ok(db.prepare("SELECT 1 FROM schema_migration WHERE version='007_p2a_perceptual_hash'").get());
  assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='image_perceptual_hash'").get());
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM pragma_table_info('image_perceptual_hash') WHERE name IN ('image_asset_id','algorithm','algorithm_version','hash_value','source_content_sha256','created_at','updated_at')").get().n, 7);
  assert.deepEqual(validate(path), []);
  db.close();
}));

test('007 upgrades an existing 001-006 database without altering existing image identity', () => {
  const dir = mkdtempSync(join(process.cwd(), 'test', '.tmp-p2a-1f0-upgrade-'));
  const path = join(dir, 'existing.sqlite');
  try {
    const db = new DatabaseSync(path);
    for (const file of ['001_initial.sql','002_p1a_staging.sql','003_p1a_field_audit.sql','004_p1c_reference_relationships.sql','005_p1c_design_principle.sql','006_p1c_image_assets.sql']) db.exec(readFileSync(join(process.cwd(), 'migrations', file), 'utf8'));
    for (const version of ['001_initial','002_p1a_staging','003_p1a_field_audit','004_p1c_reference_relationships','005_p1c_design_principle','006_p1c_image_assets']) db.prepare('INSERT INTO schema_migration(version) VALUES (?)').run(version);
    const assetId = insertAsset(db, 'pre-007-file', 'before.png', SHA_A);
    const before = db.prepare('SELECT asset_key,provider,provider_file_id,original_filename,image_hash FROM image_asset WHERE id=?').get(assetId);
    db.close();

    initialize(path);
    const upgraded = new DatabaseSync(path);
    assert.ok(upgraded.prepare("SELECT 1 FROM schema_migration WHERE version='007_p2a_perceptual_hash'").get());
    assert.deepEqual(upgraded.prepare('SELECT asset_key,provider,provider_file_id,original_filename,image_hash FROM image_asset WHERE id=?').get(assetId), before);
    assert.equal(upgraded.prepare('SELECT COUNT(*) AS n FROM image_perceptual_hash').get().n, 0);
    upgraded.close();
  } finally { try { rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {} }
});

test('pHash rows are content-bound, idempotent, and candidate-only', () => withDb(path => {
  const db = new DatabaseSync(path);
  const first = insertAsset(db, 'asset-a', 'a.png', SHA_A);
  const second = insertAsset(db, 'asset-b', 'b.png', SHA_B);
  const reference = db.prepare('SELECT id FROM design_reference ORDER BY id LIMIT 1').get().id;
  db.prepare("INSERT INTO design_reference_image(design_reference_id,image_asset_id,display_order,image_role) VALUES (?,? ,?,'unknown')").run(reference, first, 900);
  const beforeReferenceLinks = db.prepare('SELECT COUNT(*) AS n FROM design_reference_image').get().n;
  const firstAssetIdentity = db.prepare('SELECT asset_key,provider,provider_file_id,image_hash FROM image_asset WHERE id=?').get(first);

  db.prepare('INSERT INTO image_perceptual_hash(image_asset_id,algorithm,algorithm_version,hash_value,source_content_sha256) VALUES (?,?,?,?,?)')
    .run(first, 'phash', 'imagehash-4.3.2-hashsize-8', 'ff00aa55ff00aa55', SHA_A);
  assert.throws(() => db.prepare('INSERT INTO image_perceptual_hash(image_asset_id,algorithm,algorithm_version,hash_value,source_content_sha256) VALUES (?,?,?,?,?)')
    .run(first, 'phash', 'imagehash-4.3.2-hashsize-8', 'ff00aa55ff00aa55', SHA_A));
  assert.doesNotThrow(() => db.prepare('INSERT INTO image_perceptual_hash(image_asset_id,algorithm,algorithm_version,hash_value,source_content_sha256) VALUES (?,?,?,?,?)')
    .run(second, 'phash', 'imagehash-4.3.2-hashsize-8', 'ff00aa55ff00aa55', SHA_B));
  assert.throws(() => db.prepare('INSERT INTO image_perceptual_hash(image_asset_id,algorithm,algorithm_version,hash_value,source_content_sha256) VALUES (?,?,?,?,?)')
    .run(second, 'dhash', 'imagehash-4.3.2-hashsize-8', 'ff00aa55ff00aa55', SHA_B));
  assert.throws(() => db.prepare('INSERT INTO image_perceptual_hash(image_asset_id,algorithm,algorithm_version,hash_value,source_content_sha256) VALUES (?,?,?,?,?)')
    .run(second, 'phash', 'imagehash-4.3.2-hashsize-8', '0011', 'not-a-sha'));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM image_perceptual_hash WHERE hash_value=?').get('ff00aa55ff00aa55').n, 2);
  assert.deepEqual(db.prepare('SELECT asset_key,provider,provider_file_id,image_hash FROM image_asset WHERE id=?').get(first), firstAssetIdentity);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM design_reference_image').get().n, beforeReferenceLinks);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM image_asset_duplicate_candidate').get().n, 0);
  assert.deepEqual(validate(path), []);
  db.close();
}));
