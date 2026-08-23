import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { initialize, validate } from '../scripts/crystal-db.mjs';

function withDb(fn) { const dir=mkdtempSync(join(process.cwd(),'test','.tmp-crystal-p1cr2a-')); const path=join(dir,'test.sqlite'); try { initialize(path); fn(path); } finally { try { rmSync(dir,{recursive:true,force:true,maxRetries:5,retryDelay:200}); } catch {} } }

test('P1C-R2A separates reusable image assets from reference semantics', () => withDb(path => {
  const db=new DatabaseSync(path); const first=db.prepare('SELECT id,reference_key FROM design_reference LIMIT 1').get();
  const second=db.prepare("INSERT INTO design_reference(reference_type,record_status,evidence_status,notes) VALUES ('other','test_fixture','unknown','asset relation fixture')").run().lastInsertRowid;
  const assetA=db.prepare("INSERT INTO image_asset(asset_key,provider,provider_file_id,original_filename,mime_type,width_px,height_px,byte_size,image_hash) VALUES (?,?,?,?,?,?,?,?,?)").run('ASSET-FIXTURE-A','google_drive','file-1','same-name.png','image/png',100,200,123,'hash-a').lastInsertRowid;
  const assetB=db.prepare("INSERT INTO image_asset(asset_key,provider,provider_file_id,original_filename,image_hash) VALUES (?,?,?,?,?)").run('ASSET-FIXTURE-B','local','local-1','same-name.png','hash-a').lastInsertRowid;
  assert.throws(() => db.prepare("INSERT INTO image_asset(asset_key,provider,provider_file_id,original_filename) VALUES (?,?,?,?)").run('ASSET-DUP','google_drive','file-1','other.png'));
  assert.doesNotThrow(() => db.prepare("INSERT INTO image_asset(asset_key,provider,provider_file_id,original_filename) VALUES (?,?,?,?)").run('ASSET-SAME-NAME','chat_upload','upload-1','same-name.png'));
  db.prepare("INSERT INTO design_reference_image(design_reference_id,image_asset_id,display_order,image_role) VALUES (?,?,?,?)").run(first.id,assetA,0,'overall');
  db.prepare("INSERT INTO design_reference_image(design_reference_id,image_asset_id,display_order,image_role) VALUES (?,?,?,?)").run(first.id,assetB,1,'detail');
  db.prepare("INSERT INTO design_reference_image(design_reference_id,image_asset_id,display_order,image_role) VALUES (?,?,?,?)").run(second,assetA,0,'promotional');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM design_reference_image WHERE design_reference_id=?').get(first.id).n,2);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM design_reference_image WHERE image_asset_id=?').get(assetA).n,2);
  assert.deepEqual(db.prepare('SELECT display_order FROM design_reference_image WHERE design_reference_id=? ORDER BY display_order').all(first.id).map(x=>x.display_order),[0,1]);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM image_asset_duplicate_candidate WHERE duplicate_level='hard_image_hash'").get().n,1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM image_asset WHERE image_hash IS NULL').get().n,1);
  assert.throws(() => db.prepare('INSERT INTO image_asset(asset_key,provider,original_filename,theme) VALUES (?,?,?,?)').run('BAD','other','bad.png','Ocean'));
  assert.equal(db.prepare('SELECT reference_key FROM design_reference WHERE id=?').get(first.id).reference_key,first.reference_key);
  db.close(); assert.deepEqual(validate(path),[]);
}));

test('006 upgrades an existing 001-005 database without changing prior reference identity', () => {
  const dir=mkdtempSync(join(process.cwd(),'test','.tmp-crystal-p1cr2a-upgrade-')); const path=join(dir,'existing.sqlite');
  try {
    const db=new DatabaseSync(path);
    for (const file of ['001_initial.sql','002_p1a_staging.sql','003_p1a_field_audit.sql','004_p1c_reference_relationships.sql','005_p1c_design_principle.sql']) db.exec(readFileSync(join(process.cwd(),'migrations',file),'utf8'));
    for (const version of ['001_initial','002_p1a_staging','003_p1a_field_audit','004_p1c_reference_relationships','005_p1c_design_principle']) db.prepare('INSERT INTO schema_migration(version) VALUES (?)').run(version);
    const ref=db.prepare("INSERT INTO design_reference(reference_type,reference_key,record_status,evidence_status,notes) VALUES ('other','REF-090000','real','user_supplied','R1-compatible historical identity')").run().lastInsertRowid; db.close();
    initialize(path); const upgraded=new DatabaseSync(path);
    assert.equal(upgraded.prepare("SELECT COUNT(*) AS n FROM schema_migration WHERE version='006_p1c_image_assets'").get().n,1);
    assert.equal(upgraded.prepare('SELECT reference_key FROM design_reference WHERE id=?').get(ref).reference_key,'REF-090000');
    assert.equal(upgraded.prepare('SELECT COUNT(*) AS n FROM image_asset').get().n,0); upgraded.close();
  } finally { try { rmSync(dir,{recursive:true,force:true,maxRetries:5,retryDelay:200}); } catch {} }
});
