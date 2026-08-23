import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { initialize, isSafeMaterialAlias, normalizeIdentityName, promoteApprovedMaterial, reviewStagedRecord, stageMaterialRecord, validate } from '../scripts/crystal-db.mjs';

function withDb(fn) {
  const dir = mkdtempSync(join(process.cwd(), 'test', '.tmp-crystal-p1ar-')); const path = join(dir, 'test.sqlite');
  try { initialize(path); fn(path); } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('reviewed Chinese and English identity aliases can resolve to one material', () => withDb(path => {
  const db = new DatabaseSync(path); const material = db.prepare("INSERT INTO material(canonical_name,material_family) VALUES ('Aquamarine','gemstone')").run().lastInsertRowid;
  db.prepare("INSERT INTO material_alias(material_id,alias_raw,normalized_alias,review_status,confidence) VALUES (?,?,?,?,?)").run(material, '海蓝宝', normalizeIdentityName('海蓝宝'), 'reviewed', 'high');
  db.prepare("INSERT INTO material_alias(material_id,alias_raw,normalized_alias,review_status,confidence) VALUES (?,?,?,?,?)").run(material, 'Aquamarine', normalizeIdentityName('Aquamarine'), 'reviewed', 'high');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM material_alias WHERE material_id=?').get(material).n, 2); db.close();
}));

test('component descriptors are not stripped into aliases', () => {
  assert.equal(isSafeMaterialAlias('Aquamarine bead'), false);
  assert.equal(isSafeMaterialAlias('8mm Aquamarine'), false);
  assert.equal(normalizeIdentityName('Aquamarine bead'), 'aquamarine bead');
});

test('supplier untreated wording remains an unverified claim and narrative remains separate', () => withDb(path => {
  const db = new DatabaseSync(path); const material = db.prepare("INSERT INTO material(canonical_name,material_family) VALUES ('Test Stone','other')").run().lastInsertRowid;
  const source = db.prepare("INSERT INTO source(source_type,name) VALUES ('supplier','supplier wording')").run().lastInsertRowid;
  db.prepare("INSERT INTO material_claim(material_id,claim_field,raw_value,source_id,verification_status,confidence) VALUES (?,?,?,?,?,?)").run(material, 'treatment', 'untreated', source, 'unverified', 'low');
  db.prepare("INSERT INTO material_narrative(material_id,narrative_type,statement,confidence) VALUES (?,?,?,?)").run(material, 'traditional_association', 'Grounding symbolism', 'low');
  assert.equal(db.prepare("SELECT verification_status FROM material_claim WHERE raw_value='untreated'").get().verification_status, 'unverified');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM material_narrative').get().n, 1); db.close();
}));

test('market assessment, packaging and commercial tier stay in their correct domains', () => withDb(path => {
  const db = new DatabaseSync(path);
  db.prepare("INSERT INTO market_assessment(subject_type,target_market,assessment_text,analyst,confidence) VALUES ('material','EU','Likely suitable','analyst','low')").run();
  db.prepare("INSERT INTO packaging_option(packaging_code,packaging_type,suitable_tier) VALUES ('PKG-POUCH-01','pouch','accessible')").run();
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM component WHERE component_code=?').get('PKG-POUCH-01').n, 0);
  assert.throws(() => db.prepare("UPDATE material SET material_tier='premium' WHERE id=1").run());
  db.close();
}));

test('staged rows require approval, rejected rows do not enter canonical, and approved fixtures promote with provenance', () => withDb(path => {
  const staged = stageMaterialRecord(path, { rawMaterialName: 'Fixture Quartz', proposedCanonicalName: 'Fixture Quartz', sourceFile: 'fixture.csv', sourceRow: 2 });
  assert.throws(() => promoteApprovedMaterial(path, staged.recordId));
  reviewStagedRecord(path, staged.recordId, 'rejected', 'reviewer');
  assert.throws(() => promoteApprovedMaterial(path, staged.recordId));
  const approved = stageMaterialRecord(path, { rawMaterialName: 'Fixture Agate', proposedCanonicalName: 'Fixture Agate', sourceFile: 'fixture.csv', sourceRow: 3 });
  reviewStagedRecord(path, approved.recordId, 'approved', 'reviewer');
  const materialId = promoteApprovedMaterial(path, approved.recordId, 'reviewer');
  const db = new DatabaseSync(path);
  assert.equal(db.prepare('SELECT canonical_name FROM material WHERE id=?').get(materialId).canonical_name, 'Fixture Agate');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM promotion_log WHERE staged_record_id=?').get(approved.recordId).n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM material_claim WHERE material_id=? AND source_id IS NOT NULL').get(materialId).n, 1);
  db.close(); assert.deepEqual(validate(path), []);
}));
