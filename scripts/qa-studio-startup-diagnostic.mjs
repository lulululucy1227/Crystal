import {execFileSync} from 'node:child_process';
import {withStudioSession} from './qa-studio-session.mjs';
// Diagnostic only: hold the data response to expose pre-ready navigation. Production files are read-only.
const baseline=execFileSync('git',['-c','safe.directory='+process.cwd(),'show','2affeda5761713503ea8029589feb1a41f3510af:workbench/app.js'],{encoding:'utf8'});
const result=await withStudioSession({},async({browser,base})=>{
 const out=[];
 for(const version of ['baseline2affeda','current']){
  const page=await browser.newPage(),errors=[];let release,pending=false,baselineServed=false;const gate=new Promise(r=>release=r);
  page.on('pageerror',e=>errors.push({message:e.message,stack:e.stack,time:new Date().toISOString(),apiDataPending:pending}));
  if(version.startsWith('baseline'))await page.route('**/app.js*',r=>{baselineServed=true;return r.fulfill({contentType:'text/javascript',body:baseline});});
  await page.route('**/api/data',async r=>{pending=true;await gate;pending=false;await r.continue();});
  try{await page.goto(base);await page.waitForFunction(()=>typeof document.querySelector('.tree-nav [data-view="desk"]').onclick==='function');await page.locator('.tree-nav [data-view="desk"]').click();await page.waitForTimeout(100);release();await page.waitForTimeout(800);out.push({version,baselineServed,errors,recovered:await page.locator('[data-plus],#draft-name').count()>0,appText:(await page.locator('#app').innerText()).slice(0,100)});}finally{release();await page.close();}
 }
 return out;
});
console.log(JSON.stringify(result,null,2));
