import test from 'node:test';
import assert from 'node:assert/strict';
import * as stateApi from '../workbench/bracelet-state.mjs';
import {fitEstimate} from '../workbench/bracelet-fit.mjs';
const bead=(instanceId,sizeMm=8)=>({instanceId,materialId:'q',specId:`q${sizeMm}`,materialName:'Quartz',sizeMm,imageUrl:'/private/q.png',assetRef:'original:q',provenanceClass:'source_cutout'});
const initial=()=>stateApi.createBraceletState({layoutMode:'loose',instances:['a','b','c'].map(id=>bead(id))});
const layout=await import('../workbench/studio-layout.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
test('linear front and back are pure visibility projections and gap indices retain the full sequence',()=>{
 const s=stateApi.createBraceletState({layoutMode:'bracelet',trayMode:'linear',wrapCount:2,instances:Array.from({length:8},(_,n)=>bead(String(n)))}),before=structuredClone(s);
 const all=layout.layoutStudio(s,900,560),front=layout.layoutStudio(s,900,560,{linearSection:'front'}),back=layout.layoutStudio(s,900,560,{linearSection:'back'});
 assert.equal(all.guides.length,4);assert.deepEqual(front.points.filter(p=>p.visible).map(p=>p.instanceId),['0','1','4','5']);assert.deepEqual(back.points.filter(p=>p.visible).map(p=>p.instanceId),['2','3','6','7']);
 assert.deepEqual(front.points.map(({visible,...p})=>p),all.points.map(({visible,...p})=>p));assert.deepEqual(layout.layoutStudio(s,900,560),all);assert.deepEqual(s,before);
 const a=back.points[2],b=back.points[3];assert.equal(layout.insertionForPoint({x:(a.x+b.x)/2,y:a.y},back).index,3);assert.equal(layout.insertionForPoint({x:(a.x+b.x)/2,y:a.y},back,'0').index,2);
});
test('linear loose explicit swap uses remembered linear positions without overwriting round positions',()=>{
 const s=stateApi.createBraceletState({layoutMode:'loose',trayMode:'linear',instances:[{...bead('a'),looseX:.3,looseY:.4,looseLinearX:.2,looseLinearY:.8},{...bead('b'),looseX:.7,looseY:.6,looseLinearX:.8,looseLinearY:.2}]}),h=stateApi.createHistory(s);
 const swapped=stateApi.applyHistoryCommand(h,{type:'swap',instanceId:'a',otherInstanceId:'b'});
 assert.deepEqual(swapped.present.instances.map(i=>[i.instanceId,i.looseX,i.looseY,i.looseLinearX,i.looseLinearY]),[['b',.7,.6,.2,.8],['a',.3,.4,.8,.2]]);assert.deepEqual(stateApi.undoHistory(swapped).present,s);
});
test('round and linear layout are collision-safe projections of one continuous 100-bead sequence at desktop and small sizes',()=>{
 assert.equal(typeof layout.layoutStudio,'function');
 for(const trayMode of ['round','linear'])for(const wrapCount of [1,2,3])for(const [width,height] of [[900,700],[500,500],[320,420]]){
  const s=stateApi.createBraceletState({layoutMode:'bracelet',trayMode,wrapCount,instances:Array.from({length:100},(_,i)=>bead(String(i),[6,8,12][i%3]))});
  const projection=layout.layoutStudio(s,width,height);assert.equal(projection.points.length,100);
  assert.deepEqual(projection.points.map(p=>p.instanceId),s.instances.map(i=>i.instanceId));
  for(const p of projection.points){assert.ok(p.x-p.diameter/2>=0);assert.ok(p.x+p.diameter/2<=width);assert.ok(p.y-p.diameter/2>=0);assert.ok(p.y+p.diameter/2<=height);}
  for(let a=0;a<100;a++)for(let b=a+1;b<100;b++){const p=projection.points[a],q=projection.points[b];assert.ok(Math.hypot(p.x-q.x,p.y-q.y)>=(p.diameter+q.diameter)/2-.02,`${trayMode} ${wrapCount}: ${a}/${b}`);}
 }
});
test('gap hit-testing chooses an insertion boundary, not a material or equal-size slot',()=>{
 assert.equal(typeof layout.insertionForPoint,'function');const p=layout.layoutStudio(stateApi.createBraceletState({layoutMode:'bracelet',trayMode:'linear',instances:[bead('a',6),bead('b',12),bead('c',8)]}),800,600);
 const a=p.points[0],b=p.points[1];assert.equal(layout.insertionForPoint({x:(a.x+b.x)/2,y:a.y},p).index,1);
});
test('sparse multiwrap layouts never stack one-bead loops on the same center',()=>{
 const p=layout.layoutStudio(stateApi.createBraceletState({layoutMode:'bracelet',wrapCount:3,instances:['a','b','c'].map(id=>bead(id))}),600,600);
 for(let a=0;a<3;a++)for(let b=a+1;b<3;b++)assert.ok(Math.hypot(p.points[a].x-p.points[b].x,p.points[a].y-p.points[b].y)>=(p.points[a].diameter+p.points[b].diameter)/2);
});
test('dense multiwrap allocation gives outer loops more beads instead of leaving large artificial gaps',()=>{
 const p=layout.layoutStudio(stateApi.createBraceletState({layoutMode:'bracelet',wrapCount:3,instances:Array.from({length:80},(_,n)=>bead(String(n),[6,8,12][n%3]))}),900,560);
 for(const guide of p.guides){const row=p.points.filter(i=>i.row===guide.row);for(let n=0;n<row.length;n++){const a=row[n],b=row[(n+1)%row.length],gap=Math.hypot(a.x-b.x,a.y-b.y)-(a.diameter+b.diameter)/2;assert.ok(gap<Math.max(a.diameter,b.diameter)*.5,`row ${guide.row} has artificial gap ${gap}`);}}
 assert.ok(p.guides[2].count>p.guides[0].count);
});
test('invalid instance collections make the fit estimate unknown, never throw',()=>{
 for(const instances of [null,{},'invalid'])assert.equal(fitEstimate({wristCm:17,wrapCount:2,instances}).status,'unknown');
});
test('local collision settlement moves only overlapping neighbors and stays finite',()=>{
 assert.equal(typeof layout.settleLoose,'function');const points=[{instanceId:'a',x:100,y:100,diameter:30},{instanceId:'b',x:110,y:100,diameter:30},{instanceId:'c',x:350,y:350,diameter:30}];
 const result=layout.settleLoose(points,'a',{x:105,y:100},{width:500,height:500,center:{x:250,y:250},trayRadius:240,trayMode:'linear'});
 assert.deepEqual(result[2],points[2]);assert.ok(Math.hypot(result[0].x-result[1].x,result[0].y-result[1].y)>=29.9);
});
test('local settlement never untangles an unrelated overlapping cluster elsewhere in the tray',()=>{
 const points=[{instanceId:'a',x:70,y:70,diameter:30},{instanceId:'b',x:340,y:340,diameter:30},{instanceId:'c',x:345,y:345,diameter:30}];
 const result=layout.settleLoose(points,'a',{x:90,y:80},{width:500,height:500,center:{x:250,y:250},trayRadius:240,trayMode:'linear'});
 assert.deepEqual(result.slice(1),points.slice(1));
});
test('normal Studio additions settle mixed loose beads without overlap and remain a single undo action',()=>{
 let h=stateApi.createHistory(stateApi.createBraceletState({layoutMode:'loose'}));
 for(let n=0;n<80;n++){
  h=stateApi.applyHistoryCommand(h,{type:'place',...bead(String(n),[6,8,12][n%3]),settle:true,viewport:{width:900,height:560}});
  const p=layout.layoutStudio(h.present,900,560).points;
  for(let a=0;a<p.length;a++)for(let b=a+1;b<p.length;b++)assert.ok(Math.hypot(p[a].x-p[b].x,p[a].y-p[b].y)>=(p[a].diameter+p[b].diameter)/2-.1,`${n} placement overlaps ${a}/${b}`);
 }
 assert.equal(h.present.instances.length,80);assert.equal(stateApi.undoHistory(h).present.instances.length,79);
 const linear=layout.layoutStudio({...h.present,trayMode:'linear'},900,560).points;
 for(let a=0;a<80;a++)for(let b=a+1;b<80;b++)assert.ok(Math.hypot(linear[a].x-linear[b].x,linear[a].y-linear[b].y)>=(linear[a].diameter+linear[b].diameter)/2-.1,`Linear loose projection overlaps ${a}/${b}`);
 assert.ok(!Object.hasOwn(h.present.instances[0],'settle'));assert.ok(!Object.hasOwn(h.present.instances[0],'viewport'));
});
test('independent tray and wrap commands survive 20 projections, history and exact draft roundtrip',()=>{
 let h=stateApi.createHistory(initial());const before=h.present.instances;
 for(let n=0;n<20;n++)h=stateApi.applyHistoryCommand(h,{type:'tray-mode',trayMode:n%2?'round':'linear'});
 h=stateApi.applyHistoryCommand(h,{type:'wrap-count',wrapCount:3});h=stateApi.applyHistoryCommand(h,{type:'allowance',allowanceMm:7});
 assert.equal(h.present.wrapCount,3);assert.equal(h.present.allowanceMm,7);assert.equal(h.present.layoutMode,'loose');assert.deepEqual(h.present.instances,before);
 const serialized=stateApi.serializeBraceletState(h.present);assert.deepEqual(stateApi.serializeBraceletState(stateApi.createBraceletState(serialized)),serialized);
 assert.equal(stateApi.undoHistory(h).present.allowanceMm,5);assert.equal(stateApi.redoHistory(stateApi.undoHistory(h)).present.allowanceMm,7);
 const old=stateApi.createBraceletState({layout:['Quartz']});assert.equal(old.trayMode,'round');assert.equal(old.wrapCount,1);assert.equal(old.allowanceMm,5);
});
test('gap insertion inserts exactly one stable identity without exchanging neighbors',()=>{
 let s=stateApi.setLayoutMode(initial(),'bracelet');s=stateApi.placeInstance(s,{...bead('new',12),targetIndex:1});
 assert.deepEqual(s.instances.map(i=>i.instanceId),['a','new','b','c']);assert.equal(new Set(s.instances.map(i=>i.instanceId)).size,4);
 assert.equal(s.instances[1].imageUrl,'/private/q.png');
});
test('explicit swap and rotate are undoable and never change material provenance',()=>{
 let h=stateApi.createHistory(initial());h=stateApi.applyHistoryCommand(h,{type:'swap',instanceId:'a',otherInstanceId:'c'});
 assert.deepEqual(h.present.instances.map(i=>i.instanceId),['c','b','a']);
 h=stateApi.applyHistoryCommand(h,{type:'rotate',instanceId:'b',rotationDeg:45});assert.equal(h.present.instances[1].rotationDeg,45);
 assert.equal(h.present.instances[1].assetRef,'original:q');assert.equal(stateApi.undoHistory(h).present.instances[1].rotationDeg,0);
});
test('moving one same-material instance preserves the other exact loose position',()=>{
 const s=initial();const next=stateApi.moveInstance(s,{instanceId:'b',looseX:.7,looseY:.4});assert.deepEqual(next.instances[0],s.instances[0]);assert.deepEqual(next.instances[2],s.instances[2]);assert.equal(next.instances[1].looseX,.7);
});
test('multiwrap fit distinguishes string length from estimated inner circumference',()=>{
 const fit=fitEstimate({wristCm:17,allowanceMm:5,wrapCount:3,instances:Array.from({length:72},()=>bead('x',8))});
 assert.equal(fit.usedMm,576);assert.equal(fit.wrapCount,3);assert.equal(fit.innerTargetMm,525);assert.ok(fit.targetMm>600);assert.ok(fit.estimatedInnerMm<576);assert.equal(fit.status,'underfilled');
});
test('invalid projection controls cannot mutate a valid history',()=>{
 let h=stateApi.createHistory(initial());for(const command of [{type:'tray-mode',trayMode:'grid'},{type:'wrap-count',wrapCount:4},{type:'allowance',allowanceMm:-1}])assert.equal(stateApi.applyHistoryCommand(h,command),h);
});
test('linear loose edge preview commits without snap and both arrangements survive switching history and reload',()=>{
 const original=stateApi.createBraceletState({layoutMode:'loose',trayMode:'linear',instances:[{...bead('a'),looseX:.35,looseY:.4}]});
 const projected=layout.layoutStudio(original,900,560),preview=layout.settleLoose(projected.points,'a',{x:800,y:440},projected),position=layout.looseCoordinates(preview[0],projected);
 let h=stateApi.createHistory(original);h=stateApi.applyHistoryCommand(h,{type:'move',...position});let actual=layout.layoutStudio(h.present,900,560).points[0];
 assert.ok(Math.hypot(actual.x-preview[0].x,actual.y-preview[0].y)<1e-8);assert.equal(h.present.instances[0].looseX,.35);assert.equal(h.present.instances[0].looseY,.4);assert.ok(h.present.instances[0].looseLinearX>.8);
 const coordinates=structuredClone(h.present.instances);h=stateApi.applyHistoryCommand(h,{type:'tray-mode',trayMode:'round'});h=stateApi.applyHistoryCommand(h,{type:'tray-mode',trayMode:'linear'});assert.deepEqual(h.present.instances,coordinates);
 const saved=stateApi.serializeBraceletState(h.present);assert.deepEqual(stateApi.serializeBraceletState(stateApi.createBraceletState(saved)),saved);
 h=stateApi.undoHistory(stateApi.undoHistory(stateApi.undoHistory(h)));assert.equal(h.present.instances[0].looseLinearX,undefined);assert.equal(stateApi.redoHistory(h).present.instances[0].looseLinearX,coordinates[0].looseLinearX);
});
test('settled loose move and size edit prevent overlap as one undo action while retaining unrelated coordinates',()=>{
 const start=stateApi.createBraceletState({layoutMode:'loose',instances:[{...bead('a'),looseX:.42,looseY:.5},{...bead('b'),looseX:.58,looseY:.5},{...bead('far'),looseX:.5,looseY:.2}]});
 for(const command of [{type:'move',instanceId:'a',looseX:.435,looseY:.5},{type:'replace',...start.instances[0],sizeMm:16}]){
  const h=stateApi.applyHistoryCommand(stateApi.createHistory(start),{...command,settle:true,viewport:{width:900,height:560}}),points=layout.layoutStudio(h.present,900,560).points;
  assert.ok(Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y)>=(points[0].diameter+points[1].diameter)/2-.02);assert.equal(h.present.instances[2].looseX,start.instances[2].looseX);assert.equal(h.present.instances[2].looseY,start.instances[2].looseY);assert.deepEqual(stateApi.undoHistory(h).present,start);
 }
});
