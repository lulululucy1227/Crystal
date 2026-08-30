import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { importCretaceousCoastFragments } from '../scripts/import-p2a-new-reference-cretaceous-coast-fragments.mjs';

const root = process.cwd();
const inputSource = join(root, 'inputs', 'p2a-new-reference-cretaceous-coast-fragments.json');
const ids = ['1G3vgzk5As10zXs3pPfXdc-oA3dG5iiAk', '1laJm9mwscENnZ6agSLcvUitzsJyUfO_P', '1QH29N5T9k_AKmK36x_ytiEQ4gEyEKt3i'];
const migration9 = readFileSync(join(root, 'migrations', '009_p2a_reference_synthesis.sql'), 'utf8');

function fixture() {
  const dir = mkdtempSync(join(root, 'test', '.tmp-cretaceous-intake-')); const dbPath = join(dir, 'test.sqlite'); const inputPath = join(dir, 'input.json');
  copyFileSync(join(root, 'data', 'crystal-design.sqlite'), dbPath); copyFileSync(inputSource, inputPath);
  const db = new DatabaseSync(dbPath); db.exec('PRAGMA foreign_keys=OFF; DROP TRIGGER IF EXISTS trg_reference_synthesis_assertion_lineage_insert; DROP TRIGGER IF EXISTS trg_reference_synthesis_assertion_no_update; DROP TRIGGER IF EXISTS trg_reference_synthesis_assertion_no_delete; DROP TRIGGER IF EXISTS trg_reference_synthesis_source_reference_insert; DROP TRIGGER IF EXISTS trg_reference_synthesis_source_no_update; DROP TRIGGER IF EXISTS trg_reference_synthesis_source_no_delete; DROP TABLE design_reference_synthesis_source; DROP TABLE design_reference_synthesis_assertion; PRAGMA foreign_keys=ON;');
  const assets = db.prepare(`SELECT id FROM image_asset WHERE provider='google_drive' AND provider_file_id IN (${ids.map(() => '?').join(',')})`).all(...ids).map(row => row.id);
  if (assets.length) {
    const refs = db.prepare(`SELECT DISTINCT design_reference_id id FROM design_reference_image WHERE image_asset_id IN (${assets.map(() => '?').join(',')})`).all(...assets).map(row => row.id);
    for (const id of refs) db.prepare('DELETE FROM design_reference WHERE id=?').run(id);
    for (const id of assets) db.prepare('DELETE FROM image_asset WHERE id=?').run(id);
    db.prepare("DELETE FROM source WHERE name='P2A intake | 白垩纪的海岸碎片'").run();
  }
  db.exec(migration9); db.close(); return { dir, dbPath, inputPath, close() { rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } };
}

function mutate(path, fn) { const input = JSON.parse(readFileSync(path, 'utf8')); fn(input); writeFileSync(path, JSON.stringify(input)); }
function counts(path) { const db = new DatabaseSync(path); const value = { refs: Number(db.prepare("SELECT COUNT(*) n FROM design_reference WHERE notes LIKE 'P2A-NEW-REFERENCE-CRETACEOUS-COAST-FRAGMENTS%'").get().n), assets: Number(db.prepare(`SELECT COUNT(*) n FROM image_asset WHERE provider='google_drive' AND provider_file_id IN (${ids.map(() => '?').join(',')})`).get(...ids).n), links: Number(db.prepare(`SELECT COUNT(*) n FROM design_reference_image i JOIN image_asset a ON a.id=i.image_asset_id WHERE a.provider_file_id IN (${ids.map(() => '?').join(',')})`).get(...ids).n), observations: Number(db.prepare(`SELECT COUNT(*) n FROM image_visual_observation o JOIN image_asset a ON a.id=o.image_asset_id WHERE a.provider_file_id IN (${ids.map(() => '?').join(',')})`).get(...ids).n), synthesis: Number(db.prepare('SELECT COUNT(*) n FROM design_reference_synthesis_assertion').get().n) }; db.close(); return value; }

test('Cretaceous Coast Fragments intake creates one mechanical reference and exactly replays it', () => {
  const f = fixture(); try {
    const first = importCretaceousCoastFragments(f.dbPath, f.inputPath); const replay = importCretaceousCoastFragments(f.dbPath, f.inputPath);
    assert.deepEqual([first.references_created, first.references_reused, first.assets_created, first.assets_reused, first.links_created, first.links_reused, first.sha_match], [1, 0, 3, 0, 3, 0, 3]);
    assert.deepEqual([replay.references_created, replay.references_reused, replay.assets_created, replay.assets_reused, replay.links_created, replay.links_reused], [0, 1, 0, 3, 0, 3]);
    assert.match(first.reference_key, /^REF-\d{6}$/); assert.deepEqual(counts(f.dbPath), { refs: 1, assets: 3, links: 3, observations: 0, synthesis: 0 });
    const db = new DatabaseSync(f.dbPath); const ref = db.prepare("SELECT notes FROM design_reference WHERE reference_key=?").get(first.reference_key); assert.match(ref.notes, /白垩纪的海岸碎片/); assert.match(ref.notes, /not geological age\/provenance/); assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok'); assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []); db.close();
  } finally { f.close(); }
});

for (const [name, change, message] of [
  ['wrong phase', input => { input.phase = 'other'; }, /phase is not exact/],
  ['bad SHA', input => { input.assets[0].source_content_sha256 = 'A'.repeat(64); }, /SHA-256/],
  ['duplicate provider identity', input => { input.assets[1].provider_file_id = input.assets[0].provider_file_id; }, /exact authorized source image|duplicate provider_file_id/],
  ['material claim temptation', input => { input.source_context.promotional_claims_visible.push('confirmed material fact'); }, null]
]) test(`Cretaceous Coast Fragments rejects ${name} without writes when it changes the identity contract`, () => {
  const f = fixture(); try {
    const before = counts(f.dbPath); mutate(f.inputPath, change);
    if (message) assert.throws(() => importCretaceousCoastFragments(f.dbPath, f.inputPath), message);
    else assert.doesNotThrow(() => importCretaceousCoastFragments(f.dbPath, f.inputPath));
    if (message) assert.deepEqual(counts(f.dbPath), before); else assert.equal(counts(f.dbPath).observations, 0);
  } finally { f.close(); }
});
