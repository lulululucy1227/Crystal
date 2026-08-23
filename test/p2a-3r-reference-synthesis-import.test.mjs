import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { importReferenceSynthesis } from '../scripts/import-p2a-reference-synthesis.mjs';

const root = process.cwd();
const canonical = join(root, 'data', 'crystal-design.sqlite');
const inputFile = join(root, 'inputs', 'p2a-3s1-reference-synthesis.json');
const migration = readFileSync(join(root, 'migrations', '009_p2a_reference_synthesis.sql'), 'utf8');
const legacyTables = ['design_reference_observation', 'design_assessment', 'visual_communication_reference', 'design_reference_pattern', 'design_reference_theme', 'preference_evidence', 'image_visual_observation'];

function fixture() {
  const dir = mkdtempSync(join(root, 'test', '.tmp-p2a-3r-')); const dbPath = join(dir, 'test.sqlite'); const inputPath = join(dir, 'input.json');
  copyFileSync(canonical, dbPath); copyFileSync(inputFile, inputPath);
  const db = new DatabaseSync(dbPath);
  db.exec(`DROP TRIGGER IF EXISTS trg_reference_synthesis_assertion_lineage_insert;
    DROP TRIGGER IF EXISTS trg_reference_synthesis_assertion_no_update;
    DROP TRIGGER IF EXISTS trg_reference_synthesis_assertion_no_delete;
    DROP TRIGGER IF EXISTS trg_reference_synthesis_source_reference_insert;
    DROP TRIGGER IF EXISTS trg_reference_synthesis_source_no_update;
    DROP TRIGGER IF EXISTS trg_reference_synthesis_source_no_delete;
    DROP TABLE IF EXISTS design_reference_synthesis_source;
    DROP TABLE IF EXISTS design_reference_synthesis_assertion;`);
  db.exec(migration); db.close();
  return { dir, dbPath, inputPath, close() { rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } };
}
function mutate(f, fn) { const value = JSON.parse(readFileSync(f.inputPath, 'utf8')); fn(value); writeFileSync(f.inputPath, JSON.stringify(value, null, 2)); }
function count(dbPath, table) { const db = new DatabaseSync(dbPath); const value = Number(db.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n); db.close(); return value; }
function legacy(dbPath) { const db = new DatabaseSync(dbPath); const value = Object.fromEntries(legacyTables.map(table => [table, JSON.stringify(db.prepare(`SELECT * FROM ${table} ORDER BY id`).all())])); db.close(); return value; }

test('P2A-3R preflight validates the fixed pilot and dry-run does not write', () => {
  const f = fixture(); try {
    const before = { assertions: count(f.dbPath, 'design_reference_synthesis_assertion'), sources: count(f.dbPath, 'design_reference_synthesis_source') };
    const result = importReferenceSynthesis(f.dbPath, f.inputPath, { dryRun: true });
    assert.equal(result.expected_assertions, 19); assert.equal(result.expected_sources, 37); assert.equal(result.dry_run, true);
    assert.deepEqual({ assertions: count(f.dbPath, 'design_reference_synthesis_assertion'), sources: count(f.dbPath, 'design_reference_synthesis_source') }, before);
  } finally { f.close(); }
});

for (const [name, mutation, pattern] of [
  ['unknown reference', input => { input.references[0].reference_key = 'REF-UNKNOWN'; }, /reference set|expected_asset_keys/],
  ['asset grouping mismatch', input => { input.references[0].expected_asset_keys = ['ASSET-000001']; }, /expected_asset_keys/],
  ['nonexistent observation', input => { input.references[0].assertions[0].source_image_observation_ids = [9999]; }, /resolved 0 times/],
  ['cross-reference evidence', input => { input.references[0].assertions[0].source_image_observation_ids = [10]; }, /evidence-map provenance|different reference/],
  ['scope mismatch', input => { input.references[0].assertions[0].synthesis_scope = 'promotional_visual'; }, /scope does not match/],
  ['duplicate assertion key', input => { input.references[0].assertions[1].assertion_key = input.references[0].assertions[0].assertion_key; }, /duplicate assertion_key/],
  ['duplicate source id', input => { input.references[0].assertions[0].source_image_observation_ids = [1, 1]; }, /sources must be unique/],
  ['blank semantic value', input => { input.references[0].assertions[0].asserted_value = ' '; }, /blank semantic fields/],
  ['proposed pattern', input => { input.proposed_pattern_changes = [{ x: 'no' }]; }, /pattern_changes/],
  ['proposed theme', input => { input.proposed_theme_changes = [{ x: 'no' }]; }, /theme_changes/]
]) test(`P2A-3R preflight rejects ${name} without writes`, () => {
  const f = fixture(); try { mutate(f, mutation); assert.throws(() => importReferenceSynthesis(f.dbPath, f.inputPath), pattern); assert.equal(count(f.dbPath, 'design_reference_synthesis_assertion'), 0); assert.equal(count(f.dbPath, 'design_reference_synthesis_source'), 0); } finally { f.close(); }
});

test('P2A-3R applies once, replays exactly, and preserves all forbidden table fingerprints', () => {
  const f = fixture(); try {
    const before = legacy(f.dbPath); const first = importReferenceSynthesis(f.dbPath, f.inputPath); const replay = importReferenceSynthesis(f.dbPath, f.inputPath);
    assert.deepEqual([first.created_assertions, first.reused_assertions, first.created_sources, first.reused_sources], [19, 0, 37, 0]);
    assert.deepEqual([replay.created_assertions, replay.reused_assertions, replay.created_sources, replay.reused_sources], [0, 19, 0, 37]);
    assert.equal(count(f.dbPath, 'design_reference_synthesis_assertion'), 19); assert.equal(count(f.dbPath, 'design_reference_synthesis_source'), 37);
    assert.deepEqual(legacy(f.dbPath), before);
    const db = new DatabaseSync(f.dbPath); assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok'); assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []); db.close();
  } finally { f.close(); }
});
