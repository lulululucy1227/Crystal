import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';

test('P2F/P2G stage exact catalog evidence, create only four source-scoped variants, and replay idempotently', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p2f-p2g-'));
  const dbPath = path.join(dir, 'db.sqlite');
  fs.copyFileSync('backups/p2f-p2g-20260830-155652.sqlite', dbPath);
  const run = () => spawnSync(process.execPath, ['scripts/import-p2f-p2g-staging.mjs', dbPath], { encoding: 'utf8' });
  const first = run();
  assert.equal(first.status, 0, first.stderr);
  const second = run();
  assert.equal(second.status, 0, second.stderr);
  const db = new DatabaseSync(dbPath);
  assert.equal(db.prepare("select count(*) n from staged_record where target_entity='packaging_supplier_offer'").get().n, 4);
  assert.equal(db.prepare("select count(*) n from staged_record sr join import_batch ib on ib.id=sr.import_batch_id where sr.target_entity='supplier_offer' and sr.validation_status='review_required' and ib.source_description='P2F-P2G | supplier_offer'").get().n, 6);
  assert.equal(db.prepare("select count(*) n from material_variant where variant_code like 'SRC-P2G-%'").get().n, 4);
  assert.equal(db.prepare("select count(*) n from supplier_offer where notes like '%EDEL-%'").get().n, 0);
  assert.equal(db.prepare('pragma integrity_check').get().integrity_check, 'ok');
  assert.equal(db.prepare('pragma foreign_key_check').all().length, 0);
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});
