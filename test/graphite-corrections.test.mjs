import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {layoutStudio} from '../workbench/studio-layout.mjs';
import {aggregateBom} from '../workbench/bom.mjs';
import {resolveGeneratedBead} from '../workbench/generated-bead-assets.mjs';

const moduleUrl=source=>`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const appSource=await fs.readFile(new URL('../workbench/app.js',import.meta.url),'utf8');
// Fake only Fabric drawing and HTTP. Real application display resolver, Studio,
// canvas pointer adapter, layout, reducers, history and save serialization run.
const fabricUrl=moduleUrl(`
 export class Circle{constructor(props={}){Object.assign(this,props)}set(props){Object.assign(this,props);return this}setCoords(){}dispose(){}}
 export class Rect extends Circle{} export class FabricText extends Circle{constructor(text,props){super(props);this.text=text}}
 export class Polyline extends Circle{constructor(points,props){super(props);this.points=points}}
 export class Group extends Circle{constructor(children,props){super(props);this.children=children}}
 export class FabricImage extends Circle{static async fromURL(){return new FabricImage({width:768,height:768})}}
 export class Canvas{constructor(element){this.objects=[];this.handlers={};element.drawing=this;this.width=520;this.height=520}
 getWidth(){return this.width}getHeight(){return this.height}setDimensions(p){Object.assign(this,p)}add(o){this.objects.push(o)}remove(o){this.objects=this.objects.filter(x=>x!==o)}
 discardActiveObject(){this.active=null}setActiveObject(o){this.active=o}requestRenderAll(){}on(name,fn){this.handlers[name]=fn}getScenePoint(e){return e}dispose(){}renderAll(){}toDataURL(){return 'data:image/png;base64,'}}
`);
const canvasFile=new URL('../workbench/bracelet-canvas.mjs',import.meta.url);
const canvasUrl=moduleUrl((await fs.readFile(canvasFile,'utf8')).replace("'/vendor/fabric/index.min.mjs'",JSON.stringify(fabricUrl)).replace(/from '\.\/([^']+)'/g,(_,name)=>`from '${new URL(name,canvasFile).href}'`));
const studioFile=new URL('../workbench/studio-view.mjs',import.meta.url);
const {renderStudio}=await import(moduleUrl((await fs.readFile(studioFile,'utf8')).replace("import('./bracelet-canvas.mjs')",`import(${JSON.stringify(canvasUrl)})`).replace(/from '\.\/([^']+)'/g,(_,name)=>`from '${new URL(name,studioFile).href}'`)));
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const fixture=()=>Array.from({length:6},(_,n)=>({instanceId:`bead-${n}`,materialName:'Smoky Quartz',materialId:'candidate-smoky-quartz',specId:'candidate-smoky-quartz-round-8mm',displayNameZh:'烟晶',displayNameEn:'Smoky Quartz',sizeMm:8,form:'round',imageUrl:'/assets/local/preserved.png',assetKey:'preserved-source',assetRef:'source:preserved',provenanceClass:'source_cutout',looseX:.2+n*.1,looseY:.4}));
async function open(t,{trayMode='linear',layoutMode='loose',assets=[],instances=fixture(),activeMaterialName='',loadedDraft}={}){
 const dom=new JSDOM('<button data-global-save>保存</button><main></main>');t.after(()=>dom.window.close());
 const host=dom.window.document.querySelector('main'),saved=[];
 const context=vm.createContext({document:dom.window.document,structuredClone,data:{},draft:{name:'Synthetic correction fixture',beadMm:8,items:[{name:'Smoky Quartz',quantity:1}],braceletState:{layoutMode,trayMode,instances,activeMaterialName}},setStatus(){},setView(){throw new Error('cached Studio should not remount during global save');},resolveGeneratedBead,allStudioMaterials:()=>[{name:'Smoky Quartz'},{name:'Amethyst'}],studioMaterial:name=>({name}),assetSlug:()=>undefined,generatedAssets:{atlases:{}},generatedRepresentation:'generated_from_evidence',beadPalette:{},zh:item=>item.name});
 vm.runInContext(appSource.slice(appSource.indexOf('function materialBeadSize('),appSource.indexOf('function ensureBraceletHistory('))+'\n'+appSource.slice(appSource.indexOf('function canvasMaterial('),appSource.indexOf('function placedCount(')),context);
 const oldFetch=globalThis.fetch;t.after(()=>{globalThis.fetch=oldFetch});globalThis.fetch=async(url,options)=>{if(options?.method==='PUT')saved.push(JSON.parse(options.body));return {ok:true,json:async()=>url==='/api/local-assets'?{assets}:url==='/api/drafts'?{drafts:[]}:loadedDraft&&url.startsWith('/api/drafts/')?structuredClone(loadedDraft):{available:false}}};
 const controller=renderStudio({host,initialDraft:context.draft,materials:[{name:'Smoky Quartz',zhName:'烟晶',category:'crystal'},{name:'Amethyst',zhName:'紫水晶',category:'crystal'}],resolveMaterial:context.canvasMaterial,onDraft:draft=>{context.draft=draft;}});t.after(()=>controller.dispose());context.braceletCanvas=controller;
 vm.runInContext(appSource.split(/\r?\n/).find(line=>line.startsWith("document.querySelector('[data-global-save]').onclick=")),context);
 await controller.ready;await flush();
 const drawing=host.querySelector('canvas').drawing;
 return {dom,host,controller,drawing,saved,context,get state(){return context.draft.braceletState},async click(selector){host.querySelector(selector).click();await flush()},async gap(){const p=layoutStudio(this.state,520,520);drawing.handlers['mouse:down']({e:{x:(p.points[0].x+p.points[1].x)/2,y:(p.points[0].y+p.points[1].y)/2}});await flush();}};
}

for(const trayMode of ['round','linear'])test(`collect is immediately editable in ${trayMode}; select, drag across neighbours, undo/redo and return preserve identity`,async t=>{
 const h=await open(t,{trayMode}),before=structuredClone(h.state.instances),bom=aggregateBom(before);
 await h.click('[data-action="bracelet"]');
 assert.equal(h.state.layoutMode,'bracelet');assert.equal(h.state.trayMode,trayMode);assert.equal(h.host.querySelector('.is-presenting'),null);assert.equal(h.host.querySelector('[data-order-preview]'),null);
 const object=h.drawing.objects.find(o=>o.data?.instanceId==='bead-1');assert.equal(object.selectable,true);assert.equal(object.evented,true);
 h.drawing.handlers['mouse:down']({target:object});await flush();assert.equal(h.state.layoutMode,'bracelet');assert.equal(h.state.selectedInstanceId,'bead-1');
 const p=layoutStudio(h.state,520,520),a=p.points[4],b=p.points[5];object.set({left:(a.x+b.x)/2,top:(a.y+b.y)/2});h.drawing.handlers['object:moving']({target:object});assert.deepEqual(h.state.instances.map(i=>i.instanceId),before.map(i=>i.instanceId),'drag preview does not commit');h.drawing.handlers['object:modified']({target:object});await flush();
 assert.deepEqual(h.state.instances.map(i=>i.instanceId),['bead-0','bead-2','bead-3','bead-4','bead-1','bead-5']);assert.equal(h.state.layoutMode,'bracelet');assert.deepEqual(aggregateBom(h.state.instances),bom);
 for(const i of h.state.instances){const old=before.find(x=>x.instanceId===i.instanceId);assert.equal(i.imageUrl,old.imageUrl);assert.equal(i.assetKey,old.assetKey);assert.equal(i.sizeMm,old.sizeMm);}
 const moved=structuredClone(h.state.instances);await h.click('[data-action="undo"]');assert.deepEqual(h.state.instances.map(i=>i.instanceId),before.map(i=>i.instanceId));assert.equal(h.state.layoutMode,'bracelet');await h.click('[data-action="redo"]');assert.deepEqual(h.state.instances,moved);
 h.controller.present();await flush();assert.ok(h.host.querySelector('.is-presenting'));h.controller.edit();await flush();assert.equal(h.state.trayMode,trayMode);assert.equal(h.state.layoutMode,'bracelet');assert.deepEqual(h.state.instances,moved);
 await h.click('[data-action="loose"]');assert.equal(h.state.layoutMode,'loose');
});

for(const [operation,items] of [['increase',[{name:'Smoky Quartz',quantity:2}]],['decrease',[{name:'Smoky Quartz',quantity:0}]],['clear',[]]])test(`global save from detached catalogue retains ${operation} in selections without changing beads or history`,async t=>{
 const h=await open(t,{layoutMode:'bracelet'});await h.click('[data-plus="Smoky Quartz"]');const placed=structuredClone(h.state.instances);h.host.remove();h.context.draft={...h.context.draft,items};
 await h.dom.window.document.querySelector('[data-global-save]').onclick();const expected=items.filter(i=>i.quantity>0);
 assert.deepEqual(h.saved.at(-1).items,expected);assert.deepEqual(h.context.draft.items,expected);assert.deepEqual(h.saved.at(-1).braceletState.instances,placed);
 await h.click('[data-action="undo"]');assert.equal(h.state.instances.length,6);assert.deepEqual(h.context.draft.items,expected);
});

test('actual non-seven display resolver cannot overwrite a chosen 14 mm gap specification with its default 8 mm',async t=>{
 const h=await open(t,{layoutMode:'bracelet'});const input=h.host.querySelector('[data-size="Smoky Quartz"]');input.value='14';input.dispatchEvent(new h.dom.window.Event('input'));
 await h.gap();const added=h.state.instances.find(i=>!fixture().some(old=>old.instanceId===i.instanceId));assert.equal(added.sizeMm,14);assert.equal(added.specId,'candidate-smoky-quartz-round-14mm');
});
test('actual local-source gap preserves chosen 14 mm and exact source key rather than display-default size',async t=>{
 const asset={asset_key:'local-sample',material_id:'source-sample',display_name_zh:'本地样本',representation_class:'source_cutout',status:'ready',needs_mask:false,publication_status:'local_only',file:'local-sample.png',imageUrl:'/assets/local/local-sample.png'};
 const h=await open(t,{layoutMode:'bracelet',assets:[asset]});await h.click('[data-tab="local"]');await h.click('[data-select="local-sample"]');const input=h.host.querySelector('[data-size="local-sample"]');input.value='14';input.dispatchEvent(new h.dom.window.Event('input'));await h.gap();
 const added=h.state.instances.find(i=>!fixture().some(old=>old.instanceId===i.instanceId));assert.equal(added.sizeMm,14);assert.equal(added.assetKey,'local-sample');assert.equal(added.imageUrl,'/assets/local/local-sample.png');
});
for(const action of ['plus','drag'])test(`${action} makes its current material authoritative for the subsequent gap insertion`,async t=>{
 const h=await open(t,{layoutMode:'bracelet'});
 if(action==='plus')await h.click('[data-plus="Amethyst"]');else{let payload;h.host.querySelector('[data-material="Amethyst"]').ondragstart({dataTransfer:{setData(type,value){payload=JSON.parse(value)}}});assert.equal(payload.materialName,'Amethyst');await flush();}
 assert.equal(h.state.activeMaterialName,'Amethyst');const count=h.state.instances.length;await h.gap();assert.equal(h.state.instances.length,count+1);assert.equal(h.state.instances[1].materialName,'Amethyst');assert.equal(h.state.instances[1].assetKey,'translucent-v1-amethyst');
});
test('undo and redo reconcile the highlighted material with the restored active gap material',async t=>{
 const h=await open(t,{layoutMode:'bracelet'});
 await h.click('[data-plus="Smoky Quartz"]');await h.click('[data-select="Amethyst"]');await h.click('[data-action="undo"]');
 const highlighted=()=>h.host.querySelector('[data-material].selected')?.dataset.material;
 assert.equal(highlighted(),'Smoky Quartz');assert.equal(h.state.activeMaterialName,highlighted());
 await h.click('[data-action="redo"]');assert.equal(highlighted(),'Amethyst');assert.equal(h.state.activeMaterialName,highlighted());
 await h.gap();assert.equal(h.state.instances[1].materialName,'Amethyst');
 await h.click('[data-action="undo"]');await h.click('[data-action="undo"]');assert.equal(highlighted(),'Smoky Quartz');assert.equal(h.state.activeMaterialName,highlighted());await h.gap();assert.equal(h.state.instances[1].materialName,'Smoky Quartz');
});
for(const restore of ['initial','reload'])test(`${restore} restores the saved active material in both the library and gap insertion`,async t=>{
 const restored={name:'Restored synthetic fixture',items:[],braceletState:{layoutMode:'bracelet',trayMode:'linear',instances:fixture(),activeMaterialName:'Amethyst'}};
 const h=await open(t,{layoutMode:'bracelet',...(restore==='initial'?{activeMaterialName:'Amethyst'}:{loadedDraft:restored})});
 if(restore==='reload')await h.click('[data-action="reload"]');
 assert.equal(h.host.querySelector('[data-material].selected')?.dataset.material,'Amethyst');assert.equal(h.state.activeMaterialName,'Amethyst');
 await h.gap();assert.equal(h.state.instances[1].materialName,'Amethyst');
});
for(const entry of ['plus','drag','gap'])test(`17 cm rejects overbudget ${entry} without success feedback or bead changes`,async t=>{
 const instances=Array.from({length:24},(_,n)=>({...fixture()[0],instanceId:`boundary-${n}`}));
 const h=await open(t,{layoutMode:'bracelet',instances}),before=structuredClone(h.state);
 if(entry==='plus')await h.click('[data-plus="Smoky Quartz"]');
 if(entry==='gap')await h.gap();
 if(entry==='drag'){const canvas=h.host.querySelector('canvas');canvas.getBoundingClientRect=()=>({left:0,top:0,width:520,height:520});h.host.querySelector('.p4-tray-stage').ondrop({preventDefault(){},clientX:260,clientY:260,dataTransfer:{getData:()=>JSON.stringify({materialName:'Smoky Quartz',sizeMm:8})}});await flush();}
 assert.deepEqual(h.state,before);assert.match(h.host.querySelector('[data-message]').textContent,/超出.*上限/);assert.doesNotMatch(h.host.querySelector('[data-message]').textContent,/已添加/);
});
test('oversized saved draft cannot collect or present and remains saveable with a visible warning',async t=>{
 const instances=Array.from({length:25},(_,n)=>({...fixture()[0],instanceId:`overflow-${n}`}));const h=await open(t,{instances}),before=structuredClone(h.state.instances);
 await h.click('[data-action="bracelet"]');assert.equal(h.state.layoutMode,'loose');assert.match(h.host.querySelector('[data-message]').textContent,/超出.*上限/);
 assert.equal(h.controller.present(),false);assert.equal(h.host.querySelector('.is-presenting'),null);await h.click('[data-action="save"]');assert.deepEqual(h.saved.at(-1).braceletState.instances,before);
});
test('actual canvas draws continuous turns and one return in editing and presentation with underfill disclosed',async t=>{
 const h=await open(t,{layoutMode:'bracelet',trayMode:'round'});h.host.querySelector('[data-wrap]').value='3';h.host.querySelector('[data-wrap]').dispatchEvent(new h.dom.window.Event('change'));await flush();
 const check=()=>{const paths=h.drawing.objects.filter(o=>o.threadGuide);assert.equal(paths.length,4,'three turns plus one closure use only four drawing objects');assert.deepEqual([...new Set(paths.filter(o=>o.threadPart==='turn').map(o=>o.threadRow))],[0,1,2]);assert.equal(new Set(paths.filter(o=>o.threadPart==='closure').map(o=>o.threadId)).size,1);assert.ok(paths.every(o=>o.visible!==false));assert.ok(paths.filter(o=>o.threadPart==='turn').every(o=>o.points.length===129));};
 check();assert.match(h.host.querySelector('[data-tray-caption]').textContent,/未满/);h.controller.present();await flush();check();assert.match(h.host.querySelector('[data-presentation-notes]').textContent,/未满/);
});
test('rejected inspector size restores the visible value and does not alter history',async t=>{
 const instances=Array.from({length:24},(_,n)=>({...fixture()[0],instanceId:`boundary-${n}`})),h=await open(t,{layoutMode:'bracelet',instances});const bead=h.drawing.objects.find(o=>o.data?.instanceId==='boundary-0');h.drawing.handlers['mouse:down']({target:bead});await flush();const before=structuredClone(h.state);
 const input=h.host.querySelector('[data-instance-size]');input.value='14';input.dispatchEvent(new h.dom.window.Event('change'));await flush();assert.deepEqual(h.state,before);assert.equal(h.host.querySelector('[data-instance-size]').value,'8');assert.equal(h.host.querySelector('[data-action="undo"]').disabled,true);
});
test('near-complete collection shows completed closure while preserving real residual, reference size and actual inner estimate',async t=>{
 const instances=Array.from({length:24},(_,n)=>({...fixture()[0],instanceId:`closed-${n}`})),h=await open(t,{trayMode:'round',instances});
 assert.equal(h.state.layoutMode,'loose');await h.click('[data-action="bracelet"]');assert.equal(h.state.layoutMode,'bracelet');assert.match(h.host.querySelector('[data-tray-caption]').textContent,/已收拢.*闭圈/);assert.doesNotMatch(h.host.querySelector('[data-tray-caption]').textContent,/未满/);
 const readout=h.host.querySelector('[data-studio-status]').textContent;assert.match(readout,/剩余.*3\.1/);assert.match(readout,/参考.*8.*mm/);assert.match(readout,/166\.9/);assert.match(readout,/192\.0.*195\.1/);
 h.controller.present();await flush();assert.match(h.host.querySelector('[data-presentation-notes]').textContent,/已收拢/);assert.doesNotMatch(h.host.querySelector('[data-presentation-notes]').textContent,/未满/);h.controller.edit();await flush();await h.click('[data-action="undo"]');assert.equal(h.state.layoutMode,'loose');await h.click('[data-action="redo"]');assert.equal(h.state.layoutMode,'bracelet');assert.deepEqual(h.state.instances.map(i=>[i.instanceId,i.sizeMm,i.imageUrl]),instances.map(i=>[i.instanceId,i.sizeMm,i.imageUrl]));
});
test('presentation from an uncollected near-complete draft does not silently consume its residual',async t=>{
 const instances=Array.from({length:24},(_,n)=>({...fixture()[0],instanceId:`uncollected-${n}`})),h=await open(t,{trayMode:'round',instances});h.controller.present();await flush();const rows=h.drawing.objects.filter(o=>o.data?.instanceId),a=rows[0],b=rows.at(-1),c=rows[1];assert.ok(Math.hypot(a.left-b.left,a.top-b.top)>Math.hypot(a.left-c.left,a.top-c.top)*1.25);assert.equal(h.state.layoutMode,'loose');assert.match(h.host.querySelector('[data-presentation-notes]').textContent,/未收拢/);
});
