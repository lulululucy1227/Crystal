import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { importP2mProductConcept } from '../scripts/import-p2m-glacier-product-concept.mjs';

test('P2M creates only Glacier Signature Prototype 01 and replays without a BOM', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p2m-'));
  const dbPath = path.join(dir, 'db.sqlite');
  fs.copyFileSync('backups/p2m-20260830-165219.sqlite', dbPath);
  const first = importP2mProductConcept(dbPath);
  assert.equal(first.created, 1);
  assert.equal(first.bom_created, 0);
  const replay = importP2mProductConcept(dbPath);
  assert.equal(replay.reused, 1);
  const db = new DatabaseSync(dbPath);
  const concept = db.prepare('select name,theme,version_label,status,intent,notes from product_concept where name=?').get('Glacier Signature Prototype 01');
  assert.deepEqual({ name: concept.name, theme: concept.theme, version_label: concept.version_label, status: concept.status }, { name: 'Glacier Signature Prototype 01', theme: 'Glacier', version_label: 'v0', status: 'research' });
  assert.match(concept.notes, /explicit_user_choice_A_in_chatgpt/);
  assert.equal(db.prepare('select count(*) n from bom_line').get().n, 1);
  assert.equal(db.prepare('pragma integrity_check').get().integrity_check, 'ok');
  db.close(); fs.rmSync(dir, { recursive: true, force: true });
});
