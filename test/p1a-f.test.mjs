import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { initialize, validate } from '../scripts/crystal-db.mjs';
import { promoteReviewedPilot, REVIEWER } from '../scripts/promote-reviewed-pilot.mjs';

function withDb(fn) {
  const dir = mkdtempSync(join(process.cwd(), 'test', '.tmp-crystal-p1af-')); const path = join(dir, 'test.sqlite');
  try { initialize(path); fn(path); } finally { try { rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* Windows releases sqlite handles after the test process exits. */ } }
}

function stageReviewedFixture(db) {
  const batchId = db.prepare("INSERT INTO import_batch(source_file,source_format,source_description,imported_by,batch_status) VALUES ('fixture.xlsx','xlsx','P1A-F test fixture','CODEX_TEST','ready_for_review')").run().lastInsertRowid;
  const addField = db.prepare('INSERT INTO staged_field(staged_record_id,source_column,raw_value,normalized_value,target_entity,target_field,field_status) VALUES (?,?,?,?,?,?,?)');
  for (let row = 3; row <= 12; row += 1) {
    const recordId = db.prepare('INSERT INTO staged_record(import_batch_id,source_sheet,source_row,raw_record_json,target_entity,validation_status) VALUES (?,?,?,?,?,?)')
      .run(batchId, 'Water', row, JSON.stringify({ sourceFile: 'fixture.xlsx' }), 'material_intake', 'review_required').lastInsertRowid;
    const fields = [
      ['name', `Source ${row}`, `source ${row}`, 'material_alias', 'alias_raw'],
      ['english', `Display ${row}`, `display ${row}`, 'material', 'canonical_name'],
      ['quality', `Quality ${row}`, `quality ${row}`, 'material_variant', 'quality_description'],
      ['tier', 'low', 'low', 'material_variant', 'source_tier_label'],
      ['size', '4-8mm', '4-8mm', 'material_variant', 'size_range_mm'],
      ['price', '¥3-8 / strand', '¥3-8 / strand', 'supplier_offer', 'price_text'],
      ['supplier', 'unverified supplier', 'unverified supplier', 'supplier', 'supplier_candidate'],
      ['narrative', `Narrative ${row}`, `narrative ${row}`, 'material_narrative', 'statement'],
      ['market', `EU note ${row}`, `eu note ${row}`, 'market_assessment', 'assessment_text'],
    ];
    for (const [column, raw, normalized, entity, target] of fields) addField.run(recordId, column, raw, normalized, entity, target, 'review_required');
  }
}

test('reviewed ten-row pilot partially promotes approved content with exact field provenance', () => withDb(path => {
  const db = new DatabaseSync(path); stageReviewedFixture(db); db.close();
  const summary = promoteReviewedPilot(path);
  assert.deepEqual(summary, { materialsCreated: 8, materialsReused: 2, variantsCreated: 10, aliasesCreated: 5, claimsCreated: 1, narrativesCreated: 10, assessmentsCreated: 10, decisionsCreated: 90, eventsCreated: 44, sourceLinksCreated: 92, rowSummaries: 10 });
  const audit = new DatabaseSync(path);
  assert.equal(audit.prepare("SELECT COUNT(*) AS n FROM material WHERE canonical_name='Citrine (heat-treated)'").get().n, 0);
  assert.equal(audit.prepare("SELECT COUNT(*) AS n FROM material WHERE canonical_name='Citrine'").get().n, 1);
  assert.equal(audit.prepare("SELECT COUNT(*) AS n FROM material WHERE canonical_name='Obsidian'").get().n, 1);
  assert.equal(audit.prepare("SELECT COUNT(*) AS n FROM material_variant v JOIN material m ON m.id=v.material_id WHERE m.canonical_name='Obsidian'").get().n, 3);
  assert.equal(audit.prepare("SELECT COUNT(*) AS n FROM material_claim WHERE claim_field='origin' AND raw_value='India' AND verification_status='unverified'").get().n, 1);
  assert.equal(audit.prepare("SELECT COUNT(*) AS n FROM material_alias WHERE alias_raw='India'").get().n, 0);
  assert.equal(audit.prepare("SELECT COUNT(*) AS n FROM material_variant WHERE commercial_tier='accessible' AND source_tier_label='low'").get().n, 10);
  assert.equal(audit.prepare("SELECT COUNT(*) AS n FROM material_narrative").get().n, 10);
  assert.equal(audit.prepare("SELECT COUNT(*) AS n FROM market_assessment WHERE confidence='low' AND analyst=?").get(REVIEWER).n, 10);
  assert.equal(audit.prepare("SELECT COUNT(*) AS n FROM supplier_offer").get().n, 1); // P0 sample only
  assert.equal(audit.prepare("SELECT COUNT(*) AS n FROM supplier").get().n, 1); // P0 sample only
  assert.equal(audit.prepare("SELECT COUNT(*) AS n FROM field_review_decision WHERE decision='retained_staged'").get().n, 20);
  assert.equal(audit.prepare("SELECT COUNT(*) AS n FROM field_promotion_log").get().n, 44);
  assert.equal(audit.prepare("SELECT COUNT(*) AS n FROM field_promotion_source").get().n, 92);
  assert.equal(audit.prepare("SELECT COUNT(*) AS n FROM promotion_log WHERE canonical_entity='partial_promotion_summary'").get().n, 10);
  assert.equal(audit.prepare("SELECT COUNT(*) AS n FROM promotion_log WHERE provenance_note LIKE 'FULLY_PROMOTED%'").get().n, 0);
  audit.close(); assert.deepEqual(validate(path), []);
}));
