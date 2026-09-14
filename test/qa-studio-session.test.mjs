import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {existsSync} from 'node:fs';
import {withStudioSession} from '../scripts/qa-studio-session.mjs';
const root=path.resolve(import.meta.dirname,'..');
const stopped=pid=>{try{process.kill(pid,0);return false;}catch{return true;}};
test('QA session serves on an OS-assigned port with isolated output and awaits its own child exit',async()=>{
 let info;
 await withStudioSession({root,launchBrowser:false},async session=>{
  info=session.info;assert.ok(info.port>0);assert.notEqual(info.stateDir,path.join(root,'workbench/state'));
  assert.notEqual(info.exportDir,path.join(root,'workbench/exports'));
  assert.equal((await fetch(session.base+'/api/local-assets')).status,200);
 });
 assert.equal(stopped(info.pid),true);assert.equal(info.stopped,true);
});
test('QA setup failure before readiness rejects promptly and reaps its child',async()=>{
 let info;
 await assert.rejects(withStudioSession({root,launchBrowser:false,serverArgs:['-e','process.exit(7)'],onStart:i=>info=i},()=>{}),/exited before readiness/);
 assert.equal(stopped(info.pid),true);assert.equal(info.stopped,true);
});
test('QA timeout reaps a child that never announces readiness',async()=>{
 let info;
 await assert.rejects(withStudioSession({root,launchBrowser:false,timeoutMs:250,serverArgs:['-e','setInterval(()=>{},1000)'],onStart:i=>info=i},()=>{}),/readiness timeout/);
 assert.equal(stopped(info.pid),true);assert.equal(info.stopped,true);
});
test('Browser launch failure still reaps the already-ready server',async()=>{
 let info;
 await assert.rejects(withStudioSession({root,executablePath:path.join(root,'work/absent-chrome.exe'),onStart:i=>info=i},()=>{}),/executable|launch/i);
 assert.equal(stopped(info.pid),true);assert.equal(info.stopped,true);
});
test('An interaction assertion failure closes browser and its own server',{skip:!existsSync(process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe')?'No installed Chrome; set CHROME_PATH for the browser lifecycle case':false},async()=>{
 let info,browser;
 await assert.rejects(withStudioSession({root},async s=>{info=s.info;browser=s.browser;throw Error('interaction failure');}),/interaction failure/);
 assert.equal(browser.isConnected(),false);assert.equal(stopped(info.pid),true);
});
