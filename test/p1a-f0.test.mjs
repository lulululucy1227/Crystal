import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { effectiveFieldReview, initialize, recordFieldPromotion, reviewStagedField, stageMaterialRecord, validate } from '../scripts/crystal-db.mjs';

function withDb(fn) {
  const dir = mkdtempSync(join(process.cwd(), 'test', '.tmp-crystal-p1af0-')); const path = join(dir, 'test.sqlite');
  try { initialize(path); fn(path); } finally { rmSync(dir, { recursive: true, force: true }); }
}

function fieldsFor(db, recordId) {
  return db.prepare('SELECT id, target_entity, target_field FROM staged_field WHERE staged_record_id=? ORDER BY id').all(recordId);
}

test('one staged record supports independent field decisions and retained price', () => withDb(path => {
  const staged = stageMaterialRecord(path, { rawMaterialName: 'Fixture Citrine', proposedCanonicalName: 'Citrine', sourceTierLabel: '低档', priceText: '¥6-15 / strand' });
  const db = new DatabaseSync(path); const fields = fieldsFor(db, staged.recordId); db.close();
  const material = fields.find(f => f.target_entity === 'material'); const price = fields.find(f => f.target_entity === 'supplier_offer');
  reviewStagedField(path, material.id, 'approved', 'USER', 'Identity approved.');
  reviewStagedField(path, price.id, 'retained_staged', 'USER', 'Quote is not normalized.');
  assert.equal(effectiveFieldReview(path, material.id).decision, 'approved');
  assert.equal(effectiveFieldReview(path, price.id).decision, 'retained_staged');
}));

test('multiple promotion events may share a record and one event may cite multiple approved fields', () => withDb(path => {
  const staged = stageMaterialRecord(path, { rawMaterialName: 'Fixture Obsidian', proposedCanonicalName: 'Obsidian' });
  const db = new DatabaseSync(path); const fields = fieldsFor(db, staged.recordId); db.close();
  for (const field of fields) reviewStagedField(path, field.id, 'approved', 'USER', 'Fixture approval.');
  const materialEvent = recordFieldPromotion(path, { stagedRecordId: staged.recordId, stagedFieldIds: fields.map(f => f.id), canonicalEntity: 'material', canonicalRecordId: 701, canonicalField: 'canonical_name', operation: 'create', promotionReason: 'Approved fixture identity.' });
  const aliasEvent = recordFieldPromotion(path, { stagedRecordId: staged.recordId, stagedFieldIds: [fields[0].id], canonicalEntity: 'material_alias', canonicalRecordId: 702, canonicalField: 'alias_raw', operation: 'link', promotionReason: 'Approved fixture alias.' });
  const audit = new DatabaseSync(path);
  assert.equal(audit.prepare('SELECT COUNT(*) AS n FROM field_promotion_log WHERE staged_record_id=?').get(staged.recordId).n, 2);
  assert.equal(audit.prepare('SELECT COUNT(*) AS n FROM field_promotion_source WHERE field_promotion_log_id=?').get(materialEvent).n, 2);
  assert.equal(audit.prepare('SELECT COUNT(*) AS n FROM field_promotion_source WHERE field_promotion_log_id=?').get(aliasEvent).n, 1);
  audit.close();
}));

test('rejected and retained-staged fields cannot enter the normal field promotion path', () => withDb(path => {
  const staged = stageMaterialRecord(path, { rawMaterialName: 'Fixture Agate', proposedCanonicalName: 'Agate', priceText: '¥3-8 / strand' });
  const db = new DatabaseSync(path); const fields = fieldsFor(db, staged.recordId); db.close();
  reviewStagedField(path, fields[0].id, 'rejected', 'USER', 'Not an identity alias.');
  reviewStagedField(path, fields.at(-1).id, 'retained_staged', 'USER', 'Price is pending sourcing review.');
  for (const field of [fields[0], fields.at(-1)]) assert.throws(() => recordFieldPromotion(path, { stagedRecordId: staged.recordId, stagedFieldIds: [field.id], canonicalEntity: 'material', canonicalRecordId: 703, promotionReason: 'Must fail.' }));
}));

test('field-audit migration applies to an existing database already at 001 and 002', () => {
  const dir = mkdtempSync(join(process.cwd(), 'test', '.tmp-crystal-migrate-')); const path = join(dir, 'existing.sqlite');
  try {
    const db = new DatabaseSync(path);
    db.exec(readFileSync(join(process.cwd(), 'migrations', '001_initial.sql'), 'utf8'));
    db.prepare('INSERT INTO schema_migration(version) VALUES (?)').run('001_initial');
    db.exec(readFileSync(join(process.cwd(), 'migrations', '002_p1a_staging.sql'), 'utf8'));
    db.prepare('INSERT INTO schema_migration(version) VALUES (?)').run('002_p1a_staging'); db.close();
    initialize(path);
    const migrated = new DatabaseSync(path);
    assert.equal(migrated.prepare("SELECT COUNT(*) AS n FROM schema_migration WHERE version='003_p1a_field_audit'").get().n, 1);
    assert.ok(migrated.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='field_promotion_source'").get()); migrated.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
