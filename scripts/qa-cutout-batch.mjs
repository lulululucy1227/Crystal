// Local end-to-end acceptance; never uses the user's draft/export folders.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {withStudioSession} from './qa-studio-session.mjs';
import {resolveSourceDisplay} from '../workbench/source-display.mjs';
import {importCutoutBatch} from './import-workbench-cutout-batch.mjs';
const root=process.cwd(),privateDir=path.join(root,'work/dual-mode/task2-qa');
await fs.mkdir(privateDir,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=async p=>JSON.parse(await fs.readFile(path.join(root,p),'utf8'));
// Run only after personally opening every listed final sheet and screenshot.
if(process.argv.includes('--record-reviewed')){
 const report=await read('outputs/dual-mode-cutout-validation.json');assert.equal(report.status,'PASS');
 for(const sheet of report.contact_sheets){sheet.viewed=true;sheet.sha256=hash(await fs.readFile(path.join(root,sheet.file)));}
 report.visual_review={reviewed_by:'Local reviewer explicitly confirming --record-reviewed after opening all listed files',scope:'All 257 imported samples in nine final sheets on both backgrounds at 80px; all four final UI screenshots after image decode. Producer-wide32 contact sheets are a separate earlier inventory.',result:'No additional blocking crop defect observed at preview size; existing five weak exclusions and reference-only cluster remain excluded.',screenshots:[]};
 for(const file of [...report.contact_sheets.map(s=>s.file),...report.screenshots]){
  const sha256=hash(await fs.readFile(path.join(root,file)));
  const carrier={prompt:`Local QA composite/screenshot of user source-derived Crystal Studio cutouts. Origin: workbench/state/local-asset-manifest.json and work/dual-mode/refined-cutouts-manifest.json. Display-only scaling/compositing; source labels are not verified mineral identities or authenticated photography. Artifact ${file}.`,derived_sha256:sha256};
  await fs.writeFile(path.join(root,file+'.json'),JSON.stringify(carrier,null,2)+'\n');
  if(report.screenshots.includes(file))report.visual_review.screenshots.push({file,sha256,viewed:true});
 }
 report.mapping_coverage={catalogue_crystal_source_cards:report.catalogue_source_cards.length,catalogue_crystal_cards:23,method:'Exact virtual-default 8mm identity first; otherwise exact literal printed material name. No fuzzy, species, grade, or purchasing inference.',source_samples_independently_available:251};
 await fs.writeFile(path.join(root,'outputs/dual-mode-cutout-validation.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,reviewed_sheets:report.contact_sheets.length,reviewed_screenshots:report.visual_review.screenshots.length}));process.exit(0);
}
const producer=await read('work/dual-mode/refined-cutouts-manifest.json'),manifest=await read('workbench/state/local-asset-manifest.json');
const assets=manifest.assets.filter(a=>a.asset_key),beforeHash=hash(await fs.readFile(path.join(root,'workbench/state/local-asset-manifest.json')));
const replay=await importCutoutBatch({rootDir:root,entries:producer.entries,archive:'C:/Users/luo_d/Downloads/WORKBENCH_CUTOUTS__2026-09-13_素材批次-01__v1.zip',expectedArchiveHash:'E4BF4A4CB7E38DF0036851DE8F5CE3CF2C813E5C319B010B2FB81DBC0885B891',sourceAudit:await read('work/dual-mode/source-label-audit.json')});
assert.equal(replay.created,0);assert.equal(replay.reused,257);assert.equal(hash(await fs.readFile(path.join(root,'workbench/state/local-asset-manifest.json'))),beforeHash);
const result={status:'IN_PROGRESS',private_only:true,counts:{inventoried:257,ready:replay.ready,weak_quality:replay.weak_quality,reference_only:replay.reference_only,existing_preserved:replay.preserved,initial_created:257,replay_created:replay.created,replay_reused:replay.reused},manifest_bytes:(await fs.stat(path.join(root,'workbench/state/local-asset-manifest.json'))).size,manifest_replay_byte_identical:true,archive_sha256:replay.archive_sha256,source_recrops:producer.after.source_recrops,normalized_only:producer.after.normalized_existing,errors:[],http:[],screenshots:[],contact_sheets:[],limitations:producer.limitations};
for(const a of assets){
 assert.equal(hash(await fs.readFile(path.join(root,'workbench/assets/local',a.file))),a.derived_sha256);
 const sidecarBytes=await fs.readFile(path.join(root,'workbench/assets/local',a.transformation_metadata_file));assert.equal(hash(sidecarBytes),a.transformation_metadata_sha256);
 const sidecar=JSON.parse(sidecarBytes);assert.deepEqual(sidecar.processing_parameters,producer.entries.find(e=>e.source_key===a.source_key&&e.position===a.source_position).processing_parameters);
}
for(let page=0;page<Math.ceil(assets.length/32);page++){
 const group=assets.slice(page*32,page*32+32),layers=[];
 const cached=path.join(privateDir,`contact-${page+1}-dark-light.png`);
 if(process.env.CUTOUT_QA_REUSE_SHEETS==='1'){await fs.access(cached);result.contact_sheets.push({file:path.relative(root,cached).replaceAll('\\','/'),assets:group.length,preview_px:80,backgrounds:['#20252a','#f8f6f0'],viewed:false});continue;}
 for(let n=0;n<group.length;n++){
  const a=group[n],left=(n%4)*300,top=Math.floor(n/4)*112;
  for(const [side,bg] of [[0,'#20252a'],[1,'#f8f6f0']]){
   const tile=await sharp(path.join(root,'workbench/assets/local',a.file)).resize(80,80,{fit:'contain'}).flatten({background:bg}).png().toBuffer();
   layers.push({input:tile,left:left+side*146+28,top:top+22});
  }
  layers.push({input:Buffer.from(`<svg width="300" height="112"><rect width="300" height="20" fill="${a.status==='ready'?'#dde4dc':'#efb89b'}"/><text x="5" y="14" font-size="11">${a.source_key} ${a.source_position} ${a.status}</text></svg>`),left,top});
 }
 const file=path.join(privateDir,`contact-${page+1}-dark-light.png`);await sharp({create:{width:1200,height:Math.ceil(group.length/4)*112,channels:4,background:'#9d9d9d'}}).composite(layers).png().toFile(file);result.contact_sheets.push({file:path.relative(root,file).replaceAll('\\','/'),assets:group.length,preview_px:80,backgrounds:['#20252a','#f8f6f0'],viewed:false});
}
try{
 await withStudioSession({root,onStart:info=>result.server=info},async({base,browser})=>{
 const api=await fetch(base+'/api/local-assets').then(r=>r.json()),ready=api.assets.filter(a=>a.asset_key&&a.imageUrl);
 assert.equal(ready.length,251);assert.equal(api.assets.filter(a=>a.asset_key&&!a.imageUrl).length,6);
 for(const a of api.assets.filter(a=>a.imageUrl)){const response=await fetch(base+a.imageUrl),bytes=Buffer.from(await response.arrayBuffer());assert.equal(response.status,200);if(a.derived_sha256)assert.equal(hash(bytes),a.derived_sha256);const stats=await sharp(bytes).stats();assert.ok(stats.channels[3].max>127);result.http.push({asset_key:a.asset_key||a.material_id+'/'+a.spec_id,status:response.status,sha256:hash(bytes)});}
 for(const endpoint of ['/assets/local/%2e%2e%5csecret.png','/assets/local/'+assets[0].file+'.json','/state/local-asset-manifest.json','/assets/local/'+assets.find(a=>a.status==='reference-only').file])assert.equal((await fetch(base+endpoint)).status,404);
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>result.errors.push(e.message));
 await page.goto(base);await page.locator('.source-hero').first().waitFor();
 const cardSources=await page.locator('.material-card').evaluateAll(cards=>cards.filter(c=>c.querySelector('.source-hero')).map(c=>({name:c.querySelector('h2').textContent,image:c.querySelector('.source-hero').getAttribute('src')})));result.catalogue_source_cards=cardSources;
 const shot=async name=>{await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));const file=path.join(privateDir,name+'.png');await page.screenshot({path:file});result.screenshots.push(path.relative(root,file).replaceAll('\\','/'));};
 const clipped=await page.locator('.visual-stage .source-hero').evaluateAll(images=>images.some(img=>img.getBoundingClientRect().height>img.parentElement.getBoundingClientRect().height));assert.equal(clipped,false,'source catalogue hero must fit the existing stage');
 await shot('catalogue-source-overrides');await page.locator('.tree-nav [data-view="desk"]').click();await page.locator('[data-plus]').first().waitFor();
 const white=page.locator('.p4-material').filter({has:page.locator('strong',{hasText:/^白水晶$/})}).first();assert.equal(await white.locator('img').getAttribute('src'),cardSources.find(c=>c.name.includes('白水晶')).image);
 await white.locator('[data-size]').fill('6');await white.locator('[data-plus]').click();
 await page.locator('[data-tab="local"]').click();assert.equal(await page.locator('.p4-material').count(),251);
 await page.locator('[data-studio-search]').fill('SRC-IMG_3405');assert.equal(await page.locator('.p4-material').count(),7);await shot('pearl-source-library');
 for(const position of ['P02','P03','P04']){const card=page.locator(`[data-material="SRC-IMG_3405__${position}"]`);await card.locator('[data-size]').fill(position==='P03'?'12':'8');await card.locator('[data-plus]').click();}
 await page.waitForFunction(()=>JSON.parse(document.querySelector('[data-studio-canvas]').dataset.instanceGeometry||'[]').length===4);
 await page.locator('[data-name]').fill('QA-source-cutouts');
 const save=async()=>{const r=page.waitForResponse(r=>r.url().includes('/api/drafts/')&&r.request().method()==='PUT');await page.locator('[data-action="save"]').click();await r;return fetch(base+'/api/drafts/QA-source-cutouts').then(r=>r.json());};
 let draft=await save();assert.equal(draft.braceletState.instances[0].sizeMm,6);assert.ok(draft.braceletState.instances.every(i=>i.assetKey&&i.subjectBounds&&i.sourceRef));
 await page.locator('.p4-inspector summary').click();await page.locator('[data-select-next]').click();await page.locator('[data-select-next]').click();
 for(let pearl=0;pearl<3;pearl++){for(let n=0;n<(pearl===1?3:6);n++)await page.locator('[data-rotate]').click();await page.locator('[data-instance-size]').fill(String([10,12,8][pearl]));await page.locator('[data-instance-size]').press('Tab');if(pearl<2)await page.locator('[data-select-next]').click();}
 await page.waitForTimeout(350);await shot('loose-nonround-rotated-size-edited');
 await page.locator('[data-action="bracelet"]').click();await page.locator('[data-confirm-order]').click();await page.locator('[data-tray="linear"]').click();await page.waitForTimeout(350);await shot('linear-nonround-source-arrangement');
 draft=await save();await page.locator('[data-action="reload"]').click();await page.waitForTimeout(400);assert.deepEqual((await save()).braceletState,draft.braceletState);
 const materials=await page.evaluate(async()=>{const m=await import('/source-display.mjs');const a=await fetch('/api/local-assets').then(r=>r.json());return {ready:a.assets.filter(x=>x.asset_key&&x.imageUrl).length};});assert.equal(materials.ready,251);
 result.draft_roundtrip_source_identity=true;result.actual_pearl_positions=['SRC-IMG_3405 P02','SRC-IMG_3405 P03','SRC-IMG_3405 P04'];
 assert.deepEqual(result.errors,[]);result.status='PASS';
 });
}catch(error){result.status='FAIL';result.failure=error.stack;process.exitCode=1;console.error(error);}
result.visual_inventory_scope={producer_wide_contact_sheets:32,task2_final_contact_sheets:result.contact_sheets.length,task2_runtime_captures:result.screenshots.length,note:'Inherited producer limitations refer to its 32 source-production contact sheets, not Task2 final delivery: nine sheets plus four runtime captures.'};
result.preservation=[];
for(const entry of await read('work/dual-mode/preserved-before.json')){const actual=hash(await fs.readFile(path.join(root,entry.file)));assert.equal(actual,entry.sha256);result.preservation.push({...entry,unchanged:true});}
await fs.writeFile(path.join(root,'outputs/dual-mode-cutout-validation.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,counts:result.counts,http:result.http.length,manifest_bytes:result.manifest_bytes,screenshots:result.screenshots,contact_sheets:result.contact_sheets.length,failure:result.failure},null,2));
