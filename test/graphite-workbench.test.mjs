import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {createBraceletState} from '../workbench/bracelet-state.mjs';
import {layoutStudio,insertionForPoint} from '../workbench/studio-layout.mjs';

for(const wrapCount of [1,2,3])for(const layoutMode of ['loose','bracelet'])test(`empty ${layoutMode} straight tray keeps ${wrapCount} measured rails`,()=>{
 const state=createBraceletState({version:4,trayMode:'linear',layoutMode,wrapCount,instances:[]});
 const p=layoutStudio(state,900,500);
 assert.equal(p.guides.length,wrapCount);
 assert.deepEqual(p.guides.map(g=>g.wrapIndex),Array.from({length:wrapCount},(_,i)=>i+1));
 for(const g of p.guides){assert.ok(g.x2>g.x1);assert.ok(Number.isFinite(g.lengthMm));assert.ok(Math.abs((g.x2-g.x1)/p.scale-g.lengthMm)<.001);}
 const gap=insertionForPoint({x:450,y:p.guides[0].y},p);assert.equal(gap.index,0);
});

test('navigation before API readiness is recoverable and renders the latest requested route',async()=>{
 const source=await fs.readFile(new URL('../workbench/app.js',import.meta.url),'utf8');
 const setView=source.slice(source.indexOf('function setView('),source.indexOf('function addToDesk('));
 const render=source.slice(source.indexOf('function render()'),source.indexOf('function bindViewButtons('));
 const dom=new JSDOM('<main id="app"></main>');
 try{
 const calls=[];const context=vm.createContext({document:dom.window.document,app:dom.window.document.querySelector('main'),data:undefined,view:'catalog',section:'minerals_crystals',braceletCanvas:undefined,studioHost:undefined,setStatus(){},renderCounts(){assert.ok(context.data,'must not read data before readiness');},renderRail(){},renderHome(){calls.push('home');},renderInspiration(){calls.push('inspiration');},renderDesk(){calls.push('desk');},renderCatalog(){calls.push('catalog');}});
 vm.runInContext(setView+'\n'+render,context);
 assert.doesNotThrow(()=>vm.runInContext("setView('desk')",context));
 assert.equal(calls.length,0);assert.match(context.app.textContent,/加载/);
 context.data={};vm.runInContext('render()',context);assert.deepEqual(calls,['desk']);
 }finally{dom.window.close();}
});
test('Crystal wordmark uses in-app navigation rather than reloading an unsaved workbench',async()=>{
 const html=await fs.readFile(new URL('../workbench/index.html',import.meta.url),'utf8'),source=(await fs.readFile(new URL('../workbench/app.js',import.meta.url),'utf8')).replace(/^import[\s\S]*?;\s*/gm,'');
 const dom=new JSDOM(html,{url:'http://127.0.0.1:1/'});
 try{const context=vm.createContext({document:dom.window.document,window:dom.window,fetch:()=>new Promise(()=>{}),setInterval(){},Intl,structuredClone});vm.runInContext(source,context);dom.window.document.body.dataset.currentView='desk';const click=new dom.window.MouseEvent('click',{bubbles:true,cancelable:true});dom.window.document.querySelector('.crystal-wordmark').dispatchEvent(click);assert.equal(click.defaultPrevented,true);assert.equal(dom.window.document.body.dataset.currentView,'catalog');}finally{dom.window.close();}
});

async function studio(t,initialDraft={}){
 const dom=new JSDOM('<main></main>');t.after(()=>dom.window.close());const host=dom.window.document.querySelector('main');
 const file=new URL('../workbench/studio-view.mjs',import.meta.url),canvas=`data:text/javascript;base64,${Buffer.from('export function createBraceletCanvas({canvasElement}){return {render(state,options){canvasElement.projection={state:structuredClone(state),options};},resize(){},dispose(){}}}').toString('base64')}`;
 const source=(await fs.readFile(file,'utf8')).replace("import('./bracelet-canvas.mjs')",`import(${JSON.stringify(canvas)})`).replace(/from '\.\/([^']+)'/g,(_,n)=>`from '${new URL(n,file).href}'`);
 const old=globalThis.fetch;t.after(()=>{globalThis.fetch=old;});globalThis.fetch=async url=>({ok:true,json:async()=>url==='/api/local-assets'?{assets:[]}:url==='/api/drafts'?{drafts:[]}:{available:false}});
 const {renderStudio}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);let draft;
 const controller=renderStudio({host,initialDraft,materials:[{name:'Quartz',zhName:'白水晶',category:'crystal'}],resolveMaterial:()=>({}),onDraft:d=>{draft=d;}});t.after(()=>controller.dispose());await controller.ready;
 return {host,controller,get draft(){return draft;}};
}
test('finished presentation projects a circular arrangement and return retains linear editing history',async t=>{
 const h=await studio(t,{name:'真实设计',braceletState:{trayMode:'linear',layoutMode:'loose',instances:[]}});
 h.host.querySelector('[data-plus]').click();h.host.querySelector('[data-plus]').click();const before=structuredClone(h.draft.braceletState.instances);
 h.host.querySelector('[data-action="bracelet"]').click();assert.equal(h.draft.braceletState.layoutMode,'bracelet');assert.equal(h.host.querySelector('.is-presenting'),null);h.host.querySelector('[data-action="present"]').click();
 assert.equal(h.host.querySelector('.p4-studio').classList.contains('is-presenting'),true);
 const drawn=h.host.querySelector('canvas').projection;assert.equal(drawn.state.trayMode,'round');assert.equal(drawn.state.layoutMode,'bracelet');assert.deepEqual(drawn.state.instances.map(i=>i.instanceId),before.map(i=>i.instanceId));
 h.host.querySelector('[data-exit-present]').click();assert.equal(h.draft.braceletState.trayMode,'linear');assert.equal(h.host.querySelector('canvas').projection.state.trayMode,'linear');
 h.host.querySelector('[data-action="undo"]').click();assert.equal(h.draft.braceletState.layoutMode,'loose');assert.deepEqual(h.draft.braceletState.instances,before);
});
test('inspector counts show selected, placed and remaining from the independent ledgers',async t=>{
 const h=await studio(t,{items:[{name:'Quartz',quantity:3}],layout:[]});
 h.host.querySelector('[data-plus]').click();
 const counts=h.host.querySelector('[data-quantity-summary]');assert.ok(counts);assert.match(counts.textContent,/已选\s*3/);assert.match(counts.textContent,/已排\s*1/);assert.match(counts.textContent,/待排\s*2/);
});
