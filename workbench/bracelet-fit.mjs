// Authoritative planning budget. Centerline length is not wrist circumference.
// Thickness is provisional where only a nominal bead diameter is available.
const positive=value=>typeof value==='number'&&Number.isFinite(value)&&value>0;
const EPSILON=1e-9; // Floating-point boundary noise only, never a fit allowance.
export function fitEstimate({wristCm,instances=[],allowanceMm=0,wrapCount=1}={}){
 const rows=Array.isArray(instances)?instances:[],wraps=[1,2,3].includes(wrapCount)?wrapCount:1;
 let usedMm=0,missingSizeCount=0,thickness=0;
 for(const i of rows){const size=i?.sizeMm??i?.size_mm;if(positive(size))usedMm+=size;if(!positive(size)||i?.fitSizeUnknown)missingSizeCount++;thickness+=positive(i?.thicknessMm)?i.thicknessMm:positive(size)?size:0;}
 const meanThicknessMm=rows.length?thickness/rows.length:0;
 const innerTargetMm=positive(wristCm)&&Number.isFinite(allowanceMm)&&allowanceMm>=0?(wristCm*10+allowanceMm)*wraps:null;
 const thicknessCorrectionMm=Math.PI*meanThicknessMm*wraps;
 const targetMm=innerTargetMm===null?null:innerTargetMm+thicknessCorrectionMm;
 const deltaMm=targetMm===null?null:usedMm-targetMm;
 const status=targetMm===null||missingSizeCount||!Array.isArray(instances)?'unknown':deltaMm>EPSILON?'overflow':deltaMm<-EPSILON?'underfilled':'fit';
 const canCollect=rows.length>0&&!['overflow','unknown'].includes(status);
 const effectiveThickness=i=>positive(i.thicknessMm)?i.thicknessMm:(i.sizeMm??i.size_mm);
 // At equal minimum diameter, use the largest effective thickness: it yields
 // the most permissive next budget and cannot change merely by reordering.
 const reference=canCollect?rows.reduce((smallest,i)=>{const size=i.sizeMm??i.size_mm,min=smallest.sizeMm??smallest.size_mm;return size<min||(size===min&&effectiveThickness(i)>effectiveThickness(smallest))?i:smallest;}):null;
 const referenceBeadMm=reference?(reference.sizeMm??reference.size_mm):null;
 const referenceThicknessMm=reference?(positive(reference.thicknessMm)?reference.thicknessMm:referenceBeadMm):null;
 // Probe the same formula without recursion or an arbitrary residual tolerance.
 const nextTargetMm=reference?innerTargetMm+Math.PI*(thickness+referenceThicknessMm)/(rows.length+1)*wraps:null;
 const canAddReference=reference?usedMm+referenceBeadMm<=nextTargetMm+EPSILON:false;
 const nearComplete=canCollect&&status==='underfilled'&&!canAddReference;
 const closeOccupiedSpan=canCollect&&(status==='fit'||nearComplete);
 return {targetMm,usedMm,deltaMm,status,confidence:'approximate',missingSizeCount,wrapCount:wraps,allowanceMm,innerTargetMm,meanThicknessMm,thicknessCorrectionMm,estimatedInnerMm:Math.max(0,usedMm-thicknessCorrectionMm),thicknessAssumed:rows.some(i=>!positive(i?.thicknessMm)),canCollect,referenceBeadMm,referenceThicknessMm,canAddReference,nearComplete,closeOccupiedSpan};
}
export function fitChangeAllowed(before,after){
 const old=fitEstimate(before),next=fitEstimate(after);
 if(next.status==='unknown'){
  if(next.missingSizeCount<old.missingSizeCount)return true;
  // An unresolved neighbour must not prevent a safe, smaller known-size edit.
  // Ignore only the derived angle, which legitimately changes on a strung edit.
  const unknown=state=>state.instances.filter(i=>i.fitSizeUnknown||!positive(i.sizeMm??i.size_mm)).map(({angle,...i})=>i);
  return before.instances.length===after.instances.length&&next.usedMm<old.usedMm-EPSILON&&Math.max(next.deltaMm,0)<=Math.max(old.deltaMm,0)+EPSILON&&JSON.stringify(unknown(before))===JSON.stringify(unknown(after));
 }
 return next.status!=='overflow'||(old.deltaMm>0&&next.deltaMm<old.deltaMm-EPSILON);
}
export function fitRejectionMessage(state){
 const fit=fitEstimate(state);
 return fit.status==='unknown'?'尺寸待核对，不能确认成串。请先补全或修正珠子尺寸。':`超出所选手围规划上限${fit.deltaMm>0?`约 ${fit.deltaMm.toFixed(1)} mm`:''}；请减少珠子、改小尺寸，或明确调整手围、圈数及余量。原作品未删减。`;
}
