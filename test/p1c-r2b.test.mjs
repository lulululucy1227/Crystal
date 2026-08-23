import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { initialize, validate } from '../scripts/crystal-db.mjs';
import { backfillP1cR1ImageAssets } from '../scripts/backfill-p1c-r1-image-assets.mjs';

function withDb(fn) { const dir=mkdtempSync(join(process.cwd(),'test','.tmp-crystal-p1cr2b-')); const path=join(dir,'test.sqlite'); try { initialize(path); fn(path,dir); } finally { try { rmSync(dir,{recursive:true,force:true,maxRetries:5,retryDelay:200}); } catch {} } }

test('P1C-R2B backfills only user-supplied provider identities and preserves order', () => withDb((path, dir) => {
  const db=new DatabaseSync(path); const refs=[];
  for (const [seed,key] of [['H01','REF-100001'],['H05','REF-100002']]) { const source=db.prepare('INSERT INTO source(source_type,name,notes) VALUES (?,?,?)').run('user_upload',`fixture ${seed}`,`external_seed_key=${seed}`).lastInsertRowid; db.prepare("INSERT INTO design_reference(reference_type,source_id,reference_key,record_status,evidence_status,notes) VALUES ('uploaded_image',? ,?,'real','user_supplied','fixture')").run(source,key); refs.push({seed_id:seed,system_reference_key:key,assets:seed==='H01'?[{filename:'a.png',provider:'google_drive',provider_file_id:'drive-a'},{filename:'b.png',provider:'google_drive',provider_file_id:'drive-b'}]:[{filename:'c.png',provider:'google_drive',provider_file_id:'drive-c'}]}); }
  // Add the remaining valid scope members as zero-asset mappings only to prove strict identity validation is not silently relaxed.
  for (const [index, seed] of ['H06','H07','H08','H09','H10','H11','H12','H14','H15','H16','H17','H18','H19'].entries()) { const key=`REF-2000${index}`; const source=db.prepare('INSERT INTO source(source_type,name,notes) VALUES (?,?,?)').run('user_upload',`fixture ${seed}`,`external_seed_key=${seed}`).lastInsertRowid; db.prepare("INSERT INTO design_reference(reference_type,source_id,reference_key,record_status,evidence_status,notes) VALUES ('uploaded_image',? ,?,'real','user_supplied','fixture')").run(source,key); refs.push({seed_id:seed,system_reference_key:key,assets:[]}); }
  db.close(); const manifest=join(dir,'manifest.json'); writeFileSync(manifest,JSON.stringify(refs));
  assert.deepEqual(backfillP1cR1ImageAssets(path,manifest),{assetsCreated:3,assetsReused:0,linksCreated:3,linksReused:0,fakePaths:0,hashesCalculated:0});
  assert.deepEqual(backfillP1cR1ImageAssets(path,manifest),{assetsCreated:0,assetsReused:3,linksCreated:0,linksReused:3,fakePaths:0,hashesCalculated:0});
  const check=new DatabaseSync(path); assert.deepEqual(check.prepare("SELECT display_order FROM design_reference_image i JOIN design_reference d ON d.id=i.design_reference_id WHERE d.reference_key='REF-100001' ORDER BY display_order").all().map(x=>x.display_order),[0,1]); assert.equal(check.prepare("SELECT COUNT(*) AS n FROM image_asset WHERE asset_status='unresolved' AND image_hash IS NULL").get().n,3); assert.equal(check.prepare('SELECT COUNT(*) AS n FROM design_reference WHERE local_image_path IS NOT NULL OR source_url IS NOT NULL').get().n,1); check.close(); assert.deepEqual(validate(path),[]);
}));
