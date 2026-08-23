import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { initialize, validate } from '../scripts/crystal-db.mjs';

function withDb(fn) {
  const dir = mkdtempSync(join(process.cwd(), 'test', '.tmp-crystal-p0-')); const path = join(dir, 'test.sqlite');
  try { initialize(path); fn(path); } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('P0 initializes all core separations and passes validation', () => withDb(path => {
  assert.deepEqual(validate(path), []);
  const db = new DatabaseSync(path);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM material').get().n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM material_variant').get().n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM component').get().n, 2);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM preference_evidence').get().n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM design_assessment').get().n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM visual_communication_reference').get().n, 1);
  db.close();
}));

test('uncertain image observation cannot be converted into a confirmed material fact', () => withDb(path => {
  const db = new DatabaseSync(path); db.exec('PRAGMA foreign_keys = ON');
  const ref = db.prepare('SELECT id FROM design_reference LIMIT 1').get().id;
  const variant = db.prepare('SELECT id FROM material_variant LIMIT 1').get().id;
  assert.throws(() => db.prepare("INSERT INTO design_reference_observation(design_reference_id,observation_type,observed_value,identification_status,confirmed_material_variant_id,confidence) VALUES (?,?,?,?,?,?)").run(ref,'material','blue stone','uncertain',variant,'low'));
  db.close();
}));

test('one-of-one variants require a unique piece code', () => withDb(path => {
  const db = new DatabaseSync(path); db.exec('PRAGMA foreign_keys = ON');
  const material = db.prepare('SELECT id FROM material LIMIT 1').get().id;
  assert.throws(() => db.prepare("INSERT INTO material_variant(material_id,variant_code,reproducibility) VALUES (?,?,?)").run(material,'INVALID-ONE-OFF','one_of_one'));
  db.close();
}));
