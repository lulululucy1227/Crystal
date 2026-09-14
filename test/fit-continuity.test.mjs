import test from 'node:test';
import assert from 'node:assert/strict';
import {fitEstimate} from '../workbench/bracelet-fit.mjs';
import * as state from '../workbench/bracelet-state.mjs';
import {layoutStudio,insertionForPoint} from '../workbench/studio-layout.mjs';
const bead=(n,sizeMm=8)=>({instanceId:`fit-${n}`,materialName:'Quartz',sizeMm,form:'round',assetKey:'preserved',imageUrl:'/preserved.png',looseX:.2+n*.01,looseY:.4});
const make=(count,more={})=>state.createBraceletState({layoutMode:'loose',wristCm:17,allowanceMm:0,instances:Array.from({length:count},(_,n)=>bead(n)),...more});

test('strict 17 cm planning budget has no positive 5 mm overflow tolerance',()=>{
 const fit=fitEstimate(make(25));assert.equal(fit.status,'overflow');assert.ok(Math.abs(fit.targetMm-195.13274122871834)<1e-8);
 assert.equal(state.createBraceletState({layoutMode:'loose'}).allowanceMm,0);
});
for(const [wrapCount,allowanceMm,target] of [[1,0,197.22713633111153],[2,0,394.45427266222306],[3,0,591.6814089933346],[1,5,202.22713633111153],[2,5,404.45427266222306],[3,5,606.6814089933346]])test(`mixed 6/8/12 mm shares one explicit target for ${wrapCount} wraps and ${allowanceMm} allowance`,()=>{
 const s=make(0,{wrapCount,allowanceMm,instances:[bead(0,6),bead(1,8),bead(2,12)]}),fit=fitEstimate(s),p=layoutStudio({...s,trayMode:'linear'},700,500);
 assert.ok(Math.abs(fit.targetMm-target)<1e-8);assert.equal(s.targetCircumferenceMm,fit.targetMm);
 assert.equal(p.fit.targetMm,fit.targetMm);for(const guide of p.guides)assert.ok(Math.abs(guide.targetLengthMm-target/wrapCount)<1e-8);
});
test('overbudget placement is rejected atomically without clearing redo or changing source identities',()=>{
 let h=state.createHistory(make(24));h=state.applyHistoryCommand(h,{type:'rotate',instanceId:'fit-0',rotationDeg:15});h=state.undoHistory(h);
 const before=structuredClone(h),next=state.applyHistoryCommand(h,{type:'place',materialName:'Quartz',sizeMm:8});assert.equal(next,h);assert.deepEqual(next,before);
});
test('exact boundary is accepted but the next increase is rejected',()=>{
 // 25 equal spheres: 25d = 170 + pi*d, hence d = 170/(25-pi).
 const d=7.777327840306673;
 let h=state.createHistory(make(24,{instances:Array.from({length:24},(_,n)=>bead(n,d))}));
 h=state.applyHistoryCommand(h,{type:'place',...bead(24,d)});assert.equal(h.present.instances.length,25);
 assert.equal(state.applyHistoryCommand(h,{type:'replace',...bead(24,d+.01)}),h);
});
test('legacy overflow survives load/save and corrections while place, size increase and collect are blocked',()=>{
 const s=make(27),h=state.createHistory(s);assert.equal(s.instances.length,27);assert.equal(state.serializeBraceletState(s).instances.length,27);
 for(const command of [{type:'place',...bead(30)},{type:'replace',...bead(0,12)},{type:'layout-mode',layoutMode:'bracelet'}])assert.equal(state.applyHistoryCommand(h,command),h);
 const smaller=state.applyHistoryCommand(h,{type:'replace',...bead(0,6)});assert.equal(smaller.present.instances[0].sizeMm,6);assert.equal(fitEstimate(smaller.present).status,'overflow');
 assert.equal(state.applyHistoryCommand(h,{type:'remove',instanceId:'fit-0'}).present.instances.length,26);
 const loaded=make(27,{layoutMode:'bracelet'}),moved=state.applyHistoryCommand(state.createHistory(loaded),{type:'move',instanceId:'fit-0',targetIndex:3});assert.equal(moved.present.instances[3].instanceId,'fit-0');
});
test('reducing wrist or wrap preserves beads, recomputes overflow, and allows undo',()=>{
 for(const command of [{type:'wrist',wristCm:10},{type:'wrap-count',wrapCount:1},{type:'allowance',allowanceMm:0}]){
  const s=make(48,{wrapCount:2,allowanceMm:5}),h=state.createHistory(s),next=state.applyHistoryCommand(h,command);
  assert.deepEqual(next.present.instances,s.instances);assert.equal(next.present.overflowMm,Math.max(0,fitEstimate(next.present).deltaMm));assert.deepEqual(state.undoHistory(next).present,s);
 }
});
test('unknown dimensions remain visible but fail closed for collecting',()=>{
 const h=state.createHistory(make(0,{instances:[{...bead(0),sizeMm:null}]}));assert.equal(h.present.instances.length,1);assert.equal(fitEstimate(h.present).status,'unknown');assert.equal(state.applyHistoryCommand(h,{type:'layout-mode',layoutMode:'bracelet'}),h);
});
for(const trayMode of ['round','linear'])for(const wrapCount of [1,2,3])test(`${trayMode} ${wrapCount} wraps has connected turns and exactly one global closure`,()=>{
 const s=make(60,{layoutMode:'bracelet',trayMode,wrapCount}),before=structuredClone(s),p=layoutStudio(s,700,600);
 assert.ok(p.threadPath,'a real path is required, not per-ring circle guides');assert.equal(p.threadPath.turns.length,wrapCount);assert.equal(p.threadPath.closures.length,1);
 for(let n=1;n<wrapCount;n++)assert.deepEqual(p.threadPath.turns[n-1].points.at(-1),p.threadPath.turns[n].points[0]);
 assert.deepEqual(p.threadPath.closures[0].points[0],p.threadPath.turns.at(-1).points.at(-1));assert.deepEqual(p.threadPath.closures[0].points.at(-1),p.threadPath.turns[0].points[0]);
 assert.deepEqual(p.points.map(p=>p.instanceId),s.instances.map(i=>i.instanceId));assert.deepEqual(s,before);
 if(trayMode==='round')for(let n=1;n<p.points.length;n++)assert.ok(p.points[n].threadDistance>p.points[n-1].threadDistance);
});
for(const [wrapCount,allowanceMm,count] of [[1,0,23],[2,0,45],[3,0,68],[1,5,23],[2,5,47],[3,5,70]])test(`mixed-size placement boundary remains enforced for ${wrapCount} wraps with explicit ${allowanceMm} mm allowance`,()=>{
 let h=state.createHistory(make(0,{wrapCount,allowanceMm}));for(let n=0;n<count;n++)h=state.applyHistoryCommand(h,{type:'place',...bead(n,[6,8,12][n%3])});
 assert.equal(h.present.instances.length,count);assert.equal(state.applyHistoryCommand(h,{type:'place',...bead(count,[6,8,12][count%3])}),h);assert.equal(state.serializeBraceletState(h.present).allowanceMm,allowanceMm);
});
for(const wrapCount of [2,3])test(`exact ${wrapCount}-wrap boundary accepts floating-point equality, never positive overlength`,()=>{
 const d=7.777327840306673,n=25*wrapCount;let h=state.createHistory(make(n-1,{wrapCount,instances:Array.from({length:n-1},(_,i)=>bead(i,d))}));h=state.applyHistoryCommand(h,{type:'place',...bead(n-1,d)});assert.equal(h.present.instances.length,n);assert.equal(fitEstimate(h.present).status,'fit');assert.equal(state.applyHistoryCommand(h,{type:'replace',...bead(n-1,d+.001)}),h);
});
test('underfilled round preview keeps the same target path and physical bead scale instead of shrinking to close',()=>{
 const sparse=layoutStudio(make(6,{layoutMode:'bracelet'}),700,600),full=layoutStudio(make(23,{layoutMode:'bracelet'}),700,600);
 assert.deepEqual(sparse.threadPath,full.threadPath);assert.equal(sparse.points[0].diameter,full.points[0].diameter);assert.ok(sparse.points.at(-1).threadDistance<full.points.at(-1).threadDistance/3);
});
for(const trayMode of ['round','linear'])test(`cross-turn ${trayMode} gap selects the global insertion boundary and survives history roundtrip`,()=>{
 const s=make(48,{layoutMode:'bracelet',trayMode,wrapCount:2}),p=layoutStudio(s,700,600),index=p.points.findIndex((point,n)=>n>0&&point.row!==p.points[n-1].row);assert.ok(index>0);
 const a=p.points[index-1],b=p.points[index],gap=insertionForPoint({x:(a.x+b.x)/2,y:(a.y+b.y)/2},p);assert.equal(gap.index,index);
 const h=state.createHistory(s),placed=state.applyHistoryCommand(h,{type:'place',...bead(90,1),targetIndex:gap.index});assert.equal(placed.present.instances[index].instanceId,'fit-90');assert.deepEqual(state.undoHistory(placed).present,s);assert.deepEqual(state.serializeBraceletState(state.createBraceletState(state.serializeBraceletState(placed.present))),state.serializeBraceletState(placed.present));
});
for(const layoutMode of ['loose','bracelet'])test(`unknown-size legacy overflow permits a provably smaller known bead without losing unknown identity or history in ${layoutMode}`,()=>{
 const s=make(27,{layoutMode,instances:[...make(27).instances,{...bead(27),sizeMm:null}]}),withoutAngle=({angle,...i})=>i,unknown=withoutAngle(s.instances.at(-1));
 let h=state.createHistory(s);h=state.applyHistoryCommand(h,{type:'rotate',instanceId:'fit-0',rotationDeg:15});h=state.undoHistory(h);
 const snapshot=structuredClone(h);
 for(const command of [{type:'place',...bead(90)},{type:'replace',...bead(0,12)},{type:'layout-mode',layoutMode:'bracelet'}]){assert.equal(state.applyHistoryCommand(h,command),h);assert.deepEqual(h,snapshot);}
 const smaller=state.applyHistoryCommand(h,{type:'replace',...bead(0,6)});assert.equal(smaller.present.instances[0].sizeMm,6);assert.equal(fitEstimate(smaller.present).status,'unknown');assert.equal(smaller.present.instances.length,28);assert.deepEqual(withoutAngle(smaller.present.instances.at(-1)),unknown);assert.deepEqual(smaller.present.instances.slice(1).map(withoutAngle),s.instances.slice(1).map(withoutAngle));
 assert.equal(smaller.past.length,h.past.length+1);assert.equal(smaller.future.length,0);const undone=state.undoHistory(smaller);assert.deepEqual(undone.present,s);assert.deepEqual(state.redoHistory(undone).present,smaller.present);assert.deepEqual(state.serializeBraceletState(state.createBraceletState(state.serializeBraceletState(smaller.present))),state.serializeBraceletState(smaller.present));
});
test('legacy overlength linear thread extends across every rendered bead while its ruler keeps the selected target',()=>{
 const s=make(100,{layoutMode:'bracelet',trayMode:'linear',wrapCount:2}),p=layoutStudio(s,700,600);assert.equal(p.fit.status,'overflow');
 for(const point of p.points){const row=p.threadPath.turns[point.row],a=row.points.at(-2),b=row.points.at(-1);assert.equal(point.y,a.y);assert.equal(point.y,b.y);assert.ok(point.x>=Math.min(a.x,b.x)-1e-9&&point.x<=Math.max(a.x,b.x)+1e-9,`${point.instanceId} lies beyond its drawn thread`);}
 for(const guide of p.guides){assert.ok(Math.abs(guide.targetLengthMm-195.13274122871834)<1e-9);assert.ok(Math.abs((guide.x2-guide.x1)/p.scale-guide.targetLengthMm)<1e-9);}
 assert.equal(p.threadPath.closures.length,1);assert.deepEqual(p.threadPath.turns[0].points.at(-1),p.threadPath.turns[1].points[0]);assert.deepEqual(p.threadPath.closures[0].points[0],p.threadPath.turns.at(-1).points.at(-1));assert.deepEqual(p.threadPath.closures[0].points.at(-1),p.threadPath.turns[0].points[0]);
 const valid=layoutStudio(make(46,{layoutMode:'bracelet',trayMode:'linear',wrapCount:2}),700,600);for(const [n,guide] of valid.guides.entries()){const turn=valid.threadPath.turns[n],a=turn.points.at(-2),b=turn.points.at(-1);assert.ok(Math.abs(Math.abs(b.x-a.x)-(guide.x2-guide.x1))<1e-9);}
});
for(const layoutMode of ['loose','bracelet'])test(`sparse unknown ${layoutMode} draft permits a known reduction when negative budget difference becomes less negative`,()=>{
 const s=make(0,{layoutMode,instances:[{...bead(0),sizeMm:null},bead(1),bead(2)]}),h=state.createHistory(s),next=state.applyHistoryCommand(h,{type:'replace',...bead(1,6)});
 assert.equal(next.present.instances[1].sizeMm,6);assert.equal(fitEstimate(next.present).status,'unknown');assert.equal(fitEstimate(next.present).usedMm,22);assert.ok(fitEstimate(next.present).deltaMm>fitEstimate(s).deltaMm);assert.ok(fitEstimate(next.present).deltaMm<0);
 const withoutAngle=({angle,...i})=>i;assert.deepEqual(withoutAngle(next.present.instances[0]),withoutAngle(s.instances[0]));assert.deepEqual(withoutAngle(next.present.instances[2]),withoutAngle(s.instances[2]));assert.equal(next.present.instances.length,3);assert.deepEqual(state.undoHistory(next).present,s);assert.deepEqual(state.redoHistory(state.undoHistory(next)).present,next.present);
 assert.equal(state.applyHistoryCommand(next,{type:'place',...bead(9)}),next);assert.equal(state.applyHistoryCommand(next,{type:'layout-mode',layoutMode:'bracelet'}),next);
});
