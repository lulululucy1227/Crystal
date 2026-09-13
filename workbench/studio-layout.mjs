// Pure screen projection. Neither layouts nor hit testing mutate design order.
const TAU = Math.PI * 2;
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
function groupsFor(instances, count, weights) {
  const groups = Array.from({length: Math.min(Math.max(1, count), Math.max(1, instances.length))}, () => []);
  const total = instances.reduce((n, i) => n + i.sizeMm, 0);
  const shares=groups.map((_,n)=>weights?.[n]||1),weightTotal=shares.reduce((n,v)=>n+v,0);
  const thresholds=shares.map((_,n)=>total*shares.slice(0,n+1).reduce((a,b)=>a+b,0)/weightTotal);
  let used = 0, group = 0;
  instances.forEach((item, index) => {
    if (group < groups.length - 1 && groups[group].length && used + item.sizeMm / 2 > thresholds[group]) group++;
    groups[group].push({item, index}); used += item.sizeMm;
  });
  return groups.filter(g => g.length);
}
function ringRadius(group) {
  const total = group.reduce((n, {item}) => n + item.sizeMm, 0);
  let radius = 0;
  if (group.length > 1) group.forEach(({item}, i) => {
    const pair = item.sizeMm + group[(i + 1) % group.length].item.sizeMm;
    radius = Math.max(radius, pair / (4 * Math.sin(Math.PI * pair / (2 * total))));
  });
  return radius;
}
export function layoutStudio(state, width, height, {linearSection='all'}={}) {
  const center = {x: width / 2, y: height / 2};
  const trayRadius = Math.min(width, height) * .44;
  const trayMode = state.trayMode || 'round';
  const instances = state.instances || [];
  const maxMm = Math.max(state.fallbackBeadMm || 8, ...instances.map(i => i.sizeMm));
  let scale = Math.min(width / 110, 96 / maxMm);
  const guides = [], points = [];
  const total = instances.reduce((n,i)=>n+i.sizeMm,0);
  const desiredLength=(state.wristCm||17)*10+(state.allowanceMm??5)+Math.PI*maxMm;
  const linearGroups=trayMode==='linear'?groupsFor(instances,2*Math.max(state.wrapCount||1,Math.ceil(total/desiredLength))):[];
  const sections=new Map(linearGroups.flatMap((g,row)=>g.map(({index})=>[index,row%2?'back':'front'])));
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
    scale = Math.min(scale,(width*.84)/Math.max(maxMm,...lengths),(height*.68)/Math.max(maxMm,groups.length*maxMm*1.8));
    const pitch = maxMm * scale * 1.8;
    groups.forEach((g,row)=>{
      const y = center.y + (row-(groups.length-1)/2)*pitch;
      const direction = row%2 ? -1 : 1;
      let used = 0;
      guides.push({row,y,x1:width*.07,x2:width*.93,direction,startIndex:g[0].index,count:g.length,section:row%2?'back':'front',wrapIndex:Math.floor(row/2)+1});
      g.forEach(({item,index})=>{
        const x=center.x+direction*((used+item.sizeMm/2-lengths[row]/2)*scale);used+=item.sizeMm;
        points.push({instanceId:item.instanceId,index,x,y,diameter:item.sizeMm*scale,rotationDeg:item.rotationDeg||0,row,direction});
      });
    });
  } else {
    const wraps=state.wrapCount||1,total=instances.reduce((n,i)=>n+i.sizeMm,0);
    const innerRadius=Math.max(maxMm/2,total/(TAU*wraps)-maxMm*(wraps-1)/2);
    const groups = groupsFor(instances, wraps, Array.from({length:wraps},(_,n)=>innerRadius+n*maxMm));
    let lastRadius = 0, lastMax = 0;
    const rings=groups.map((g,row)=>{
      const max = Math.max(...g.map(({item})=>item.sizeMm));
      const radius = Math.max(ringRadius(g), row ? lastRadius+(lastMax+max)/2+1 : 0);
      lastRadius=radius;lastMax=max;return {g,radius,max};
    });
    const extent=Math.max(maxMm/2,...rings.map(r=>r.radius+r.max/2));
    scale=Math.min(scale,(trayRadius-12)/extent);
    rings.forEach(({g,radius},row)=>{
      const total=g.reduce((n,{item})=>n+item.sizeMm,0);let used=0;
      guides.push({row,radius:radius*scale,startIndex:g[0].index,count:g.length,direction:1});
      g.forEach(({item,index})=>{
        const angle=(used+item.sizeMm/2)/total*TAU-Math.PI/2;used+=item.sizeMm;
        points.push({instanceId:item.instanceId,index,x:center.x+Math.cos(angle)*radius*scale,y:center.y+Math.sin(angle)*radius*scale,diameter:item.sizeMm*scale,rotationDeg:item.rotationDeg||0,row,angle});
      });
    });
  }
  points.forEach(p=>{p.section=sections.get(p.index);p.visible=trayMode!=='linear'||linearSection==='all'||p.section===linearSection;});
  guides.forEach(g=>{g.visible=trayMode!=='linear'||linearSection==='all'||g.section===linearSection;});
  return {width,height,center,trayRadius,trayMode,scale,points,guides};
}
export function insertionForPoint(pointer, projection, excludeId) {
  const points=projection.points.filter(p=>p.instanceId!==excludeId);
  if(!points.length)return {index:0,x:pointer.x,y:pointer.y};
  const gaps=[];
  points.forEach((p,n)=>{
    if(p.visible===false)return;
    const previous=points[n-1];
    if(previous&&previous.visible!==false&&previous.row===p.row)gaps.push({index:n,x:(p.x+previous.x)/2,y:(p.y+previous.y)/2});
    else gaps.push({index:n,x:p.x-(p.direction||1)*p.diameter*.65,y:p.y});
    const next=points[n+1];if(!next||next.visible===false||next.row!==p.row)gaps.push({index:n+1,x:p.x+(p.direction||1)*p.diameter*.65,y:p.y});
  });
  if(!gaps.length)return {index:points.length,x:pointer.x,y:pointer.y};
  return gaps.reduce((best,g)=>Math.hypot(g.x-pointer.x,g.y-pointer.y)<Math.hypot(best.x-pointer.x,best.y-pointer.y)?g:best);
}
export function looseCoordinates(point, projection) {
  const rx=projection.trayMode==='round'?projection.trayRadius-point.diameter/2:projection.width*.44-point.diameter/2;
  const ry=projection.trayMode==='round'?projection.trayRadius-point.diameter/2:projection.height*.36-point.diameter/2;
  const x=.5+(point.x-projection.center.x)/(2*Math.max(1,rx)),y=.5+(point.y-projection.center.y)/(2*Math.max(1,ry));
  return {instanceId:point.instanceId,...(projection.trayMode==='linear'?{looseLinearX:x,looseLinearY:y}:{looseX:x,looseY:y})};
}
export function settleLoose(points, activeId, pointer, projection) {
  const result=points.map(p=>({...p}));const active=result.find(p=>p.instanceId===activeId);if(!active)return result;
  active.x=pointer.x;active.y=pointer.y;
  const constrain=p=>{
    if(projection.trayMode==='round'){
      const dx=p.x-projection.center.x,dy=p.y-projection.center.y,d=Math.hypot(dx,dy),limit=projection.trayRadius-p.diameter/2;
      if(d>limit){p.x=projection.center.x+dx*limit/d;p.y=projection.center.y+dy*limit/d;}
    }else{const rx=projection.width*.44-p.diameter/2,ry=projection.height*.36-p.diameter/2;p.x=clamp(p.x,projection.center.x-rx,projection.center.x+rx);p.y=clamp(p.y,projection.center.y-ry,projection.center.y+ry);}
  };
  constrain(active);
  const affected=new Set([activeId]);
  for(let iteration=0;iteration<24;iteration++){
    let changed=false;
    for(let a=0;a<result.length;a++)for(let b=a+1;b<result.length;b++){
      const p=result[a],q=result[b],dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy),need=(p.diameter+q.diameter)/2+1;
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
