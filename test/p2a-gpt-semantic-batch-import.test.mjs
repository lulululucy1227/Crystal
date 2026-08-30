import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { importGptSemanticBatch } from '../scripts/import-p2a-gpt-semantic-batch.mjs';

const root = process.cwd();

test('structured GPT semantic batch creates source/reference/assets/observations/synthesis once and replays without duplicates', () => {
  const dir = mkdtempSync(join(root, 'test', '.tmp-p2a-semantic-'));
  const dbPath = join(dir, 'fixture.sqlite'); const inputPath = join(dir, 'input.json');
  copyFileSync(join(root, 'data', 'crystal-design.sqlite'), dbPath);
  const sha = 'c'.repeat(64);
  const input = {
    contract_version: 'P2A-GPT-SEMANTIC-BATCH-V1', analysis_version: 'p2a-vision-v1', synthesis_analysis_version: 'p2a-synthesis-v1', producer_type: 'assistant_model', producer_id: 'gpt-5.6-sol', batch_key: 'TEST-STRUCTURED-BATCH',
    proposed_pattern_changes: [], proposed_theme_changes: [], proposed_preference_changes: [],
    reference_groups: [{ reference_group_key: 'TEST-GROUP', working_name: 'Test Group', source_context: { source_claim_boundary: 'Source wording only.' }, user_signal: null,
      assets: [{ filename: 'TEST-SEMANTIC.PNG', provider: 'google_drive', provider_file_id: 'test-semantic-id', source_content_sha256: sha, mime_type: 'image/png', width_px: 10, height_px: 10, byte_size: 10 }],
      image_observations: [{ filename: 'TEST-SEMANTIC.PNG', observation_scope: 'product_design', assertion_class: 'observation', observation_type: 'layout', observed_value: 'A test layout.', confidence: 'high' }],
      reference_synthesis_draft: [{ assertion_key_suffix: 'LAYOUT', synthesis_scope: 'product_design', assertion_class: 'observation', assertion_type: 'test_layout', asserted_value: 'A test layout is present.', confidence: 'high', source_observation_selectors: [{ filename: 'TEST-SEMANTIC.PNG', observation_type: 'layout' }] }]
    }]
  };
  writeFileSync(inputPath, JSON.stringify(input));
  try {
    const first = importGptSemanticBatch(dbPath, inputPath);
    assert.deepEqual({ references: first.created_references, assets: first.created_assets, observations: first.created_observations, assertions: first.created_assertions, sources: first.created_sources }, { references: 1, assets: 1, observations: 1, assertions: 1, sources: 1 });
    const db = new DatabaseSync(dbPath); db.exec('PRAGMA foreign_keys=ON');
    assert.equal(db.prepare("SELECT COUNT(*) n FROM image_asset WHERE original_filename='TEST-SEMANTIC.PNG'").get().n, 1);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM design_reference_synthesis_assertion WHERE assertion_key LIKE 'TEST-STRUCTURED-BATCH:%:LAYOUT'").get().n, 1);
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok'); assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []); db.close();
    const replay = importGptSemanticBatch(dbPath, inputPath);
    assert.equal(replay.created_observations, 0); assert.equal(replay.created_assertions, 0); assert.equal(replay.reused_observations, 1); assert.equal(replay.reused_assertions, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('an exact provider identity record may resolve an existing unresolved asset but may not overwrite a conflicting identity', () => {
  const dir = mkdtempSync(join(root, 'test', '.tmp-p2a-semantic-resolve-')); const dbPath = join(dir, 'fixture.sqlite'); const inputPath = join(dir, 'input.json');
  copyFileSync(join(root, 'data', 'crystal-design.sqlite'), dbPath);
  const db = new DatabaseSync(dbPath); db.exec('PRAGMA foreign_keys=ON');
  const ref = db.prepare("SELECT id,reference_key FROM design_reference WHERE reference_key='REF-000003'").get();
  const source = db.prepare("INSERT INTO source(source_type,name) VALUES ('internal_note','test unresolved source')").run().lastInsertRowid;
  const asset = db.prepare("INSERT INTO image_asset(provider,provider_file_id,original_filename,asset_status,notes) VALUES ('google_drive','test-unresolved-id','TEST-UNRESOLVED.PNG','unresolved','fixture')").run().lastInsertRowid;
  db.prepare('INSERT INTO design_reference_image(design_reference_id,image_asset_id,display_order) VALUES (?,?,99)').run(ref.id, asset); db.close();
  const input = { contract_version:'P2A-GPT-SEMANTIC-BATCH-V1', analysis_version:'p2a-vision-v1', synthesis_analysis_version:'p2a-synthesis-v1', producer_type:'assistant_model', producer_id:'gpt-5.6-sol', batch_key:'TEST-RESOLVE', proposed_pattern_changes:[], proposed_theme_changes:[], proposed_preference_changes:[], existing_reference_batches:[{ reference_key:ref.reference_key, assets:[{ filename:'TEST-UNRESOLVED.PNG',provider:'google_drive',provider_file_id:'test-unresolved-id',source_content_sha256:'d'.repeat(64),mime_type:'image/png',width_px:11,height_px:12,byte_size:13}], image_observations:[], reference_synthesis_draft:[] }] };
  writeFileSync(inputPath, JSON.stringify(input));
  try { const result=importGptSemanticBatch(dbPath,inputPath); assert.equal(result.resolved_assets,1); const check=new DatabaseSync(dbPath); assert.deepEqual({...check.prepare("SELECT image_hash,mime_type,width_px,height_px,byte_size,asset_status FROM image_asset WHERE provider_file_id='test-unresolved-id'").get()}, {image_hash:'d'.repeat(64),mime_type:'image/png',width_px:11,height_px:12,byte_size:13,asset_status:'available'}); check.close(); } finally { try { rmSync(dir,{recursive:true,force:true,maxRetries:5,retryDelay:200}); } catch {} }
});
