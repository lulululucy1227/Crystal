import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { initialize } from '../scripts/crystal-db.mjs';
import { importVisualObservations } from '../scripts/import-p2a-2r-visual-observations.mjs';

const sourceInput = resolve('inputs/p2a-2r-vision-observations.json');

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'crystal-p2a-2r-'));
  const dbPath = join(dir, 'test.sqlite'); const inputPath = join(dir, 'input.json');
  initialize(dbPath);
  const input = JSON.parse(readFileSync(sourceInput, 'utf8'));
  const db = new DatabaseSync(dbPath); db.exec('PRAGMA foreign_keys=ON');
  const references = new Map();
  for (const [i, asset] of input.assets.entries()) {
    let reference = references.get(asset.reference_key);
    if (!reference) {
      const source = Number(db.prepare("INSERT INTO source(source_type,name,verification_status,evidence_strength) VALUES ('user_upload',?,'unverified','low')").run(`source-${asset.reference_key}`).lastInsertRowid);
      reference = Number(db.prepare("INSERT INTO design_reference(reference_key,reference_type,source_id) VALUES (?,'uploaded_image',?)").run(asset.reference_key, source).lastInsertRowid);
      references.set(asset.reference_key, reference);
    }
    const image = Number(db.prepare("INSERT INTO image_asset(asset_key,provider,provider_file_id,original_filename,image_hash) VALUES (?,'google_drive',?,?,?)").run(asset.asset_key, asset.provider_file_id, asset.filename, asset.source_content_sha256).lastInsertRowid);
    db.prepare("INSERT INTO design_reference_image(design_reference_id,image_asset_id,display_order,image_role) VALUES (?,?,?,'unknown')").run(reference, image, i);
  }
  db.close(); writeFileSync(inputPath, JSON.stringify(input));
  return { dir, dbPath, inputPath, input, close() { try { rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {} } };
}

function snapshot(dbPath) {
  const db = new DatabaseSync(dbPath);
  const ignored = new Set(['image_visual_observation', 'schema_migration', 'sqlite_sequence']);
  const result = {};
  for (const { name } of db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()) if (!ignored.has(name)) result[name] = db.prepare(`SELECT COUNT(*) n FROM ${name}`).get().n;
  db.close(); return result;
}

function mutateInput(f, mutate) { const copy = structuredClone(f.input); mutate(copy); writeFileSync(f.inputPath, JSON.stringify(copy)); }

test('approved 10-asset manifest imports once, then fully reuses without semantic side effects', () => {
  const f = fixture(); try {
    const before = snapshot(f.dbPath);
    const first = importVisualObservations(f.dbPath, f.inputPath);
    assert.deepEqual(first, { migrated: false, input_assets: 10, input_observations: 45, created: 45, reused: 0, assertion_counts: { inference: 5, observation: 40 }, scope_counts: { product_design: 35, promotional_visual: 10 } });
    assert.deepEqual(snapshot(f.dbPath), before);
    const second = importVisualObservations(f.dbPath, f.inputPath);
    assert.equal(second.created, 0); assert.equal(second.reused, 45);
    const db = new DatabaseSync(f.dbPath);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM image_visual_observation WHERE assertion_class NOT IN ('observation','inference')").get().n, 0);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM image_visual_observation WHERE producer_type<>'assistant_model' OR producer_id<>'gpt-5.6-sol' OR analysis_version<>'p2a-vision-v1'").get().n, 0);
    db.close();
  } finally { f.close(); }
});

for (const [name, mutation, pattern] of [
  ['unknown asset', x => { x.assets[0].asset_key = 'ASSET-UNKNOWN'; }, /ASSET-UNKNOWN resolved 0 times/],
  ['SHA mismatch', x => { x.assets[0].source_content_sha256 = 'f'.repeat(64); }, /SHA mismatch/],
  ['reference mismatch', x => { x.assets[0].reference_key = 'REF-WRONG'; }, /reference mismatch/],
  ['invalid scope', x => { x.assets[0].observations[0].observation_scope = 'reference'; }, /invalid observation_scope/],
  ['invalid class', x => { x.assets[0].observations[0].assertion_class = 'confirmed_fact'; }, /invalid assertion_class/],
  ['invalid confidence', x => { x.assets[0].observations[0].confidence = 'certain'; }, /invalid confidence/],
  ['invalid producer metadata', x => { x.producer_id = 'other-model'; }, /producer_id must be exactly/]
]) test(`${name} fails before observation writes`, () => {
  const f = fixture(); try { mutateInput(f, mutation); assert.throws(() => importVisualObservations(f.dbPath, f.inputPath), pattern); const db = new DatabaseSync(f.dbPath); assert.equal(db.prepare('SELECT COUNT(*) n FROM image_visual_observation').get().n, 0); db.close(); } finally { f.close(); }
});

test('applies only existing migration 008 when canonical DB lacks it', () => {
  const f = fixture(); try {
    const db = new DatabaseSync(f.dbPath); db.exec("DROP TRIGGER trg_image_visual_observation_no_update; DROP TRIGGER trg_image_visual_observation_source_sha_insert; DROP TABLE image_visual_observation; DELETE FROM schema_migration WHERE version='008_p2a_visual_observation'"); db.close();
    const result = importVisualObservations(f.dbPath, f.inputPath);
    assert.equal(result.migrated, true); assert.equal(result.created, 45);
  } finally { f.close(); }
});
