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
  const proc=spawn(process.execPath,['workbench/server.mjs'],{cwd:repo,env:{...process.env,WORKBENCH_PORT:'0',WORKBENCH_STATE_DIR:path.join(dir,'state'),WORKBENCH_EXPORT_DIR:path.join(dir,'exports'),WORKBENCH_NATURE_LAUNCH_PATH:launch,WORKBENCH_SELECTION_PATH:path.join(dir,'selection-missing.json')},stdio:['ignore','pipe','pipe']});
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

test('P4 HTTP selection maps only exact formal identity pairs and distinguishes missing from invalid',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'p4-selection-http-'));
  const selectionPath=path.join(dir,'selection.json'),launchPath=path.join(dir,'launch.json');
  const pkg=JSON.parse(fs.readFileSync(path.join(repo,'test/fixtures/nature-launch-valid.json'),'utf8'));
  fs.writeFileSync(launchPath,JSON.stringify(pkg));
  const selection={version:'CR-MAT-V1-20260906',status:'working_formal_selection_master',authority:'Crystal｜选品',
    purchase_authorization:{approved_spec_count:0,rule:'Synthetic unapproved test records'},
    materials:[{id:'CRM-M-TEST',name:'测试珠',en:'Test bead',status:'研究候选'}],
    specifications:[{id:'CRM-S-TEST',material_id:'CRM-M-TEST',name:'测试珠',status:'提案未确认',approved:'否'}]};
  const proc=spawn(process.execPath,['workbench/server.mjs'],{cwd:repo,env:{...process.env,WORKBENCH_PORT:'0',WORKBENCH_STATE_DIR:path.join(dir,'state'),WORKBENCH_EXPORT_DIR:path.join(dir,'exports'),WORKBENCH_NATURE_LAUNCH_PATH:launchPath,WORKBENCH_SELECTION_PATH:selectionPath},stdio:['ignore','pipe','pipe']});
  try{
    const base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('server startup timeout')),15000);proc.stdout.on('data',chunk=>{const match=String(chunk).match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]);}});proc.once('error',reject);proc.once('exit',code=>reject(new Error(`server exit ${code}`)));});
    const req=async(url,options)=>{const r=await fetch(base+url,options);return {status:r.status,body:await r.json()};};
    const missing=await req('/api/selection');
    assert.equal(missing.status,200);
    assert.equal(missing.body.available,false);
    assert.equal(missing.body.reason,'SELECTION_PACKAGE_NOT_READY');
    assert.equal((await req('/api/nature-launch')).body.validation.designs[0].validation.material_mapping.not_checked,2);

    fs.writeFileSync(selectionPath,JSON.stringify(selection));
    const before=fs.readFileSync(selectionPath,'utf8');
    const existing=await req('/api/selection');
    assert.equal(existing.status,200);
    assert.equal(existing.body.available,true);
    assert.equal(existing.body.valid,true);
    assert.equal(existing.body.version,'CR-MAT-V1-20260906');
    assert.equal(existing.body.material_count,1);
    assert.equal(existing.body.specification_count,1);
    assert.equal(existing.body.approved_spec_count,0);
    assert.deepEqual(existing.body.mappings,[{material_id:'CRM-M-TEST',spec_id:'CRM-S-TEST',spec_status:'提案未确认',purchase_approved:false}]);
    let launch=await req('/api/nature-launch');
    assert.equal(launch.body.selection.available,true);
    assert.equal(launch.body.validation.designs[0].validation.material_mapping.unmapped,2);
    assert.equal(launch.body.validation.designs[0].validation.material_mapping.not_checked,0);
    assert.equal(launch.body.validation.designs[0].beads[0].source_status,'PROPOSED');

    const design=pkg.designs[0];
    for(const bead of design.beads){bead.material_id='CRM-M-TEST';bead.spec_id='CRM-S-TEST';}
    Object.assign(design.expected_bom[0],{material_id:'CRM-M-TEST',spec_id:'CRM-S-TEST'});
    Object.assign(design.material_change_proposals[0],{requested_material:'CRM-M-TEST',requested_spec:'CRM-S-TEST'});
    fs.writeFileSync(launchPath,JSON.stringify(pkg));
    launch=await req('/api/nature-launch');
    assert.equal(launch.body.validation.ok,true);
    assert.equal(launch.body.validation.designs[0].validation.material_mapping.mapped,2);
    assert.equal(launch.body.validation.designs[0].validation.material_mapping.approved,0);
    assert.equal(launch.body.validation.designs[0].validation.material_mapping.proposed,2);
    assert.equal((await req('/api/nature-launch/'+design.design_id)).body.validation.material_mapping.mapped,2);
    assert.equal((await req('/api/selection',{method:'POST'})).status,405);
    assert.equal(fs.readFileSync(selectionPath,'utf8'),before);

    for(const bad of ['{bad json',JSON.stringify({...selection,version:'unknown'}),JSON.stringify({...selection,specifications:[{...selection.specifications[0],material_id:'MISSING'}]}),JSON.stringify({...selection,specifications:[selection.specifications[0],selection.specifications[0]]})]){
      fs.writeFileSync(selectionPath,bad);
      const invalid=await req('/api/selection');
      assert.equal(invalid.status,422);
      assert.equal(invalid.body.available,true);
      assert.equal(invalid.body.valid,false);
      assert.equal(invalid.body.reason,'SELECTION_PACKAGE_INVALID');
      const invalidLaunch=await req('/api/nature-launch');
      assert.equal(invalidLaunch.status,422);
      assert.equal(invalidLaunch.body.validation.ok,false);
      assert.equal(invalidLaunch.body.selection.reason,'SELECTION_PACKAGE_INVALID');
      assert.equal((await req('/api/nature-launch/'+design.design_id)).status,422);
    }
  }finally{proc.kill();await new Promise(resolve=>proc.once('exit',resolve));fs.rmSync(dir,{recursive:true,force:true});}
});
