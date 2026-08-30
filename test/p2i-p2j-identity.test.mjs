import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { importP2iP2j } from '../scripts/import-p2i-p2j-identities.mjs';

const p2i = JSON.parse(fs.readFileSync('inputs/p2i-gpt-packaging-identity-mapping-20260830.json', 'utf8'));
const p2j = JSON.parse(fs.readFileSync('inputs/p2j-gpt-material-gap-resolution-20260830.json', 'utf8'));

test('P2I/P2J creates only authored source-scoped identities and replays without promotion', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p2i-p2j-'));
  const dbPath = path.join(dir, 'db.sqlite');
  fs.copyFileSync('backups/p2i-p2j-20260830-163317.sqlite', dbPath);
  const first = importP2iP2j(dbPath, p2i, p2j);
  assert.equal(first.packaging.created, 4);
  assert.equal(first.materials.created, 1);
  assert.equal(first.variants.created, 2);
  assert.equal(first.promotions_created, 0);
  const replay = importP2iP2j(dbPath, p2i, p2j);
  assert.equal(replay.packaging.reused, 4);
  assert.equal(replay.materials.reused, 2);
  assert.equal(replay.variants.reused, 2);
  const db = new DatabaseSync(dbPath);
  assert.equal(db.prepare("select count(*) n from packaging_option where packaging_code like 'SRC-LAVAL-%'").get().n, 4);
  assert.equal(db.prepare("select count(*) n from material where canonical_name='Rutilated Quartz'").get().n, 1);
  assert.equal(db.prepare("select count(*) n from material_variant where variant_code in ('SRC-P2G-EDEL-RUTILATED-QTZ-MULTI-8MM-40CM','SRC-P2G-EDEL-LABRADORITE-FACETED-AAA-15471')").get().n, 2);
  assert.equal(db.prepare("select count(*) n from supplier_offer where notes like '%P2I%' or notes like '%P2J%'").get().n, 0);
  assert.equal(db.prepare('pragma integrity_check').get().integrity_check, 'ok');
  assert.equal(db.prepare('pragma foreign_key_check').all().length, 0);
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});
