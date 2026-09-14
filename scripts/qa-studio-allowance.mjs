import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {withStudioSession} from './qa-studio-session.mjs';

// A served-response mutation is a negative control only; never edits production bytes or injects design state.
export async function verifyAllowanceOnly({browser,base,root=process.cwd(),mutateCache=false}){
 const cases=[];
 for(const section of ['all','front','back']){
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  if(mutateCache){const original=await fs.readFile(path.join(root,'workbench/bracelet-canvas.mjs'),'utf8');assert.ok(original.includes('nextState.wristCm,nextState.allowanceMm,nextState.instances'));await page.route('**/bracelet-canvas.mjs',route=>route.fulfill({contentType:'text/javascript',body:original.replace('nextState.wristCm,nextState.allowanceMm,nextState.instances','nextState.wristCm,nextState.instances')}));}
  try{
   await page.goto(base);await page.locator('#catalogue-grid .material-card').first().waitFor();
   // Observe the real Fabric canvas while forwarding the original add operation unchanged.
   await page.evaluate(async()=>{const {Canvas}=await import('/vendor/fabric/index.min.mjs');const add=Canvas.prototype.add;Canvas.prototype.add=function(...objects){window.__qaAllowanceCanvas=this;return add.apply(this,objects);};});
   await page.locator('.tree-nav [data-view="desk"]').click();await page.locator('[data-plus]').first().waitFor();
   await page.locator('[data-name]').fill('QA-allowance-'+section);await page.locator('[data-tab="local"]').click();await page.locator('[data-studio-search]').fill('SRC-IMG_3385');
   const card=page.locator('[data-material="SRC-IMG_3385__P01"]');await card.locator('[data-size]').fill('8');for(let n=0;n<27;n++)await card.locator('[data-plus]').click();
   await page.waitForFunction(()=>JSON.parse(document.querySelector('[data-studio-canvas]').dataset.instanceGeometry||'[]').length===27);
   await page.locator('[data-tray="linear"]').click();await page.locator('[data-action="bracelet"]').click();await page.locator('[data-confirm-order]').click();await page.locator(`[data-section="${section}"]`).click();await page.waitForTimeout(500);
   const save=async()=>{const p=page.waitForResponse(r=>r.request().method()==='PUT'&&r.url().includes('/api/drafts/'));await page.locator('[data-action="save"]').click();assert.equal((await p).status(),200);return (await fetch(base+'/api/drafts/QA-allowance-'+section).then(r=>r.json())).braceletState;};
   const initial=await save();assert.equal(initial.wristCm,17);assert.equal(initial.wrapCount,1);assert.equal(initial.allowanceMm,5);assert.equal(initial.instances.length,27);assert.ok(initial.instances.every(i=>i.sizeMm===8&&i.assetKey==='SRC-IMG_3385__P01'&&i.imageUrl));const ids=initial.instances.map(i=>i.instanceId),stages=[];
   const verify=async(allowance,rows)=>{
    await page.waitForTimeout(500);const state=await save();assert.equal(state.allowanceMm,allowance);assert.deepEqual(state.instances,initial.instances);
    const observed=await page.evaluate(()=>{const canvas=window.__qaAllowanceCanvas;return {objects:canvas.getObjects().filter(o=>o.data?.instanceId).map(o=>({id:o.data.instanceId,x:o.left,y:o.top,visible:o.visible,evented:o.evented,selectable:o.selectable})),labels:canvas.getObjects().filter(o=>o.fontSize===11&&o.visible!==false).map(o=>o.text)};});
    assert.equal(observed.objects.length,27);assert.equal(new Set(observed.objects.map(o=>o.y.toFixed(3))).size,rows,'Allowance-only must update actual rendered row count');
    // Hand-checked equal-size continuous groups: 5mm -> 7/7/6/7; 30mm -> 14/13.
    const front=allowance===5?[...ids.slice(0,7),...ids.slice(14,20)]:ids.slice(0,14),expected=section==='all'?ids:section==='front'?front:ids.filter(id=>!front.includes(id));
    for(const flag of ['visible','evented','selectable'])assert.deepEqual(observed.objects.filter(o=>o[flag]).map(o=>o.id),expected,`${section} ${flag} at allowance ${allowance}`);
    assert.equal(observed.labels.length,section==='all'?rows:rows/2);
    const visible=observed.objects.find(o=>o.id===expected[1]),hidden=observed.objects.find(o=>!expected.includes(o.id)),box=await page.locator('[data-studio-canvas]').boundingBox();
    await page.mouse.click(box.x+visible.x,box.y+visible.y);assert.equal((await save()).selectedInstanceId,visible.id,'Real pointer selects the displayed bead');
    if(hidden){await page.mouse.click(box.x+hidden.x,box.y+hidden.y);assert.equal((await save()).selectedInstanceId,visible.id,'Filtered hidden bead cannot become the pointer selection');}
    stages.push({allowance,rows,visibleIds:expected,guideLabels:observed.labels,pointerVisible:visible.id,pointerHiddenRejected:hidden?.id||null});
   };
   await verify(5,4);await page.locator('[data-allowance]').fill('30');await page.locator('[data-allowance]').press('Tab');await verify(30,2);await page.locator('[data-action="undo"]').click();await verify(5,4);await page.locator('[data-action="redo"]').click();await verify(30,2);assert.deepEqual(errors,[]);cases.push({section,status:'PASS',stages});
  }finally{await page.close();}
 }
 return {status:'PASS',fixture:'27 UI-added actual SRC-IMG_3385__P01 sources, each8mm; linear/strung/single/wrist17; allowance-only5→30→undo→redo with each filter unchanged',cases};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){console.log(JSON.stringify(await withStudioSession({},s=>verifyAllowanceOnly({...s,mutateCache:process.argv.includes('--mutate-cache')})),null,2));}
