import test from 'node:test';
import assert from 'node:assert/strict';
import {fitEstimate} from '../workbench/bracelet-fit.mjs';
import * as state from '../workbench/bracelet-state.mjs';
import {layoutStudio,insertionForPoint} from '../workbench/studio-layout.mjs';
const bead=(n,sizeMm=8,extra={})=>({instanceId:`near-${n}`,materialName:'Quartz',sizeMm,form:'round',assetKey:'original',imageUrl:'/original.png',...extra});
const plan=(count,extra={})=>state.createBraceletState({layoutMode:'loose',wristCm:17,allowanceMm:0,instances:Array.from({length:count},(_,n)=>bead(n)),...extra});

for(const [wrapCount,allowanceMm,count] of [[1,0,24],[2,0,48],[3,0,73],[1,5,25],[2,5,50],[3,5,75]])test(`sub-bead residual closes ${count} eight-mm beads at ${wrapCount} wraps and ${allowanceMm} allowance without permitting another`,()=>{
 const s=plan(count,{wrapCount,allowanceMm}),fit=fitEstimate(s);assert.equal(fit.nearComplete,true);assert.equal(fit.referenceBeadMm,8);assert.equal(fit.canAddReference,false);assert.equal(fit.closeOccupiedSpan,true);assert.ok(fit.deltaMm<0);assert.equal(state.applyHistoryCommand(state.createHistory(s),{type:'place',...bead(count)}).present.instances.length,count);
 const less=plan(count-1,{wrapCount,allowanceMm});assert.equal(fitEstimate(less).nearComplete,false);assert.equal(fitEstimate(less).canAddReference,true);assert.equal(fitEstimate(less).closeOccupiedSpan,false);
});
test('smallest existing mixed-size bead, including its thickness, is the conservative next-placement reference',()=>{
 // 19×8 + 2×12 + 2×6 = 188 mm: another 8 fails, but another 6 fits.
 const s=plan(23,{instances:[...plan(19).instances,bead(19,12),bead(20,12),bead(21,6),bead(22,6)]});assert.equal(fitEstimate(s).referenceBeadMm,6);assert.equal(fitEstimate(s).nearComplete,false);assert.equal(fitEstimate(s).canAddReference,true);
 const next=state.applyHistoryCommand(state.createHistory(s),{type:'place',...bead(24,6)}).present;assert.equal(next.instances.length,24);assert.equal(fitEstimate(next).nearComplete,true);
 // Copying explicit thickness 20 gives target196.9168; assuming diameter6 gives195.1575.
 const thick=plan(23,{wristCm:18.9,instances:[...plan(23).instances.map(i=>({...i,thicknessMm:1})),bead(23,6,{thicknessMm:20})]});assert.equal(fitEstimate(thick).canAddReference,true);assert.equal(fitEstimate(thick).nearComplete,false);
});
test('empty unknown and overflow never count as near-complete; exact equality closes without changing budget',()=>{
 for(const s of [plan(0),plan(25),plan(0,{instances:[bead(0,null)]})]){assert.equal(fitEstimate(s).nearComplete,false);assert.equal(fitEstimate(s).closeOccupiedSpan,false);}
 const d=7.777327840306673,s=plan(25,{instances:Array.from({length:25},(_,n)=>bead(n,d))}),fit=fitEstimate(s);assert.equal(fit.status,'fit');assert.equal(fit.closeOccupiedSpan,true);assert.ok(Math.abs(fit.deltaMm)<1e-9);
});
test('explicit collect closes the last-to-first residual while retaining natural gaps, source IDs and honest actual size',()=>{
 const loose=plan(24),h=state.createHistory(loose),collected=state.applyHistoryCommand(h,{type:'layout-mode',layoutMode:'bracelet'}),p=layoutStudio(collected.present,700,600);
 const gaps=p.points.map((a,n)=>{const b=p.points[(n+1)%p.points.length];return Math.hypot(a.x-b.x,a.y-b.y)-(a.diameter+b.diameter)/2;});assert.ok(Math.max(...gaps)-Math.min(...gaps)<p.points[0].diameter*.025,'terminal gap should match normal neighbouring gaps');
 assert.equal(p.fit.usedMm,192);assert.ok(Math.abs(p.fit.estimatedInnerMm-166.86725877128165)<1e-9);assert.ok(Math.abs(p.fit.targetMm-195.13274122871834)<1e-9);assert.deepEqual(collected.present.instances.map(i=>[i.instanceId,i.sizeMm,i.assetKey,i.imageUrl]),loose.instances.map(i=>[i.instanceId,i.sizeMm,i.assetKey,i.imageUrl]));
 assert.deepEqual(state.undoHistory(collected).present,loose);assert.deepEqual(state.redoHistory(state.undoHistory(collected)).present,collected.present);assert.deepEqual(state.serializeBraceletState(state.createBraceletState(state.serializeBraceletState(collected.present))),state.serializeBraceletState(collected.present));
});
test('ordinary underfill keeps its terminal unused span instead of prematurely closing',()=>{
 const p=layoutStudio(plan(23,{layoutMode:'bracelet'}),700,600),a=p.points[0],b=p.points.at(-1),c=p.points[1];assert.equal(p.fit.nearComplete,false);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>Math.hypot(a.x-c.x,a.y-c.y)*1.8);
});
test('closed last-first gap is one global insertion boundary and adding a smaller fitting bead preserves the sequence',()=>{
 const s=plan(24,{layoutMode:'bracelet'}),p=layoutStudio(s,700,600),first=p.points[0],last=p.points.at(-1),pointer={x:(first.x+last.x)/2,y:(first.y+last.y)/2},gap=insertionForPoint(pointer,p);
 assert.equal(gap.index,24);assert.deepEqual({x:gap.x,y:gap.y},pointer);const h=state.createHistory(s),next=state.applyHistoryCommand(h,{type:'place',...bead(24,2),targetIndex:gap.index});assert.equal(next.present.instances.length,25);assert.deepEqual(next.present.instances.slice(0,24).map(i=>i.instanceId),s.instances.map(i=>i.instanceId));assert.equal(next.present.instances.at(-1).sizeMm,2);assert.deepEqual(state.undoHistory(next).present,s);
});
for(const trayMode of ['round','linear'])test(`near-complete ${trayMode} multiwrap stays one continuous sequence with honest ruler and one closure`,()=>{
 const s=plan(48,{layoutMode:'bracelet',trayMode,wrapCount:2}),p=layoutStudio(s,700,600);assert.equal(p.fit.closeOccupiedSpan,true);assert.equal(p.threadPath.turns.length,2);assert.equal(p.threadPath.closures.length,1);assert.deepEqual(p.threadPath.turns[0].points.at(-1),p.threadPath.turns[1].points[0]);assert.deepEqual(p.points.map(i=>i.instanceId),s.instances.map(i=>i.instanceId));
 if(trayMode==='linear'){for(const [n,g]of p.guides.entries()){const row=p.threadPath.turns[n],a=row.points.at(-2),b=row.points.at(-1);assert.ok(Math.abs(Math.abs(b.x-a.x)/p.scale-192)<1e-9);assert.ok(Math.abs(g.targetLengthMm-195.13274122871834)<1e-9);}}
 else for(let n=1;n<p.points.length;n++)assert.ok(p.points[n].threadDistance>p.points[n-1].threadDistance);
});
test('equal minimum diameters use the most permissive effective thickness and remain invariant after reorder',()=>{
 const instances=Array.from({length:24},(_,n)=>bead(n,8,{thicknessMm:n===0?1:n===1?12:10})),s=plan(24,{instances}),fit=fitEstimate(s);
 const accepted=state.applyHistoryCommand(state.createHistory(s),{type:'place',...bead(24,8,{thicknessMm:12})});assert.equal(accepted.present.instances.length,25,'the existing thicker 8 mm bead can actually fit');assert.equal(fit.nearComplete,false);assert.equal(fit.canAddReference,true);assert.equal(fit.referenceThicknessMm,12);
 const reordered=state.applyHistoryCommand(state.createHistory({...s,layoutMode:'bracelet'}),{type:'move',instanceId:'near-1',targetIndex:0}).present;const after=fitEstimate(reordered);assert.equal(after.nearComplete,fit.nearComplete);assert.equal(after.canAddReference,fit.canAddReference);assert.equal(after.referenceThicknessMm,12);
});
test('equal-diameter reference ties include nominal thickness fallback rather than favoring the first explicit thin bead',()=>{
 // Restrict the minimum-diameter tie to the first thin/fallback beads; other
 // along-thread bodies are larger and must not become the reference.
 const tied=plan(0,{wristCm:17,instances:[bead(0,8,{thicknessMm:1}),bead(1,8),...Array.from({length:22},(_,n)=>bead(n+2,8.01,{thicknessMm:10.65}))]});
 const actual=fitEstimate(tied),accepted=state.applyHistoryCommand(state.createHistory(tied),{type:'place',...bead(24,8)});assert.equal(accepted.present.instances.length,25);assert.equal(actual.referenceBeadMm,8);assert.equal(actual.referenceThicknessMm,8);assert.equal(actual.canAddReference,true);assert.equal(actual.nearComplete,false);assert.equal(fitEstimate({...tied,instances:[tied.instances[1],tied.instances[0],...tied.instances.slice(2)]}).nearComplete,actual.nearComplete);
});
