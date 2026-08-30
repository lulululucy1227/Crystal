import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { applyHistoricalCanonicalRegroup } from '../scripts/apply-p2a-historical-canonical-regroup.mjs';

const root = process.cwd();

function withFixture(fn) {
  const dir = mkdtempSync(join(root, 'test', '.tmp-p2a-regroup-'));
  const path = join(dir, 'fixture.sqlite');
  copyFileSync(join(root, 'backups', 'p2a-historical-canonical-regroup-20260830-113556.sqlite'), path);
  try { fn(path); } finally { rmSync(dir, { recursive: true, force: true }); }
}

function open(path) {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON');
  return db;
}

test('historical canonical regroup splits only the authorized references, moves only the authorized assets, and is replay-safe', () => withFixture(path => {
  const first = applyHistoricalCanonicalRegroup(path);
  assert.deepEqual(first.assetMoves.map(x => x.filename), ['IMG_7678.PNG', 'IMG_7688.PNG', 'IMG_7690.PNG', 'IMG_7696.PNG', 'IMG_7698.PNG']);
  const db = open(path);
  const children = db.prepare("SELECT reference_key, notes FROM design_reference WHERE notes LIKE '%P2A-HISTORICAL-CANONICAL-REGROUP-CORRECTION%' ORDER BY id").all();
  assert.equal(children.length, 7);
  for (const [filename, group] of [['IMG_7654.PNG', 'EARLY-C01'], ['IMG_7655.PNG', 'EARLY-C02'], ['IMG_7656.PNG', 'EARLY-C03'], ['IMG_7661.PNG', 'EARLY-C04'], ['IMG_7662.PNG', 'EARLY-C05'], ['IMG_7663.PNG', 'EARLY-C06'], ['IMG_7664.PNG', 'EARLY-C07']]) {
    const row = db.prepare(`SELECT r.notes FROM design_reference r JOIN design_reference_image ri ON ri.design_reference_id=r.id JOIN image_asset a ON a.id=ri.image_asset_id WHERE a.original_filename=?`).get(filename);
    assert.match(row.notes, new RegExp(`regroup_child=${group}`));
  }
  for (const [filename, key] of [['IMG_7678.PNG', 'REF-000009'], ['IMG_7688.PNG', 'REF-000012'], ['IMG_7690.PNG', 'REF-000013'], ['IMG_7696.PNG', 'REF-000015'], ['IMG_7698.PNG', 'REF-000016']]) {
    assert.equal(db.prepare(`SELECT r.reference_key FROM design_reference r JOIN design_reference_image ri ON ri.design_reference_id=r.id JOIN image_asset a ON a.id=ri.image_asset_id WHERE a.original_filename=?`).get(filename).reference_key, key);
  }
  assert.equal(db.prepare('SELECT COUNT(*) n FROM image_asset').get().n, 69);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM image_visual_observation').get().n, 80);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM preference_evidence WHERE design_reference_id=3').get().n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM design_reference_pattern WHERE design_reference_id=3').get().n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM design_reference_theme WHERE design_reference_id=4').get().n, 2);
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  db.close();
  const replay = applyHistoricalCanonicalRegroup(path);
  assert.equal(replay.status, 'already_applied');
}));
