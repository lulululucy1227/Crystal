import { Canvas, Circle, FabricImage, FabricText, Group, Rect, Polyline } from '/vendor/fabric/index.min.mjs';
import { layoutStudio, insertionForPoint, looseCoordinates, settleLoose } from './studio-layout.mjs';

const TAU=Math.PI*2;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const inert={selectable:false,evented:false,originX:'center',originY:'center'};
const locked={originX:'center',originY:'center',hasControls:false,hasBorders:false,lockScalingX:true,lockScalingY:true,lockRotation:true,objectCaching:false};
const slotForPoint=(p,state,c)=>Math.round((((Math.atan2(p.y-c.y,p.x-c.x)+Math.PI/2)%TAU+TAU)%TAU)/TAU*state.capacity)%state.capacity;
function projectPointToRing(point,center,radius){const dx=point.x-center.x,dy=point.y-center.y,d=Math.hypot(dx,dy)||1;return {x:center.x+dx*radius/d,y:center.y+dy*radius/d};}
function project(state,width,height,viewOptions){
 if(state.layoutMode)return layoutStudio(state,width,height,viewOptions);
 const center={x:width/2,y:height/2},radius=Math.max(72,Math.min(width,height)*.34),slotDiameter=TAU*radius/Math.max(1,state.capacity);
 return {width,height,center,trayRadius:Math.min(width,height)*.44,trayMode:'round',guides:[],points:state.instances.map((i,index)=>{const a=i.slotIndex/state.capacity*TAU-Math.PI/2;return {instanceId:i.instanceId,index,x:center.x+Math.cos(a)*radius,y:center.y+Math.sin(a)*radius,diameter:clamp(slotDiameter*(i.sizeMm/state.fallbackBeadMm)*.9,28,72),rotationDeg:i.rotationDeg||0};}),radius};
}
function fallbackBead(instance,material){
 const options={fill:'#e2e4e3',stroke:'#76817e',strokeWidth:1,originX:'center',originY:'center'};
 const shape=instance.form&&instance.form!=='round'?new Rect(instance.form==='connector'?{...options,width:100,height:35,rx:6,ry:6}:{...options,width:100/Math.SQRT2,height:100/Math.SQRT2,angle:45}):new Circle({...options,radius:50,fill:material.fallbackColor||'#d7dde0'});
 const label=new FabricText(material.shortLabel||material.zhName?.slice(0,1)||'参',{fontFamily:'Microsoft YaHei UI, sans-serif',fontSize:24,fill:'#24323a',originX:'center',originY:'center'});
 const object=new Group([shape,label],{...locked,representationClass:'fallback'});object.baseSize=100;return object;
}
function sourceFor(instance,material){
 const atlas=instance.imageUrl?null:instance.atlas||material.atlas;
 const url=instance.imageUrl||instance.atlas?.url||material.imageUrl||atlas?.url;
 const unavailable=instance.form&&instance.form!=='round'&&!instance.imageUrl&&!material.imageUrl;
 const own=Boolean(instance.imageUrl||instance.atlas?.url),same=url===material.imageUrl||url===material.atlas?.url;
 return {atlas,url:unavailable?null:url,subjectBounds:instance.subjectBounds||(!own||same?material.subjectBounds:undefined),representationClass:(own?[instance.provenanceClass,same?material.provenanceClass:undefined]:[material.provenanceClass]).find(c=>c&&c!=='fallback')||'fallback'};
}
export function createBraceletCanvas({canvasElement,state,resolveMaterial,onCommand,trashElement}){
 if(!canvasElement)throw new TypeError('canvasElement is required');
 const canvas=new Canvas(canvasElement,{selection:false,preserveObjectStacking:true,renderOnAddRemove:false,enablePointerEvents:true});
 canvas.upperCanvasEl?.setAttribute?.('tabindex','0');canvas.upperCanvasEl?.setAttribute?.('aria-label',canvasElement.getAttribute?.('aria-label')||'Crystal Studio bead editor');
 let currentState=state,viewOptions={},projection,visibleViewport,disposed=false,sequence=0,frame=0,animationGeneration=0,drag=null,preview=null,visualKey='';
 const objects=new Map(),imageCache=new Map(),guides=[];
 const tray=new Circle({...inert,radius:1,fill:'#e2e4e7',stroke:'#c0c4ca',strokeWidth:2,shadow:{color:'rgba(36,42,51,.14)',blur:16,offsetX:0,offsetY:7}});
 const rim=new Circle({...inert,radius:1,fill:'transparent',stroke:'#f4f5f6',strokeWidth:2});
 const linearTray=new Rect({...inert,width:1,height:1,rx:22,ry:22,fill:'#e2e4e7',stroke:'#c0c4ca',strokeWidth:2,visible:false,shadow:{color:'rgba(36,42,51,.14)',blur:16,offsetY:7}});
 const gapMarker=new Rect({...inert,visible:false,width:2,height:34,fill:'#424953'});
 canvas.add(tray);canvas.add(rim);canvas.add(linearTray);canvas.add(gapMarker);
 const emit=command=>onCommand?.(command);
 const reduced=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??true;
 const cancelFrame=()=>{if(frame)globalThis.cancelAnimationFrame?.(frame);frame=0;animationGeneration++;};
 function selection(object){objects.forEach(o=>o.set({shadow:{color:o===object?'rgba(27,32,39,.32)':'rgba(27,32,39,.18)',blur:o===object?12:7,offsetX:2,offsetY:o===object?8:5}}));}
 function record(){if(!canvasElement.dataset)return;canvasElement.dataset.layoutMode=currentState.layoutMode||'slots';canvasElement.dataset.trayMode=currentState.trayMode||'round';canvasElement.dataset.wrapCount=String(currentState.wrapCount||1);canvasElement.dataset.instanceGeometry=JSON.stringify([...objects.values()].map(o=>({instanceId:o.data.instanceId,x:o.left,y:o.top,diameter:o.data.diameter,representationClass:o.representationClass||'fallback'})));}
 async function makeObject(instance,material,source){
  if(!source.url)return fallbackBead(instance,material);
  try{
   if(!imageCache.has(source.url))imageCache.set(source.url,FabricImage.fromURL(source.url,{crossOrigin:'anonymous'}));
   const template=await imageCache.get(source.url);
   const image=template.getElement?new FabricImage(template.getElement()):new FabricImage({width:template.width,height:template.height});
   const columns=Math.max(1,Number(source.atlas?.columns)||1),rows=Math.max(1,Number(source.atlas?.rows)||1),index=Math.max(0,Number(source.atlas?.index)||0),bounds=source.subjectBounds;
   const validBounds=!source.atlas&&bounds&&[bounds.left,bounds.top,bounds.width,bounds.height].every(Number.isFinite)&&bounds.left>=0&&bounds.top>=0&&bounds.width>0&&bounds.height>0&&bounds.left+bounds.width<=template.width&&bounds.top+bounds.height<=template.height;
   const width=validBounds?bounds.width:template.width/columns,height=validBounds?bounds.height:template.height/rows;
   image.set({...locked,width,height,cropX:validBounds?bounds.left:source.atlas?index%columns*width:0,cropY:validBounds?bounds.top:source.atlas?Math.floor(index/columns)*height:0,representationClass:source.representationClass});image.baseSize=validBounds?width:Math.max(width,height);return image;
  }catch{return fallbackBead(instance,material);}
 }
 function drawGuides(){
  const p=projection,round=p.trayMode==='round';
  tray.set({left:p.center.x,top:p.center.y,radius:currentState.layoutMode?p.trayRadius:p.radius,visible:round&&!viewOptions.presentation});rim.set({left:p.center.x,top:p.center.y,radius:p.trayRadius-7,visible:round&&!!currentState.layoutMode&&!viewOptions.presentation});
  linearTray.set({left:p.center.x,top:p.center.y,width:p.width*.97,height:p.height*.91,visible:!round&&!viewOptions.presentation});
  guides.forEach(o=>{canvas.remove(o);o.dispose?.();});guides.length=0;
  // The minimum-size canvas is centered inside a sometimes shorter stage.
  // Keep labels in the actually visible region, not the clipped canvas edge.
  const fitLabel=label=>{const vw=Math.min(p.width,visibleViewport?.width||p.width),vh=Math.min(p.height,visibleViewport?.height||p.height),x=(p.width-vw)/2,y=(p.height-vh)/2,w=label.getScaledWidth?.()||label.width||0,h=label.getScaledHeight?.()||label.height||label.fontSize*1.2;label.set({left:clamp(label.left,x+8+w/2,x+vw-8-w/2),top:clamp(label.top,y+8+h/2,y+vh-8-h/2)});return label;};
  if(currentState.layoutMode==='bracelet'&&p.threadPath){
   const addThread=(part,kind,id)=>{const xs=part.points.map(p=>p.x),ys=part.points.map(p=>p.y);const line=new Polyline(part.points,{...inert,threadGuide:true,threadPart:kind,threadId:id,threadRow:part.row,left:(Math.min(...xs)+Math.max(...xs))/2,top:(Math.min(...ys)+Math.max(...ys))/2,fill:null,stroke:kind==='closure'?'#919aa5':'#697480',strokeWidth:kind==='closure'?1:1.25,strokeDashArray:kind==='closure'?[4,4]:null,opacity:.9});guides.push(line);canvas.add(line);};
   p.threadPath.turns.forEach(turn=>addThread(turn,'turn',`turn-${turn.row}`));p.threadPath.closures.forEach((closure,n)=>addThread(closure,'closure',`closure-${n}`));
   const caption=fitLabel(new FabricText('一根线 · 同向绕行 / 回接为二维示意',{...inert,left:p.center.x,top:18,fontSize:11,fontFamily:'Microsoft YaHei UI, sans-serif',fill:'#555d68'}));guides.push(caption);canvas.add(caption);
  }
  if(!viewOptions.presentation&&(currentState.layoutMode==='bracelet'||!round))p.guides.filter(g=>g.visible!==false).forEach(g=>{
   const label=fitLabel(new FabricText(`${round?`第 ${g.row+1} 圈 · ${g.count?`${g.startIndex+1}–${g.startIndex+g.count}`:'未填'}`:`第 ${g.wrapIndex} 圈 ${g.direction>0?'→':'←'}`}`,{...inert,left:g.labelX,top:g.labelY-(round?0:23),fontSize:11,fontFamily:'Microsoft YaHei UI, sans-serif',fill:'#49515c'}));
   guides.push(label);canvas.add(label);
   if(!round){
    const guide=new Rect({...inert,railGuide:true,left:(g.x1+g.x2)/2,top:g.y+24,width:g.x2-g.x1,height:1,fill:'#7b838d'});guides.push(guide);canvas.add(guide);
    for(let mm=0;mm<=g.lengthMm;mm+=10){const x=g.x1+mm*p.scale;const tick=new Rect({...inert,left:x,top:g.y+24,width:1,height:mm%50===0?7:3,fill:'#8b929b'});guides.push(tick);canvas.add(tick);}
    for(const [text,x,y] of [['0 mm',g.direction>0?g.x1:g.x2,g.y+39],[`${g.targetLengthMm.toFixed(1)} mm`,g.direction>0?g.x2:g.x1,g.y+39],['正手',p.width*(g.direction>0?.3:.7),g.y-52],['背手',p.width*(g.direction>0?.7:.3),g.y-52]]){const textObject=fitLabel(new FabricText(text,{...inert,left:x,top:y,fontSize:11,fontFamily:'Microsoft YaHei UI, sans-serif',fill:'#555d68'}));guides.push(textObject);canvas.add(textObject);}
    const divider=new Rect({...inert,left:p.center.x,top:g.y,width:1,height:70,fill:'#aab0b8',opacity:.6});guides.push(divider);canvas.add(divider);
   }
  });
  objects.forEach(o=>canvas.bringObjectToFront?.(o));canvas.bringObjectToFront?.(gapMarker);
 }
 async function render(nextState=currentState,options=viewOptions){
  if(disposed)return;currentState=nextState;viewOptions=options;const token=++sequence;
  const key=JSON.stringify([canvas.getWidth(),canvas.getHeight(),nextState.layoutMode,nextState.trayMode,nextState.wrapCount,nextState.wristCm,nextState.allowanceMm,nextState.instances,viewOptions]);
  if(key===visualKey){const selected=objects.get(nextState.selectedInstanceId);if(selected&&selected.visible!==false)canvas.setActiveObject(selected);else canvas.discardActiveObject();selection(selected);canvas.requestRenderAll();return;}
  cancelFrame();projection=project(nextState,canvas.getWidth(),canvas.getHeight(),viewOptions);const localProjection=projection;
  const desired=await Promise.all(nextState.instances.map(async instance=>{
   const material=resolveMaterial?.(instance.materialName,instance)||{},source=sourceFor(instance,material),assetKey=JSON.stringify([source,instance.form,source.url?null:material.shortLabel]);
   const existing=objects.get(instance.instanceId);
   if(existing?.assetKey===assetKey)return {instance,object:existing,isNew:false};
   const object=await makeObject(instance,material,source);object.assetKey=assetKey;return {instance,object,isNew:true};
  }));
  if(disposed||token!==sequence){desired.filter(x=>x.isNew).forEach(x=>x.object.dispose?.());return;}
  const ids=new Set(desired.map(x=>x.instance.instanceId));
  for(const [id,o]of objects)if(!ids.has(id)){canvas.remove(o);o.dispose?.();objects.delete(id);}
  const transitions=[];
  desired.forEach(({instance,object,isNew},index)=>{
   const p=localProjection.points[index];
   if(isNew){const old=objects.get(instance.instanceId);if(old){canvas.remove(old);old.dispose?.();}canvas.add(object);objects.set(instance.instanceId,object);}
   object.set({data:{instanceId:instance.instanceId,materialName:instance.materialName,diameter:p.diameter},hoverCursor:'grab',moveCursor:'grabbing',opacity:1,visible:p.visible!==false,evented:p.visible!==false&&!options.presentation,selectable:p.visible!==false&&!options.presentation});
   const target={left:p.x,top:p.y,scaleX:p.diameter/object.baseSize,scaleY:p.diameter/object.baseSize,angle:p.rotationDeg||0};
   transitions.push({object,from:{left:object.left??p.x,top:object.top??p.y,scaleX:object.scaleX??target.scaleX,scaleY:object.scaleY??target.scaleY,angle:object.angle||0},target});
   if(isNew||reduced()||!globalThis.requestAnimationFrame)object.set(target);
  });
  visualKey=key;drawGuides();const selected=objects.get(currentState.selectedInstanceId);if(selected&&selected.visible!==false)canvas.setActiveObject(selected);else canvas.discardActiveObject();
  function finish(){transitions.forEach(({object,target})=>{object.set(target);object.setCoords();});selection(objects.get(currentState.selectedInstanceId));record();canvas.requestRenderAll();frame=0;}
  if(!reduced()&&globalThis.requestAnimationFrame&&transitions.length){const start=performance.now(),generation=animationGeneration;const tick=now=>{if(disposed||generation!==animationGeneration)return;const t=Math.min(1,(now-start)/240),ease=1-Math.pow(1-t,3);transitions.forEach(({object,from,target})=>object.set(Object.fromEntries(Object.entries(target).map(([k,v])=>[k,from[k]+(v-from[k])*ease]))));selection(objects.get(currentState.selectedInstanceId));canvas.requestRenderAll();if(t<1)frame=requestAnimationFrame(tick);else finish();};frame=requestAnimationFrame(tick);}else finish();
 }
 function resize(){const host=canvasElement.parentElement?.parentElement?.classList?.contains('p4-tray-stage')?canvasElement.parentElement.parentElement:canvasElement.parentElement;visibleViewport={width:host?.clientWidth||520,height:host?.clientHeight||520};canvas.setDimensions({width:Math.max(280,visibleViewport.width),height:Math.max(300,visibleViewport.height)});visualKey='';return render(currentState);}
 function commit(command){visualKey='';drag=null;preview=null;gapMarker.set({visible:false});emit(command);render(currentState);}
 function overTrash(event){const rect=trashElement?.getBoundingClientRect?.(),e=event?.e;return !!(rect&&e&&e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom);}
 canvas.on('mouse:down',event=>{
  if(viewOptions.presentation)return;
  const object=event.target;
  if(object?.visible===false)return;
  if(object?.data?.instanceId){drag={id:object.data.instanceId};emit({type:'select-instance',instanceId:drag.id});return;}
  // In a strung tray the active material can be inserted into a visible gap.
  // Loose blank space is not an implicit placement target.
  if(currentState.layoutMode==='bracelet'&&currentState.activeMaterialName){
   const pointer=canvas.getScenePoint(event.e),gap=insertionForPoint(pointer,projection),material=resolveMaterial?.(currentState.activeMaterialName)||{};
   if(projection.points.length&&Math.hypot(pointer.x-gap.x,pointer.y-gap.y)>Math.max(28,(material.sizeMm||8)*projection.scale))return;
   emit({...material,type:'place',materialName:currentState.activeMaterialName,targetIndex:gap.index});return;
  }
  if(currentState.layoutMode||!currentState.activeMaterialName)return;
  const pointer=canvas.getScenePoint(event.e),material=resolveMaterial?.(currentState.activeMaterialName)||{};
  emit({...material,type:'place',materialName:currentState.activeMaterialName,slotIndex:slotForPoint(pointer,currentState,projection.center)});
 });
 canvas.on('object:moving',event=>{
  cancelFrame();
  const object=event.target;if(!object?.data?.instanceId||object.visible===false)return;
  const pointer={x:object.left,y:object.top};drag={id:object.data.instanceId,pointer};
  const inTrash=overTrash(event);trashElement?.classList?.toggle('drop-active',inTrash);object.set({opacity:inTrash?.5:1});
  if(currentState.layoutMode==='loose'&&!inTrash){
   preview=settleLoose(projection.points,object.data.instanceId,pointer,projection);
   preview.forEach(p=>{const o=objects.get(p.instanceId);o?.set({left:p.x,top:p.y});o?.setCoords();});
  }else if(currentState.layoutMode==='bracelet'&&!inTrash){
   const gap=insertionForPoint(pointer,projection,object.data.instanceId);drag.gap=gap;gapMarker.set({visible:true,left:gap.x,top:gap.y});canvas.bringObjectToFront?.(gapMarker);
   const remaining=currentState.instances.filter(i=>i.instanceId!==object.data.instanceId),moving=currentState.instances.find(i=>i.instanceId===object.data.instanceId);
   remaining.splice(gap.index,0,moving);
   const projected=project({...currentState,instances:remaining},projection.width,projection.height,viewOptions);
   projected.points.filter(p=>p.instanceId!==object.data.instanceId).forEach(p=>{const o=objects.get(p.instanceId);o?.set({left:o.left+(p.x-o.left)*.65,top:o.top+(p.y-o.top)*.65});o?.setCoords();});
  }else if(!currentState.layoutMode){const p=projectPointToRing(pointer,projection.center,projection.radius);object.set({left:p.x,top:p.y});}
  selection(object);canvas.requestRenderAll();
 });
 canvas.on('object:modified',event=>{
  const object=event.target;if(!object?.data?.instanceId||object.visible===false)return;trashElement?.classList?.remove('drop-active');
  if(overTrash(event)){commit({type:'remove',instanceId:object.data.instanceId});return;}
  if(currentState.layoutMode==='loose'){
   const settled=preview||settleLoose(projection.points,object.data.instanceId,{x:object.left,y:object.top},projection);
   const moved=looseCoordinates(settled.find(p=>p.instanceId===object.data.instanceId),projection);
   const neighbors=settled.some(p=>p.instanceId!==object.data.instanceId&&(p.x!==projection.points.find(q=>q.instanceId===p.instanceId).x||p.y!==projection.points.find(q=>q.instanceId===p.instanceId).y));
   const changed=settled.filter(p=>{const before=projection.points.find(q=>q.instanceId===p.instanceId);return Math.hypot(p.x-before.x,p.y-before.y)>1e-8;});
   commit(neighbors?{type:'settle',positions:changed.map(p=>looseCoordinates(p,projection))}:{type:'move',...moved});return;
  }
  if(currentState.layoutMode==='bracelet'){const gap=drag?.gap||insertionForPoint({x:object.left,y:object.top},projection,object.data.instanceId);commit({type:'move',instanceId:object.data.instanceId,targetIndex:Math.min(currentState.instances.length-1,gap.index)});return;}
  commit({type:'move',instanceId:object.data.instanceId,slotIndex:slotForPoint({x:object.left,y:object.top},currentState,projection.center)});
 });
 const observer=typeof ResizeObserver==='function'?new ResizeObserver(()=>resize()):null;observer?.observe(canvasElement.parentElement?.parentElement||canvasElement.parentElement);
 resize();
 return {render,resize,
  dropMaterial(material,clientX,clientY){const rect=canvasElement.getBoundingClientRect(),pointer={x:(clientX-rect.left)*canvas.getWidth()/rect.width,y:(clientY-rect.top)*canvas.getHeight()/rect.height};const gap=insertionForPoint(pointer,projection);const diameter=(material.sizeMm||8)*projection.scale;emit({...material,type:'place',targetIndex:currentState.layoutMode==='bracelet'?gap.index:undefined,...looseCoordinates({...pointer,diameter},projection)});},
  async exportImage(){await render(currentState,viewOptions);cancelFrame();const points=project(currentState,canvas.getWidth(),canvas.getHeight(),viewOptions).points;points.forEach(p=>{const object=objects.get(p.instanceId);if(object){object.set({left:p.x,top:p.y,scaleX:p.diameter/object.baseSize,scaleY:p.diameter/object.baseSize,angle:p.rotationDeg||0});object.setCoords();}});record();selection(null);gapMarker.set({visible:false});canvas.discardActiveObject();canvas.renderAll();const url=canvas.toDataURL({format:'png',multiplier:2});selection(objects.get(currentState.selectedInstanceId));canvas.requestRenderAll();return url;},
  dispose(){disposed=true;sequence++;cancelFrame();observer?.disconnect();imageCache.clear();canvas.dispose();}
 };
}
