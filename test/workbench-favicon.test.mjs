import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {JSDOM} from 'jsdom';
import sharp from 'sharp';

test('served Workbench declares a valid self-contained favicon without requesting a missing route',async t=>{
 const repo=path.resolve(import.meta.dirname,'..');
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'workbench-favicon-'));
 const server=spawn(process.execPath,['workbench/server.mjs'],{cwd:repo,env:{...process.env,WORKBENCH_PORT:'0',WORKBENCH_STATE_DIR:path.join(temporary,'state'),WORKBENCH_EXPORT_DIR:path.join(temporary,'exports')},stdio:['ignore','pipe','pipe']});
 t.after(async()=>{if(server.exitCode===null){const stopped=new Promise(resolve=>server.once('exit',resolve));server.kill();await stopped;}fs.rmSync(temporary,{recursive:true,force:true});});
 const base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('server startup timeout')),10000);server.stdout.on('data',chunk=>{const found=String(chunk).match(/http:\/\/127\.0\.0\.1:\d+/);if(found){clearTimeout(timer);resolve(found[0]);}});server.once('error',error=>{clearTimeout(timer);reject(error);});server.once('exit',code=>{clearTimeout(timer);reject(new Error('server exited '+code));});});
 const response=await fetch(base);assert.equal(response.status,200);
 const dom=new JSDOM(await response.text(),{url:base});t.after(()=>dom.window.close());
 const icon=dom.window.document.querySelector('link[rel~="icon"]');
 assert.ok(icon,'Fresh browsers need an explicit favicon to avoid implicit /favicon.ico');
 assert.equal(icon.type,'image/svg+xml');assert.match(icon.href,/^data:image\/svg\+xml,/);
 const svg=Buffer.from(decodeURIComponent(icon.href.slice(icon.href.indexOf(',')+1)));
 const metadata=await sharp(svg).metadata();assert.equal(metadata.format,'svg');assert.ok(metadata.width>0&&metadata.height>0);
 const pixels=await sharp(svg).ensureAlpha().raw().toBuffer();assert.ok(pixels.some((value,index)=>index%4===3&&value>0),'favicon must not be blank');
});
