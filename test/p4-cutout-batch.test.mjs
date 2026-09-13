import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {JSDOM} from 'jsdom';
import {createBraceletState,serializeBraceletState} from '../workbench/bracelet-state.mjs';
import {layoutStudio,settleLoose} from '../workbench/studio-layout.mjs';
const importer=await import('../scripts/import-workbench-cutout-batch.mjs').catch(()=>({}));
const display=await import('../workbench/source-display.mjs').catch(()=>({}));
const hash=b=>createHash('sha256').update(b).digest('hex');
async function fixture(t){
 const rootDir=fs.mkdtempSync(path.join(os.tmpdir(),'cutout-batch-'));t.after(()=>fs.rmSync(rootDir,{recursive:true,force:true}));
 const rgba=Buffer.alloc(100*100*4);for(let y=10;y<70;y++)for(let x=50;x<70;x++){const n=(y*100+x)*4;rgba[n]=90;rgba[n+1]=120;rgba[n+2]=180;rgba[n+3]=255;}
 const png=await sharp(rgba,{raw:{width:100,height:100,channels:4}}).png().toBuffer();fs.writeFileSync(path.join(rootDir,'source.png'),png);
 const entry={source_key:'SRC-IMG_9999',position:'P01',derived_file:'source.png',source_path:'source.png',cutout_file:'source.png',derived_sha256:hash(png),source_sha256:hash(png),cutout_sha256:hash(png),display_name_zh:'未标注',printed_label:null,label_kind:'unresolved',identity_status:'source_label_only',form:'oval_pearl',status:'ready',processing_parameters:{operation:'fixture'},subject_bounds_alpha_gt_127:{left:50,top:10,width:20,height:60,alpha_threshold:127}};
 return {rootDir,entry,png};
}
test('batch importer rejects duplicate source positions and traversal before writes',async t=>{
 assert.equal(typeof importer.importCutoutBatch,'function');const {rootDir,entry}=await fixture(t);
 await assert.rejects(importer.importCutoutBatch({rootDir,entries:[entry,entry]}),/duplicate/i);
 await assert.rejects(importer.importCutoutBatch({rootDir,entries:[{...entry,derived_file:'../outside.png'}]}),/path/i);
 assert.equal(fs.existsSync(path.join(rootDir,'workbench')),false);
});
test('verified padded alpha retains aspect, unresolved identity, provenance and idempotent bytes',async t=>{
 assert.equal(typeof importer.importCutoutBatch,'function');const {rootDir,entry,png}=await fixture(t);
 const result=await importer.importCutoutBatch({rootDir,entries:[entry]});const a=result.assets[0];
 assert.equal(a.display_name_zh,'未标注 · SRC-IMG_9999 P01');assert.equal(a.material_name,null);assert.equal(a.identity_status,'unresolved_source_position');
 assert.equal(a.subject_bounds.width,20);assert.equal(a.subject_bounds.height,60);assert.equal(a.subject_bounds.left,50);
 assert.deepEqual(fs.readFileSync(path.join(rootDir,'workbench/assets/local',a.file)),png);
 const sidecarBytes=fs.readFileSync(path.join(rootDir,'workbench/assets/local',a.file+'.json')),sidecar=JSON.parse(sidecarBytes);assert.match(sidecar.prompt,/SRC-IMG_9999.*P01/);assert.deepEqual(sidecar.processing_parameters,entry.processing_parameters);assert.equal(hash(sidecarBytes),a.transformation_metadata_sha256);assert.equal(a.processing_parameters,undefined);
 const second=await importer.importCutoutBatch({rootDir,entries:[entry]});assert.equal(second.created,0);assert.equal(second.reused,1);
 const state=createBraceletState({layoutMode:'loose',instances:[{materialName:a.display_name_zh,sizeMm:8,subjectBounds:a.subject_bounds,assetKey:a.asset_key,sourceRef:a.source_ref,imageUrl:'/assets/local/'+a.file}]});
 assert.deepEqual(createBraceletState(serializeBraceletState(state)).instances[0].subjectBounds,a.subject_bounds);
 assert.deepEqual(createBraceletState(serializeBraceletState(state)).instances[0].sourceRef,a.source_ref);
});
test('producer hyphenated weak-quality and reference-only inventory remain excluded and counted',async t=>{
 const {rootDir,entry}=await fixture(t);
 const result=await importer.importCutoutBatch({rootDir,entries:[{...entry,status:'weak-quality'},{...entry,position:'P02',status:'reference-only'}]});
 assert.equal(result.weak_quality,1);assert.equal(result.reference_only,1);assert.equal(result.ready,0);
});
test('shared card/canvas resolver prioritizes exact identity then named size-independent source, never generic species inference',()=>{
 assert.equal(typeof display.resolveSourceDisplay,'function');
 const source={asset_key:'source-a',material_id:'source-a',spec_id:'virtual',material_name:'白水晶',label_kind:'printed_material_label',identity_status:'source_label_only',status:'ready',file:'sample.png',representation_class:'source_cutout'};
 for(const size of [6,8])assert.equal(display.resolveSourceDisplay({displayNameZh:'白水晶',materialId:'catalog',specId:`catalog-${size}`},[source]).asset_key,'source-a');
 const exact={...source,asset_key:'exact',material_id:'catalog',spec_id:'catalog-6'};
 assert.equal(display.resolveSourceDisplay({displayNameZh:'白水晶',materialId:'catalog',specId:'catalog-6'},[source,exact]).asset_key,'exact');
 assert.equal(display.resolveSourceDisplay({displayNameZh:'大溪地珍珠'},[{...source,material_name:'黑珍珠'}]),null);
 assert.equal(display.resolveSourceDisplay({displayNameZh:'红兔毛'},[{...source,material_name:'兔毛'}]),null);
 assert.equal(display.resolveSourceDisplay({assetKey:'source-a'},[{...source,status:'weak_quality'}]),null);
 assert.equal(display.resolveSourceDisplay({assetKey:'source-a'},[{...source,file:'../bad.png'}]),null);
});
test('tall nonround footprint prevents loose/linear overlap without changing rendered width or physical BOM size',()=>{
 const instance=n=>({instanceId:String(n),sizeMm:8,materialName:'珍珠',form:'irregular',subjectBounds:{left:106,top:34,width:299,height:444},looseX:.5,looseY:.5,rotationDeg:90});
 for(const trayMode of ['round','linear']){
 const state=createBraceletState({trayMode,layoutMode:'loose',instances:[instance(1),instance(2)]});const p=layoutStudio(state,900,560);
 assert.ok(p.points[0].collisionDiameter>p.points[0].diameter*1.48);
 const settled=settleLoose(p.points,'1',p.points[0],p);assert.ok(Math.hypot(settled[0].x-settled[1].x,settled[0].y-settled[1].y)>=p.points[0].collisionDiameter-.1);
 const compact=layoutStudio({...state,layoutMode:'bracelet',instances:[1,2,3,4].map(instance)},900,560);
 for(const q of compact.points)assert.equal(q.diameter,8*compact.scale);
 assert.equal(state.usedCircumferenceMm,16);
 }
});
test('3405 P02 P03 P04 body measurements stay collision safe after mixed size and rotation edits',()=>{
 const shapes=[{width:316,height:443},{width:299,height:444},{width:350,height:444}];
 for(const trayMode of ['round','linear'])for(const rotationDeg of [0,45,90,195]){
  const instances=shapes.flatMap((subjectBounds,n)=>[6,8,12].map(sizeMm=>({instanceId:`${n}-${sizeMm}`,materialName:'珍珠',form:'irregular',sizeMm,rotationDeg,subjectBounds:{left:34,top:34,...subjectBounds}})));
  const state=createBraceletState({trayMode,layoutMode:'bracelet',instances});const p=layoutStudio(state,900,560);
  for(let a=0;a<p.points.length;a++)for(let b=a+1;b<p.points.length;b++){
   const x=p.points[a],y=p.points[b];assert.ok(Math.hypot(x.x-y.x,x.y-y.y)>=(x.collisionDiameter+y.collisionDiameter)/2-.02);
  }
  assert.equal(state.usedCircumferenceMm,78);
 }
});
test('Studio Chinese source sample search, card override and placement retain independent identity at edited virtual size',async t=>{
 const dom=new JSDOM('<main></main>');t.after(()=>dom.window.close());const host=dom.window.document.querySelector('main');
 const asset={asset_key:'SRC-IMG_9999__P01',display_name_zh:'白水晶 · SRC-IMG_9999 P01',material_name:'白水晶',label_kind:'printed_material_label',identity_status:'source_label_only',status:'ready',file:'sample.png',material_id:'source-a',spec_id:'virtual',representation_class:'source_cutout',form:'round_visual_bead',source_ref:{source_key:'SRC-IMG_9999',position:'P01'},subject_bounds:{left:50,top:10,width:20,height:60}};
 const oldFetch=globalThis.fetch;t.after(()=>globalThis.fetch=oldFetch);globalThis.fetch=async url=>({ok:true,json:async()=>url==='/api/local-assets'?{assets:[asset]}:url==='/api/drafts'?{drafts:[]}:{available:false}});
 const file=new URL('../workbench/studio-view.mjs',import.meta.url),canvas=`data:text/javascript;base64,${Buffer.from('export function createBraceletCanvas(){return {render(){},dispose(){}}}').toString('base64')}`;
 const source=fs.readFileSync(file,'utf8').replace("import('./bracelet-canvas.mjs')",`import(${JSON.stringify(canvas)})`).replace(/from '\.\/([^']+)'/g,(_,name)=>`from '${new URL(name,file).href}'`);
 const {renderStudio}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);let draft;
 const controller=renderStudio({host,materials:[{name:'Quartz',zhName:'白水晶',category:'crystal'}],resolveMaterial:()=>({sizeMm:8,atlas:{url:'/generated.png'}}),onDraft:d=>draft=d});t.after(()=>controller.dispose());await controller.ready;
 assert.equal(host.querySelector('.p4-thumb img')?.getAttribute('src'),'/assets/local/sample.png');
 const size=host.querySelector('[data-size]');size.value='6';size.dispatchEvent(new dom.window.Event('input'));host.querySelector('[data-plus]').click();
 assert.equal(draft.braceletState.instances[0].sizeMm,6);assert.equal(draft.braceletState.instances[0].assetKey,asset.asset_key);assert.deepEqual(draft.braceletState.instances[0].sourceRef,asset.source_ref);
 host.querySelector('[data-tab="local"]').click();assert.equal(host.querySelectorAll('.p4-material').length,1);
 const search=host.querySelector('[data-studio-search]');search.value='白水晶';search.dispatchEvent(new dom.window.Event('input'));host.querySelector('[data-plus]').click();
 assert.equal(draft.braceletState.instances[1].materialId,'source-a');assert.equal(draft.braceletState.instances[1].identityStatus,'source_label_only');
 assert.match(host.textContent,/虚拟/);
});
