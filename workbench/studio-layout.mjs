// Pure screen projection. Neither layouts nor hit testing mutate design order.
import {fitEstimate} from './bracelet-fit.mjs';
const TAU = Math.PI * 2;
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
function spiral(instances,wraps,budget,maxMm){
  const total=instances.reduce((n,i)=>n+i.sizeMm,0),span=Math.max(budget,total,1),pitch=wraps>1?maxMm*1.12:0;
  let base=Math.max(maxMm/2,span/(TAU*wraps)-pitch*wraps/2);
  const sample=()=>{const path=[];let distance=0;for(let n=0;n<=wraps*128;n++){const theta=n/128*TAU,radius=base+pitch*theta/TAU,point={x:Math.cos(theta-Math.PI/2)*radius,y:Math.sin(theta-Math.PI/2)*radius,theta};if(n)distance+=Math.hypot(point.x-path[n-1].x,point.y-path[n-1].y);path.push({...point,distance});}return path;};
  let path,points;
  for(let attempt=0;attempt<80;attempt++){
    path=sample();const factor=path.at(-1).distance/span;let used=0,cursor=1;
    points=instances.map((item,index)=>{const distance=(used+item.sizeMm/2)*factor;used+=item.sizeMm;while(cursor<path.length-1&&path[cursor].distance<distance)cursor++;const a=path[cursor-1],b=path[cursor],t=clamp((distance-a.distance)/(b.distance-a.distance),0,1),theta=a.theta+(b.theta-a.theta)*t;return {instanceId:item.instanceId,index,x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,diameter:item.sizeMm,row:Math.min(wraps-1,Math.floor(theta/TAU)),angle:theta-Math.PI/2,threadDistance:distance,rotationDeg:item.rotationDeg||0};});
    let overlap=false;for(let a=0;a<points.length&&!overlap;a++)for(let b=a+1;b<points.length;b++)if(Math.hypot(points[a].x-points[b].x,points[a].y-points[b].y)<(points[a].diameter+points[b].diameter)/2+.02){overlap=true;break;}
    if(!overlap)break;base=base*1.04+.05;
  }
  return {path,points,extent:base+pitch*wraps+maxMm/2};
}
export function layoutStudio(state,width,height,options={}){
  const originals=state.instances||[];
  // A conservative enclosing circle for nonround source bodies, not a product
  // dimension. Keep the render width and BOM's along-string size unchanged.
  const footprint=i=>{const b=i.subjectBounds;if(!b||!(b.width>0&&b.height>0))return i.sizeMm;const ratio=b.height/b.width;return i.sizeMm*(i.form==='round'?Math.max(1,ratio):Math.hypot(1,ratio));};
  const projection=layoutProjection({...state,fit:fitEstimate(state),instances:originals.map(i=>({...i,sizeMm:footprint(i)}))},width,height,options);
  projection.points.forEach((p,n)=>{p.collisionDiameter=p.diameter;p.diameter=originals[n].sizeMm*projection.scale;});
  return projection;
}
function layoutProjection(state, width, height, {linearSection='all',closeResidual=true}={}) {
  const center = {x: width / 2, y: height / 2};
  const trayRadius = Math.min(width, height) * .44;
  const trayMode = state.trayMode || 'round';
  const instances = state.instances || [];
  const maxMm = Math.max(state.fallbackBeadMm || 8, ...instances.map(i => i.sizeMm));
  let scale = Math.min(width / 110, 96 / maxMm);
  const guides = [], points = [],railY=[];let threadPath;
  const total = instances.reduce((n,i)=>n+i.sizeMm,0);
  const desiredLength=(state.fit.targetMm??170)/(state.wrapCount||1);
  const wraps=state.wrapCount||1;
  const occupied=state.layoutMode==='bracelet'&&closeResidual&&state.fit.closeOccupiedSpan;
  const displayLength=occupied?state.fit.usedMm/wraps:desiredLength;
  const linearGroups=trayMode==='linear'?Array.from({length:wraps},()=>[]):[];
  if(trayMode==='linear'){let used=0;const rowLength=Math.max(displayLength,total/wraps);instances.forEach((item,index)=>{const row=Math.min(wraps-1,Math.floor((used+item.sizeMm/2)/rowLength));linearGroups[row].push({item,index});used+=item.sizeMm;});scale=Math.min(scale,width*.84/desiredLength);}
  while(trayMode==='linear'&&linearGroups.length<wraps)linearGroups.push([]);
  const sections=new Map(linearGroups.flatMap(g=>{let used=0;return g.map(({item,index})=>{const section=used+item.sizeMm/2<=desiredLength/2?'front':'back';used+=item.sizeMm;return [index,section];});}));
  if (state.layoutMode === 'loose') {
    // Keep enough free ceramic area for bounded local yielding at dense counts.
    const squareSum=instances.reduce((n,i)=>n+i.sizeMm*i.sizeMm,0);
    if(squareSum)scale=Math.min(scale,trayRadius*Math.sqrt(1.1/squareSum));
    if(trayMode==='linear')scale*=Math.min(1,Math.min(width*.44,height*.36)/trayRadius);
    instances.forEach((i, index) => {
      const diameter = i.sizeMm * scale;
      const rx = trayMode === 'round' ? trayRadius - diameter / 2 : width * .44 - diameter / 2;
      const ry = trayMode === 'round' ? trayRadius - diameter / 2 : height * .36 - diameter / 2;
      const nx=trayMode==='linear'?(i.looseLinearX??i.looseX):i.looseX,ny=trayMode==='linear'?(i.looseLinearY??i.looseY):i.looseY;
      points.push({instanceId:i.instanceId,index,x:center.x+(nx-.5)*2*rx,y:center.y+(ny-.5)*2*ry,diameter,rotationDeg:i.rotationDeg || 0,row:0});
    });
  } else if (trayMode === 'linear') {
    const groups = linearGroups;
    const lengths = groups.map(g => g.reduce((n,{item})=>n+item.sizeMm,0));
    // Charge each continuous run only for its own enclosing bead height. A
    // common scale preserves material proportions; a fixed label lane separates
    // rows without multiplying every row by the single largest irregular bead.
    const heights=groups.map(g=>Math.max(state.fallbackBeadMm||8,...g.map(({item})=>item.sizeMm)));
    const labelLane=Math.min(62,height*.35/wraps),sumHeight=heights.reduce((n,h)=>n+h,0);
    scale = Math.min(width/110,(width*.84)/Math.max(desiredLength,...lengths),(height*.85-labelLane*wraps)/sumHeight);
    let top=center.y-(sumHeight*scale+labelLane*wraps)/2;
    groups.forEach((g,row)=>{
      const y=top+labelLane/2+heights[row]*scale/2;top+=heights[row]*scale+labelLane;railY[row]=y;
      const direction = row%2?-1:1;
      let used = 0;
      g.forEach(({item,index})=>{
        const x=center.x+direction*((used+item.sizeMm/2-Math.max(displayLength,...lengths)/2)*scale);used+=item.sizeMm;
        points.push({instanceId:item.instanceId,index,x,y,diameter:item.sizeMm*scale,rotationDeg:item.rotationDeg||0,row,direction});
      });
    });
  } else {
    const continuous=spiral(instances,wraps,occupied?state.fit.usedMm:state.fit.targetMm??total,maxMm);
    scale=Math.min(scale,(trayRadius-12)/continuous.extent);
    const screen=p=>({x:center.x+p.x*scale,y:center.y+p.y*scale});
    points.push(...continuous.points.map(p=>({...p,...screen(p),diameter:p.diameter*scale})));
    const turns=Array.from({length:wraps},(_,row)=>({row,points:continuous.path.slice(row*128,(row+1)*128+1).map(screen)}));
    threadPath={kind:'spiral-schematic',turns,closures:[{points:[turns.at(-1).points.at(-1),turns[0].points[0]],crossover:wraps>1}]};
    turns.forEach((turn,row)=>{const members=points.filter(p=>p.row===row);guides.push({row,labelX:center.x+(row-(wraps-1)/2)*width/(wraps+1),labelY:height-10,startIndex:members[0]?.index??instances.length,count:members.length,direction:1,targetLengthMm:desiredLength});});
  }
  if(trayMode==='linear'){
    linearGroups.forEach((g,row)=>{
      const y=railY[row]??height*(.2+.6*(row+.5)/wraps),x1=center.x-desiredLength*scale/2,x2=center.x+desiredLength*scale/2;
      guides.push({row,y,x1,x2,labelX:width*.045,labelY:y,lengthMm:desiredLength,targetLengthMm:desiredLength,direction:row%2?-1:1,startIndex:g[0]?.index??0,count:g.length,wrapIndex:row+1});
    });
    // The planning ruler stays fixed. A legacy overflow schematic must still
    // carry every visible bead on its actual thread, rather than truncate it.
    const threadLength=Math.max(displayLength,...linearGroups.map(g=>g.reduce((sum,{item})=>sum+item.sizeMm,0)));
    const threadX1=center.x-threadLength*scale/2,threadX2=center.x+threadLength*scale/2;
    const turns=guides.map((g,row)=>{const start={x:g.direction>0?threadX1:threadX2,y:g.y},end={x:g.direction>0?threadX2:threadX1,y:g.y};return {row,points:row?[start,start,end]:[start,end]};});
    // Each row owns its incoming turn; exactly one return closes the whole run.
    turns.forEach((turn,row)=>{if(row)turn.points[0]=turns[row-1].points.at(-1);});
    const first=turns[0].points[0],last=turns.at(-1).points.at(-1),outside=width*.97;
    threadPath={kind:'serpentine-unfolded',turns,closures:[{points:[last,{x:outside,y:last.y+24},{x:outside,y:first.y-24},first],crossover:false}]};
  }
  points.forEach(p=>{p.section=sections.get(p.index);p.visible=trayMode!=='linear'||linearSection==='all'||p.section===linearSection;});
  guides.forEach(g=>{g.visible=true;});
  return {width,height,center,trayRadius,trayMode,scale,points,guides,fit:state.fit,threadPath,closedOccupiedSpan:occupied};
}
export function insertionForPoint(pointer, projection, excludeId) {
  const points=projection.points.filter(p=>p.instanceId!==excludeId);
  if(!points.length)return {index:0,x:pointer.x,y:pointer.y};
  const gaps=[];
  const closedRound=projection.trayMode==='round'&&projection.threadPath?.turns.length===1&&projection.closedOccupiedSpan;
  points.forEach((p,n)=>{
    if(p.visible===false)return;
    const previous=points[n-1];
    if(previous&&previous.visible!==false)gaps.push({index:n,x:(p.x+previous.x)/2,y:(p.y+previous.y)/2});
    else if(!closedRound)gaps.push({index:n,x:p.x-(p.direction||1)*p.diameter*.65,y:p.y});
    const next=points[n+1];if(!closedRound&&(!next||next.visible===false||next.row!==p.row))gaps.push({index:n+1,x:p.x+(p.direction||1)*p.diameter*.65,y:p.y});
  });
  if(closedRound){const first=points[0],last=points.at(-1);gaps.push({index:points.length,x:(first.x+last.x)/2,y:(first.y+last.y)/2});}
  if(!gaps.length)return {index:points.length,x:pointer.x,y:pointer.y};
  return gaps.reduce((best,g)=>Math.hypot(g.x-pointer.x,g.y-pointer.y)<Math.hypot(best.x-pointer.x,best.y-pointer.y)?g:best);
}
export function looseCoordinates(point, projection) {
  const extent=point.collisionDiameter??point.diameter;
  const rx=projection.trayMode==='round'?projection.trayRadius-extent/2:projection.width*.44-extent/2;
  const ry=projection.trayMode==='round'?projection.trayRadius-extent/2:projection.height*.36-extent/2;
  const x=.5+(point.x-projection.center.x)/(2*Math.max(1,rx)),y=.5+(point.y-projection.center.y)/(2*Math.max(1,ry));
  return {instanceId:point.instanceId,...(projection.trayMode==='linear'?{looseLinearX:x,looseLinearY:y}:{looseX:x,looseY:y})};
}
export function settleLoose(points, activeId, pointer, projection) {
  const result=points.map(p=>({...p}));const active=result.find(p=>p.instanceId===activeId);if(!active)return result;
  active.x=pointer.x;active.y=pointer.y;
  const constrain=p=>{
    const extent=p.collisionDiameter??p.diameter;
    if(projection.trayMode==='round'){
      const dx=p.x-projection.center.x,dy=p.y-projection.center.y,d=Math.hypot(dx,dy),limit=projection.trayRadius-extent/2;
      if(d>limit){p.x=projection.center.x+dx*limit/d;p.y=projection.center.y+dy*limit/d;}
    }else{const rx=projection.width*.44-extent/2,ry=projection.height*.36-extent/2;p.x=clamp(p.x,projection.center.x-rx,projection.center.x+rx);p.y=clamp(p.y,projection.center.y-ry,projection.center.y+ry);}
  };
  constrain(active);
  const affected=new Set([activeId]);
  for(let iteration=0;iteration<24;iteration++){
    let changed=false;
    for(let a=0;a<result.length;a++)for(let b=a+1;b<result.length;b++){
      const p=result[a],q=result[b],dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy),need=((p.collisionDiameter??p.diameter)+(q.collisionDiameter??q.diameter))/2+1;
      if(!affected.has(p.instanceId)&&!affected.has(q.instanceId))continue;
      if(d>=need-.02)continue;changed=true;const nx=d?dx/d:Math.cos(a*2.4+b),ny=d?dy/d:Math.sin(a*2.4+b),overlap=(need-d)*.8;
      affected.add(p.instanceId);affected.add(q.instanceId);
      const pWeight=p===active?0:q===active?1:.5,qWeight=1-pWeight;
      p.x-=nx*overlap*pWeight;p.y-=ny*overlap*pWeight;q.x+=nx*overlap*qWeight;q.y+=ny*overlap*qWeight;constrain(p);constrain(q);
    }
    if(!changed)break;
  }
  return result;
}
