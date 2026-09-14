// Narrow diagnostic: reload a previously UI-saved QA draft through the real load control.
import fs from 'node:fs/promises';
import path from 'node:path';
import {withStudioSession} from './qa-studio-session.mjs';
import {layoutStudio} from '../workbench/studio-layout.mjs';
const source=process.argv[2];if(!source)throw Error('Pass an isolated QA draft path; never a user draft.');
const root=process.cwd(),resolved=path.resolve(source),privateRoot=path.resolve(root,'work/dual-mode');if(!resolved.startsWith(privateRoot+path.sep))throw Error('Only isolated QA drafts permitted');
let report;await withStudioSession({root},async({base,browser,info})=>{
 const saved=JSON.parse(await fs.readFile(resolved,'utf8'));await fs.copyFile(resolved,path.join(info.stateDir,path.basename(resolved)));
 const page=await browser.newPage({viewport:{width:1440,height:900}});await page.goto(base);await page.locator('.tree-nav [data-view="desk"]').click();await page.locator('.p4-inspector summary').click();await page.locator('[data-load]').selectOption(saved.name);await page.waitForTimeout(500);await page.locator('.p4-inspector summary').click();
 const draft=await fetch(base+'/api/drafts/'+encodeURIComponent(saved.name)).then(r=>r.json());await page.locator('[data-tray="round"]').click();await page.waitForTimeout(500);const evidence=[];
 for(const viewport of [{width:1603,height:1066},{width:774,height:685},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.waitForTimeout(1000);
  const seen=await page.locator('[data-studio-canvas]').evaluate(e=>({width:e.clientWidth,height:e.clientHeight,points:JSON.parse(e.dataset.instanceGeometry),rect:e.getBoundingClientRect().toJSON()}));
  const expected=layoutStudio({...draft.braceletState,trayMode:'round'},seen.width,seen.height);const offsets=seen.points.map(p=>{const q=expected.points.find(q=>q.instanceId===p.instanceId);return {id:p.instanceId,dx:p.x-q.x,dy:p.y-q.y};});
  const file=path.join(info.directory,`resize-${viewport.width}.png`);await page.screenshot({path:file,fullPage:true});evidence.push({viewport,canvas:{width:seen.width,height:seen.height},maxOffset:Math.max(...offsets.map(p=>Math.hypot(p.dx,p.dy))),first:offsets[0],screenshot:file});
 }
 report={server:info,evidence};await fs.writeFile(path.join(info.directory,'resize-evidence.json'),JSON.stringify(evidence,null,2)+'\n');
});
console.log(JSON.stringify(report,null,2));
