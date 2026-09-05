import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
const repo=path.resolve(import.meta.dirname,'..');
test('P4 HTTP launch loader, Unicode persistence and private routes',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'p4-server-')),launch=path.join(dir,'launch.json');
  const db=path.join(repo,'data/crystal-design.sqlite');
  const hash=()=>createHash('sha256').update(fs.readFileSync(db)).digest('hex');const before=hash();
  const proc=spawn(process.execPath,['workbench/server.mjs'],{cwd:repo,env:{...process.env,WORKBENCH_PORT:'0',WORKBENCH_STATE_DIR:path.join(dir,'state'),WORKBENCH_EXPORT_DIR:path.join(dir,'exports'),WORKBENCH_NATURE_LAUNCH_PATH:launch},stdio:['ignore','pipe','pipe']});
  try{
    const base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('server startup timeout')),15000);proc.stdout.on('data',chunk=>{const match=String(chunk).match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]);}});proc.once('error',reject);proc.once('exit',code=>reject(new Error(`server exit ${code}`)));});
    const req=async(url,options)=>{const r=await fetch(base+url,options);return {status:r.status,body:await r.json()};};
    assert.deepEqual((await req('/api/nature-launch')).body,{available:false,reason:'DESIGN_PACKAGE_NOT_READY'});
    fs.copyFileSync(path.join(repo,'test/fixtures/nature-launch-valid.json'),launch);
    const result=await req('/api/nature-launch');assert.equal(result.body.available,true);assert.equal(result.body.validation.ok,true);assert.equal(result.body.validation.designs.length,18);
    const id=result.body.validation.designs[0].design_id;assert.equal((await req(`/api/nature-launch/${id}`)).body.design_id,id);assert.equal((await req('/api/nature-launch/nonexistent')).status,404);
    for(const name of ['白水晶草稿','海蓝宝草稿']){const draft={name,items:[],braceletState:{layoutMode:'loose',instances:[{instanceId:name,looseX:.2,looseY:.6,materialId:'m',specId:'s',sizeMm:10,sourceStatus:'PROPOSED'}]}};assert.equal((await req('/api/drafts/'+encodeURIComponent(name),{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(draft)})).status,200);assert.deepEqual((await req('/api/drafts/'+encodeURIComponent(name))).body,draft);}
    assert.equal((await req('/api/drafts')).body.drafts.length,2);
    const download=await req('/api/studio-export',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({format:'bom-csv',draft:{name:'test',braceletState:{instances:[{materialId:'m',specId:'s',displayNameZh:'白水晶',sizeMm:8,form:'round',sourceStatus:'PROPOSED'}]}}})});
    assert.equal(download.status,200);const exported=await fetch(base+download.body.downloadUrl);assert.match(exported.headers.get('content-disposition'),/attachment/);assert.match(await exported.text(),/material_id,spec_id,name_zh/);assert.deepEqual(fs.readdirSync(path.join(dir,'exports')),[]);
    assert.equal((await req('/state/private.json')).status,404);assert.equal((await req('/assets/local/orphan.png')).status,404);assert.equal((await req('/exports/private.json')).status,404);
    assert.equal(hash(),before);
  }finally{proc.kill();await new Promise(r=>proc.once('exit',r));fs.rmSync(dir,{recursive:true,force:true});}
});
