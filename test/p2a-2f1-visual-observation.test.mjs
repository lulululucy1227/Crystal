import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { initialize, validate } from '../scripts/crystal-db.mjs';

const SHA_A = 'a'.repeat(64);
const SHA_B = 'b'.repeat(64);

function withDb(fn) {
  const dir = mkdtempSync(join(process.cwd(), 'test', '.tmp-p2a-2f1-'));
  const path = join(dir, 'test.sqlite');
  try { initialize(path); fn(path); } finally { try { rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {} }
}

function insertAsset(db, providerFileId, filename, imageHash = SHA_A) {
  return Number(db.prepare('INSERT INTO image_asset(provider,provider_file_id,original_filename,image_hash) VALUES (?,?,?,?)')
    .run('local', providerFileId, filename, imageHash).lastInsertRowid);
}

function insertObservation(db, assetId, overrides = {}) {
  const values = {
    source_content_sha256: SHA_A,
    observation_scope: 'product_design',
    assertion_class: 'observation',
    observation_type: 'bead_shape',
    observed_value: 'round',
    confidence: 'high',
    producer_type: 'assistant_model',
    producer_id: 'test-model',
    analysis_version: 'p2a-test-v1',
    supersedes_observation_id: null,
    notes: null,
    ...overrides
  };
  return Number(db.prepare(`INSERT INTO image_visual_observation
    (image_asset_id,source_content_sha256,observation_scope,assertion_class,observation_type,observed_value,confidence,producer_type,producer_id,analysis_version,supersedes_observation_id,notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(assetId, values.source_content_sha256, values.observation_scope, values.assertion_class, values.observation_type, values.observed_value, values.confidence, values.producer_type, values.producer_id, values.analysis_version, values.supersedes_observation_id, values.notes).lastInsertRowid);
}

test('008 creates the minimal image visual observation foundation', () => withDb(path => {
  const db = new DatabaseSync(path);
  assert.ok(db.prepare("SELECT 1 FROM schema_migration WHERE version='008_p2a_visual_observation'").get());
  assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='image_visual_observation'").get());
  assert.deepEqual(validate(path), []);
  db.close();
}));

test('valid observation, inference, scopes and exact SHA binding are supported', () => withDb(path => {
  const db = new DatabaseSync(path);
  const asset = insertAsset(db, 'visual-a', 'a.png');
  const observation = insertObservation(db, asset);
  assert.equal(db.prepare('SELECT assertion_class,observation_scope FROM image_visual_observation WHERE id=?').get(observation).assertion_class, 'observation');
  insertObservation(db, asset, { assertion_class: 'inference', observation_type: 'material_appearance', observed_value: 'may be blue mineral' });
  insertObservation(db, asset, { observation_scope: 'promotional_visual', observation_type: 'lighting', observed_value: 'soft side light' });
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM image_visual_observation').get().n, 3);
  assert.throws(() => insertObservation(db, asset, { assertion_class: 'confirmed_fact' }), /CHECK constraint failed/);
  db.close();
}));

test('NULL or mismatched asset SHA blocks insert and update', () => withDb(path => {
  const db = new DatabaseSync(path);
  const unresolved = insertAsset(db, 'visual-null', 'null.png', null);
  assert.throws(() => insertObservation(db, unresolved), /requires a resolved/);
  const asset = insertAsset(db, 'visual-sha', 'sha.png', SHA_A);
  assert.throws(() => insertObservation(db, asset, { source_content_sha256: SHA_B }), /does not match/);
  const row = insertObservation(db, asset);
  assert.throws(() => db.prepare('UPDATE image_visual_observation SET source_content_sha256=? WHERE id=?').run(SHA_B, row), /does not match/);
  assert.throws(() => db.prepare('UPDATE image_visual_observation SET notes=? WHERE id=?').run('overwrite', row), /append-only/);
  db.close();
}));

test('idempotency, cross-content/version coexistence and append-only correction work', () => withDb(path => {
  const db = new DatabaseSync(path);
  const assetA = insertAsset(db, 'visual-idem-a', 'a.png', SHA_A);
  const assetB = insertAsset(db, 'visual-idem-b', 'b.png', SHA_B);
  const first = insertObservation(db, assetA);
  assert.throws(() => insertObservation(db, assetA), /UNIQUE constraint failed/);
  assert.doesNotThrow(() => insertObservation(db, assetB, { source_content_sha256: SHA_B }));
  assert.doesNotThrow(() => insertObservation(db, assetA, { analysis_version: 'p2a-test-v2' }));
  const correction = insertObservation(db, assetA, { observed_value: 'oval', producer_type: 'human', producer_id: 'reviewer-1', supersedes_observation_id: first });
  assert.equal(db.prepare('SELECT supersedes_observation_id FROM image_visual_observation WHERE id=?').get(correction).supersedes_observation_id, first);
  const oldB = insertObservation(db, assetB, { source_content_sha256: SHA_B, observation_type: 'other', observed_value: 'b' });
  assert.throws(() => insertObservation(db, assetA, { observation_type: 'cross', observed_value: 'cross', supersedes_observation_id: oldB }), /same asset/);
  assert.throws(() => db.prepare(`INSERT INTO image_visual_observation (id,image_asset_id,source_content_sha256,observation_scope,assertion_class,observation_type,observed_value,confidence,producer_type,producer_id,analysis_version,supersedes_observation_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(999, assetA, SHA_A, 'product_design', 'observation', 'self', 'self', 'low', 'human', 'reviewer-2', 'p2a-test-v3', 999), /cannot supersede itself/);
  db.close();
}));

test('existing image/reference/material/market/supplier semantics remain unchanged', () => withDb(path => {
  const db = new DatabaseSync(path);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM design_reference').get().n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM material').get().n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM market_evidence').get().n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM supplier').get().n, 1);
  assert.deepEqual(validate(path), []);
  db.close();
}));
