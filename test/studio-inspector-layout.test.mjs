import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {withStudioSession} from '../scripts/qa-studio-session.mjs';

// Real browser layout using the declared playwright-core dependency through the
// shared own-process lifecycle. No private source images or draft are required.
const repo=path.resolve(import.meta.dirname,'..');
const chrome=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
test('opened synthetic layout inspector remains before BOM with scrollable settings and an operable tray',{skip:!fs.existsSync(chrome)?'No installed Chrome; set CHROME_PATH for the browser layout case':false},async t=>{
 await withStudioSession({root:repo,executablePath:chrome,timeoutMs:15000},async({base,browser,info})=>{
 const draft={name:'QA-inspector-synthetic_layout_fixture',fixture_type:'synthetic_layout_fixture',items:[],braceletState:{layoutMode:'bracelet',trayMode:'linear',selectedInstanceId:'fixture-13',instances:Array.from({length:100},(_,n)=>({instanceId:`fixture-${n}`,materialName:'synthetic_layout_fixture',materialId:'synthetic-layout-material',specId:'synthetic-10mm',displayNameZh:'布局测试样本 · 非实物 · 合成位置示例',form:'irregular',sizeMm:10,sourceStatus:'PROPOSED',provenanceClass:'fallback',sourceRef:{kind:'synthetic_layout_fixture',position:n+1}}))}};
 fs.mkdirSync(info.stateDir,{recursive:true});fs.writeFileSync(path.join(info.stateDir,draft.name+'.json'),JSON.stringify(draft));
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 page.setDefaultTimeout(15000);
 // Make the layout independent of whether this checkout has imported images.
 // Draft loading, rendering, CSS layout and all interactions remain real.
 await page.route('**/api/local-assets',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({assets:[]})}));
 await page.goto(base);await page.locator('.tree-nav [data-view="desk"]').click();await page.locator('[data-plus]').first().waitFor();
 await page.locator('.p4-inspector summary').click();await page.locator('.p4-settings summary').click();await page.locator('[data-load]').selectOption(draft.name);
 await page.waitForFunction(()=>JSON.parse(document.querySelector('[data-studio-canvas]').dataset.instanceGeometry||'[]').length===100);
 const dimensions=()=>page.evaluate(()=>{const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width,height:r.height};};const inspector=box('.p4-inspector'),panel=box('.p4-inspector-panel');if(getComputedStyle(document.querySelector('.p4-inspector-panel')).overflowY==='auto')inspector.bottom=Math.min(inspector.bottom,panel.bottom);return {workspace:box('.p4-workspace'),editor:box('.p4-editor'),inspector,bom:box('.p4-bom'),tray:box('.p4-tray-stage'),documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth};});
 // Graphite moves the inspector into its own column. Keep the observable
 // non-overlap and operability regression; the discarded two-column mutation
 // is no longer an applicable reproduction of this layout.
 const results=[];
 for(const viewport of [{width:1440,height:900},{width:1280,height:900},{width:1603,height:900},{width:900,height:800},{width:640,height:900},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.waitForTimeout(150);await page.evaluate(()=>scrollTo(0,0));
  const boxes=await dimensions();results.push({viewport,...boxes});
  assert.ok(boxes.inspector.bottom<=boxes.bom.top,`${viewport.width}px inspector/BOM overlap: ${JSON.stringify(boxes)}`);
  assert.ok(boxes.editor.bottom<=boxes.bom.top,`${viewport.width}px editor exceeds next section`);
  assert.ok(boxes.tray.width>=250&&boxes.tray.height>=240,`${viewport.width}px tray collapsed`);
  assert.ok(boxes.documentWidth<=boxes.viewportWidth,`${viewport.width}px horizontal page overflow`);
  // Playwright must actually scroll the existing inspector and click its controls;
  // controls may not be hidden/clipped to satisfy the geometry assertion.
  await page.locator('[data-theme]').selectOption('Ocean');
  const notes=page.locator('[data-notes]');await notes.click();await notes.fill(`Inspector reachable at ${viewport.width}px`);
  assert.equal(await page.locator('[data-theme]').inputValue(),'Ocean');assert.equal(await notes.inputValue(),`Inspector reachable at ${viewport.width}px`);
  await page.locator('[data-tray="round"]').click();await page.locator('[data-tray="linear"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-studio-canvas]').dataset.trayMode==='linear');
  assert.equal(await page.locator('.p4-inspector').getAttribute('open'),'');
  if(process.env.WORKBENCH_INSPECTOR_EVIDENCE_DIR){const out=path.resolve(process.env.WORKBENCH_INSPECTOR_EVIDENCE_DIR);assert.ok(out.startsWith(path.join(repo,'work')+path.sep));fs.mkdirSync(out,{recursive:true});await page.evaluate(()=>scrollTo(0,0));const file=path.join(out,`inspector-${viewport.width}.png`);await page.screenshot({path:file,fullPage:true});fs.writeFileSync(file+'.json',JSON.stringify({prompt:`Local layout regression screenshot, not a product photograph. Origin: test/studio-inspector-layout.test.mjs synthetic_layout_fixture, a self-contained 100-instance technical-shape draft with no private source PNG. Screenshot records inspector scrolling and BOM separation at ${viewport.width}px.`},null,2));}
 }
 t.diagnostic(JSON.stringify(results));
 });
});
