import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {layoutStudio,insertionForPoint} from '../workbench/studio-layout.mjs';
import {withStudioSession} from '../scripts/qa-studio-session.mjs';

// Synthetic geometry only: no private draft, imported PNG, or ignored dependency.
const mixed=(count,trayMode='linear')=>({layoutMode:'bracelet',trayMode,wrapCount:count===54?2:3,wristCm:17,instances:Array.from({length:count},(_,n)=>({instanceId:`fixture-${n}`,sizeMm:n===12?12:6,form:n===12?'irregular':'round',...(n===12?{subjectBounds:{left:0,top:0,width:60,height:160}}:{}),rotationDeg:n===12?25:0}))});
for(const count of [54,86])test(`mixed ${count} straight beads use row extents and retain common scale, order, clearance and insertion`,()=>{
 const state=mixed(count),before=JSON.stringify(state),p=layoutStudio(state,945,450);
 assert.ok(p.points[0].diameter>=20,`6mm bead should remain inspectable: ${p.points[0].diameter}px`);
 assert.deepEqual(p.points.map(p=>p.instanceId),state.instances.map(i=>i.instanceId));
 for(const [n,a] of p.points.entries()){
  assert.equal(a.diameter,state.instances[n].sizeMm*p.scale);
  assert.ok(a.x-a.collisionDiameter/2>=0&&a.x+a.collisionDiameter/2<=p.width);
  assert.ok(a.y-a.collisionDiameter/2>=0&&a.y+a.collisionDiameter/2<=p.height);
  for(const b of p.points.slice(n+1))assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=(a.collisionDiameter+b.collisionDiameter)/2-.001,'no bead envelope overlap');
 }
 const [a,b]=p.points;assert.equal(a.row,b.row);assert.equal(insertionForPoint({x:(a.x+b.x)/2,y:a.y},p).index,1);
 for(const section of ['front','back']){const filtered=layoutStudio(state,945,450,{linearSection:section});assert.deepEqual(filtered.points.map(({visible,...p})=>p),p.points.map(({visible,...p})=>p));assert.ok(filtered.points.filter(p=>p.visible).every(p=>p.section===section));}
 assert.equal(JSON.stringify(state),before);
});
for(const count of [54,86,100])test(`round ${count} sequence labels have reserved bead-free space at desktop and narrow sizes`,()=>{
 for(const [width,height]of [[945,450],[520,520],[280,300]]){
  const p=layoutStudio(mixed(count,'round'),width,height);
  for(const g of p.guides){
   assert.ok(Number.isFinite(g.labelX)&&Number.isFinite(g.labelY),'project explicit sequence label positions');
   // 11px font with a conservative 16px line box; annotations are below all beads.
   assert.ok(g.labelY+8<=height&&g.labelY-8>=Math.max(...p.points.map(p=>p.y+p.collisionDiameter/2)));
   assert.ok(g.labelX-36>=0&&g.labelX+36<=width);
  }
 }
});
const luminance=rgb=>rgb.map(c=>c/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((n,c,i)=>n+c*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
const chrome=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
test('real Studio small operating text meets 4.5 contrast and trash retains only the Chinese action',{skip:!fs.existsSync(chrome)?'No installed Chrome; set CHROME_PATH for browser verification':false},async t=>{
 await withStudioSession({root:fileURLToPath(new URL('../',import.meta.url)),executablePath:chrome},async({browser,base})=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.route('**/api/local-assets',route=>route.fulfill({contentType:'application/json',body:'{"assets":[]}'}));
  await page.goto(base);await page.locator('.tree-nav [data-view="desk"]').click();await page.locator('[data-plus]').first().waitFor();
  const pairs=await page.evaluate(()=>[...document.querySelectorAll('.p4-studio small,.p4-tray-caption,.p4-message,.p4-note,.status-bar')].filter(e=>e.getClientRects().length).map(e=>{
   const rgb=s=>(s.match(/[\d.]+/g)||[]).slice(0,3).map(Number);let node=e,bg;
   while(node){const color=getComputedStyle(node).backgroundColor;if(color!=='rgba(0, 0, 0, 0)'&&color!=='transparent'){bg=rgb(color);break;}node=node.parentElement;}
   return {label:e.className||e.tagName,foreground:rgb(getComputedStyle(e).color),background:bg||[255,255,255]};
  }));
  const failures=pairs.map(p=>({...p,ratio:contrast(p.foreground,p.background)})).filter(p=>p.ratio<4.5).filter((p,n,a)=>a.findIndex(q=>q.foreground.join()===p.foreground.join()&&q.background.join()===p.background.join())===n);
  assert.deepEqual(failures,[]);t.diagnostic(JSON.stringify(pairs.map(p=>({...p,ratio:contrast(p.foreground,p.background)})).filter((p,n,a)=>a.findIndex(q=>q.foreground.join()===p.foreground.join()&&q.background.join()===p.background.join())===n)));
  const text=await page.locator('[data-trash]').innerText();assert.match(text,/移除珠子/);assert.doesNotMatch(text,/⌫/);
  const rendered=await page.evaluate(async fixtures=>{
   const {Canvas}=await import('/vendor/fabric/index.min.mjs');
   const {createBraceletCanvas}=await import('/bracelet-canvas.mjs');
   const {layoutStudio}=await import('/studio-layout.mjs');
    const results=[],originalAdd=Canvas.prototype.add;let labels=[];
   Canvas.prototype.add=function(...objects){labels.push(...objects.filter(o=>o.fontSize===11));return originalAdd.apply(this,objects);};
   try{for(const state of fixtures)for(const [width,height]of [[945,450],[520,520],[280,300]]){
    const host=document.createElement('div');host.className='p4-tray-stage';host.style.cssText=`width:${width}px;height:${height}px;position:fixed;left:0;top:0`;document.body.append(host);
    const element=document.createElement('canvas');host.append(element);labels=[];
    const api=createBraceletCanvas({canvasElement:element,state,resolveMaterial:()=>({})});await api.render(state);
    const p=layoutStudio(state,width,height),unique=[...new Set(labels)].filter(l=>l.canvas&&l.text!=='一根线 · 同向绕行 / 回接为二维示意');
    results.push({count:state.instances.length,width,height,beadBottom:Math.max(...p.points.map(p=>p.y+p.collisionDiameter/2)),labels:unique.map(l=>({text:l.text,fill:l.fill,...l.getBoundingRect()}))});
    api.dispose();host.remove();
   }}finally{Canvas.prototype.add=originalAdd;}
   return results;
  },[54,86,100].map(n=>mixed(n,'round')));
  for(const result of rendered){assert.equal(result.labels.length,result.count===54?2:3);for(const label of result.labels){assert.ok(label.top>=result.beadBottom,JSON.stringify(result));assert.ok(label.top+label.height<=result.height);assert.ok(label.left>=0&&label.left+label.width<=result.width);assert.match(label.text,/第\s*\d+\s*圈/);}}
  t.diagnostic('Actual Fabric sequence label bounds: '+JSON.stringify(rendered));
 });
});
test('canvas guide ink meets 4.5 on both ceramic and desk backgrounds',()=>{
 const source=fs.readFileSync(new URL('../workbench/bracelet-canvas.mjs',import.meta.url),'utf8');
 const match=source.match(/top:g\.labelY-\(round\?0:23\),fontSize:11[^\n]+fill:'(#[\da-f]{6})'/);assert.ok(match,'sequence guide label colour should remain explicit');
 const hex=match[1];
 const rgb=hex=>hex.slice(1).match(/../g).map(x=>parseInt(x,16));
 for(const background of ['#e7dfd3','#f6f4ef'])assert.ok(contrast(rgb(hex),rgb(background))>=4.5,`${hex} on ${background}`);
});
