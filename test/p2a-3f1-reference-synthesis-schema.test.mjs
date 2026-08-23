import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { initialize } from '../scripts/crystal-db.mjs';

const root = process.cwd();
const migration = readFileSync(join(root, 'migrations', '009_p2a_reference_synthesis.sql'), 'utf8');
const legacyTables = ['design_reference_observation', 'design_assessment', 'visual_communication_reference'];

function withDb(fn) {
  const dir = mkdtempSync(join(root, 'test', '.tmp-p2a-3f1-'));
  const path = join(dir, 'test.sqlite');
  try { initialize(path); fn(path); } finally { try { rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {} }
}

function open(path) {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON');
  return db;
}

function fixture(db) {
  const source = Number(db.prepare("INSERT INTO source(source_type,name) VALUES ('internal_note',?)").run(`s-${Date.now()}-${Math.random()}`).lastInsertRowid);
  const ref = Number(db.prepare("INSERT INTO design_reference(reference_type,source_id) VALUES ('uploaded_image',?)").run(source).lastInsertRowid);
  const otherRef = Number(db.prepare("INSERT INTO design_reference(reference_type,source_id) VALUES ('uploaded_image',?)").run(source).lastInsertRowid);
  const asset = Number(db.prepare("INSERT INTO image_asset(provider,provider_file_id,original_filename,image_hash) VALUES ('local',?,?,?)").run(`a-${Date.now()}-${Math.random()}`, 'a.png', 'a'.repeat(64)).lastInsertRowid);
  const otherAsset = Number(db.prepare("INSERT INTO image_asset(provider,provider_file_id,original_filename,image_hash) VALUES ('local',?,?,?)").run(`b-${Date.now()}-${Math.random()}`, 'b.png', 'b'.repeat(64)).lastInsertRowid);
  db.prepare("INSERT INTO design_reference_image(design_reference_id,image_asset_id,display_order) VALUES (?,?,0)").run(ref, asset);
  db.prepare("INSERT INTO design_reference_image(design_reference_id,image_asset_id,display_order) VALUES (?,?,0)").run(otherRef, otherAsset);
  const observation = Number(db.prepare(`INSERT INTO image_visual_observation
    (image_asset_id,source_content_sha256,observation_scope,assertion_class,observation_type,observed_value,confidence,producer_type,producer_id,analysis_version)
    VALUES (?,'${'a'.repeat(64)}','product_design','observation','shape','round','high','assistant_model','fixture','v1')`).run(asset).lastInsertRowid);
  const otherObservation = Number(db.prepare(`INSERT INTO image_visual_observation
    (image_asset_id,source_content_sha256,observation_scope,assertion_class,observation_type,observed_value,confidence,producer_type,producer_id,analysis_version)
    VALUES (?,'${'b'.repeat(64)}','product_design','observation','shape','oval','high','assistant_model','fixture','v1')`).run(otherAsset).lastInsertRowid);
  return { ref, otherRef, observation, otherObservation };
}

function insertAssertion(db, ref, key, overrides = {}) {
  const value = { scope: 'product_design', klass: 'observation', type: 'shape', asserted: 'round', confidence: 'high', producerType: 'assistant_model', producerId: 'test-model', version: 'synth-v1', run: 'run-1', supersedes: null, ...overrides };
  return Number(db.prepare(`INSERT INTO design_reference_synthesis_assertion
    (assertion_key,design_reference_id,synthesis_scope,assertion_class,assertion_type,asserted_value,confidence,producer_type,producer_id,analysis_version,synthesis_run_key,supersedes_assertion_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(key, ref, value.scope, value.klass, value.type, value.asserted, value.confidence, value.producerType, value.producerId, value.version, value.run, value.supersedes).lastInsertRowid);
}

test('009 applies after baseline and leaves legacy semantic tables structurally and row-wise unchanged', () => {
  const dir = mkdtempSync(join(root, 'test', '.tmp-p2a-3f1-copy-'));
  const path = join(dir, 'copy.sqlite');
  try {
    copyFileSync(join(root, 'data', 'crystal-design.sqlite'), path);
    const db = open(path);
    const before = legacyTables.map(name => ({ name, sql: db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(name).sql, rows: db.prepare(`SELECT * FROM ${name} ORDER BY id`).all() }));
    db.exec(migration);
    db.prepare("INSERT OR IGNORE INTO schema_migration(version) VALUES ('009_p2a_reference_synthesis')").run();
    for (const snapshot of before) {
      assert.equal(db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(snapshot.name).sql, snapshot.sql);
      assert.deepEqual(db.prepare(`SELECT * FROM ${snapshot.name} ORDER BY id`).all(), snapshot.rows);
    }
    assert.ok(db.prepare("SELECT 1 FROM schema_migration WHERE version='009_p2a_reference_synthesis'").get());
    assert.equal(db.prepare('SELECT COUNT(*) n FROM design_reference_synthesis_assertion').get().n, 0);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM design_reference_synthesis_source').get().n, 0);
    db.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('assertion constraints, replay identity, lineage, and append-only history are enforced', () => withDb(path => {
  const db = open(path); const f = fixture(db);
  const first = insertAssertion(db, f.ref, 'assertion-1');
  assert.throws(() => insertAssertion(db, f.ref, 'assertion-1', { asserted: 'other' }), /UNIQUE/);
  assert.throws(() => insertAssertion(db, f.ref, 'assertion-replay'), /UNIQUE/);
  for (const [field, bad] of [['scope','bad'],['klass','bad'],['confidence','bad'],['producerId',' '],['version',' '],['run',' ']])
    assert.throws(() => insertAssertion(db, f.ref, `bad-${field}`, { [field]: bad, asserted: `bad-${field}` }), /CHECK constraint failed/);
  assert.throws(() => insertAssertion(db, f.ref, 'bad-type', { type: ' ', asserted: 'bad-type' }), /CHECK constraint failed/);
  assert.throws(() => insertAssertion(db, f.ref, 'bad-value', { asserted: ' ' }), /CHECK constraint failed/);
  assert.throws(() => db.prepare(`INSERT INTO design_reference_synthesis_assertion
    (id,assertion_key,design_reference_id,synthesis_scope,assertion_class,assertion_type,asserted_value,confidence,producer_type,producer_id,analysis_version,synthesis_run_key,supersedes_assertion_id)
    VALUES (999,'self',?,'product_design','observation','self','self','low','human','reviewer','v2','run-2',999)`).run(f.ref), /cannot supersede itself|CHECK constraint failed/);
  assert.throws(() => insertAssertion(db, f.otherRef, 'cross-reference', { asserted: 'cross-ref', supersedes: first }), /same design reference/);
  assert.throws(() => insertAssertion(db, f.ref, 'cross-scope', { scope: 'promotional_visual', asserted: 'cross-scope', supersedes: first }), /same scope/);
  assert.doesNotThrow(() => insertAssertion(db, f.ref, 'correction', { asserted: 'oval', supersedes: first }));
  assert.throws(() => db.prepare('UPDATE design_reference_synthesis_assertion SET notes=? WHERE id=?').run('changed', first), /append-only/);
  assert.throws(() => db.prepare('DELETE FROM design_reference_synthesis_assertion WHERE id=?').run(first), /cannot be deleted/);
  db.close();
}));

test('source links require unique, existing observations from the same reference and remain evidence history', () => withDb(path => {
  const db = open(path); const f = fixture(db); const assertion = insertAssertion(db, f.ref, 'source-assertion');
  assert.doesNotThrow(() => db.prepare('INSERT INTO design_reference_synthesis_source VALUES (?,?)').run(assertion, f.observation));
  assert.throws(() => db.prepare('INSERT INTO design_reference_synthesis_source VALUES (?,?)').run(assertion, f.observation), /UNIQUE/);
  assert.throws(() => db.prepare('INSERT INTO design_reference_synthesis_source VALUES (?,?)').run(assertion, 999999), /must belong|FOREIGN KEY/);
  assert.throws(() => db.prepare('INSERT INTO design_reference_synthesis_source VALUES (?,?)').run(assertion, f.otherObservation), /must belong/);
  assert.throws(() => db.prepare('DELETE FROM design_reference_synthesis_source WHERE synthesis_assertion_id=?').run(assertion), /cannot be deleted/);
  db.close();
}));

test('isolated migrated database passes SQLite integrity and foreign-key checks', () => withDb(path => {
  const db = open(path);
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  db.close();
}));
