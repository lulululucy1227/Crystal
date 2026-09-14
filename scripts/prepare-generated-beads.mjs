import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const hash=b=>createHash('sha256').update(b).digest('hex');

// This is an image-gradient contour, not an ellipse/circle mask. The radial
// search region only bounds the inspected central subject. Each of 720 rays
// contributes its own measured edge; dynamic programming rejects checker edges.
export async function extractSilhouette(input,{edgeMode='contrast',search=[.27,.47],inset=3,feather=1.4}={}){
 const {data:rgb,info}=await sharp(input).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const {width,height}=info,n=Math.min(width,height),cx=width/2,cy=height/2;
 if(width<128||height<128)throw Error('Insufficient boundary resolution');
 const blurred=await sharp(rgb,{raw:{width,height,channels:3}}).blur(Math.max(.6,n/350)).raw().toBuffer();
 const sample=(x,y,c)=>{x=clamp(x,0,width-1);y=clamp(y,0,height-1);const ix=Math.floor(x),iy=Math.floor(y),dx=x-ix,dy=y-iy;
  const at=(a,b)=>blurred[(Math.min(height-1,b)*width+Math.min(width-1,a))*3+c];
  return at(ix,iy)*(1-dx)*(1-dy)+at(ix+1,iy)*dx*(1-dy)+at(ix,iy+1)*(1-dx)*dy+at(ix+1,iy+1)*dx*dy;};
 const count=720,lo=Math.floor(n*search[0]),hi=Math.ceil(n*search[1]),length=hi-lo+1,delta=Math.max(2,n/180);
 const scores=Array.from({length:count},()=>new Float32Array(length));
 for(let a=0;a<count;a++){const theta=a/count*TAU,cos=Math.cos(theta),sin=Math.sin(theta);
  for(let j=0;j<length;j++){const radius=lo+j,diff=[0,1,2].map(c=>sample(cx+(radius-delta)*cos,cy+(radius-delta)*sin,c)-sample(cx+(radius+delta)*cos,cy+(radius+delta)*sin,c));
   scores[a][j]=edgeMode==='bright'?Math.max(0,(diff[0]+diff[1]+diff[2])/3):Math.hypot(...diff)/Math.sqrt(3);
  }
 }
 const back=Array.from({length:count},()=>new Int16Array(length)),jump=Math.max(2,Math.ceil(n/500));
 let prior=Float64Array.from(scores[0]);
 for(let a=1;a<count;a++){const next=new Float64Array(length);
  for(let j=0;j<length;j++){let best=-Infinity,index=j;for(let k=Math.max(0,j-jump);k<=Math.min(length-1,j+jump);k++){const v=prior[k]-20*(k-j)**2;if(v>best){best=v;index=k;}}next[j]=best+Math.min(90,scores[a][j]);back[a][j]=index;}prior=next;
 }
 let end=0;for(let j=1;j<length;j++)if(prior[j]>prior[end])end=j;
 const measured=new Array(count);for(let a=count-1;a>=0;a--){measured[a]=lo+end;end=back[a][end];}
 const radii=measured.map((_,a)=>{const values=Array.from({length:7},(_,k)=>measured[(a+k-3+count)%count]).sort((x,y)=>x-y);return values[3];});
 const edgeScores=radii.map((r,a)=>scores[a][Math.round(r)-lo]),sorted=[...edgeScores].sort((a,b)=>a-b);
 if(sorted[Math.floor(count*.1)]<5||radii.some(r=>r<=lo+2||r>=hi-2))throw Error('No safe continuous boundary signal inside search band');
 const rgba=Buffer.alloc(width*height*4),effectiveInset=inset*n/1254,effectiveFeather=feather*n/1254;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const dx=x-cx,dy=y-cy,theta=(Math.atan2(dy,dx)+TAU)%TAU,countAngle=theta/TAU*count,at=Math.floor(countAngle),fraction=countAngle-at;
  const radius=radii[at]*(1-fraction)+radii[(at+1)%count]*fraction-effectiveInset;
  const alpha=Math.round(clamp((radius-Math.hypot(dx,dy))/effectiveFeather+.5,0,1)*255),i=y*width+x;
  if(alpha){rgba[i*4]=rgb[i*3];rgba[i*4+1]=rgb[i*3+1];rgba[i*4+2]=rgb[i*3+2];rgba[i*4+3]=alpha;}
 }
 return {rgba,width,height,radii,edgeSignal:{p10:sorted[Math.floor(count*.1)],median:sorted[Math.floor(count*.5)],min:sorted[0]},parameters:{algorithm:'720-ray image-gradient dynamic contour, cyclic seven-ray median, no analytic circle mask',edgeMode,search,smoothnessPenalty:20,gradientScoreCap:90,insetInputPixels:effectiveInset,featherInputPixels:effectiveFeather,blurSigma:Math.max(.6,n/350)}};
}

function analyzeAlpha(data,width,height,threshold=0){
 let left=width,top=height,right=-1,bottom=-1,transparent=0,opaque=0,partial=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const a=data[(y*width+x)*4+3];if(a===0)transparent++;else if(a===255)opaque++;else partial++;if(a>threshold){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}}
 return {subjectBounds:{left,top,width:right-left+1,height:bottom-top+1,alphaThreshold:threshold},alphaStats:{transparent,opaque,partial,total:width*height}};
}

export async function prepareBead(input,{size=768,padding=48,...matteOptions}={}){
 const matte=await extractSilhouette(input,matteOptions),sourceBounds=analyzeAlpha(matte.rgba,matte.width,matte.height).subjectBounds;
 const {alphaThreshold,...crop}=sourceBounds;
 const resized=await sharp(matte.rgba,{raw:{width:matte.width,height:matte.height,channels:4}}).extract(crop).resize(size-2*padding,size-2*padding,{fit:'inside',kernel:'lanczos3'}).png().toBuffer();
 const dimensions=await sharp(resized).metadata(),left=Math.floor((size-dimensions.width)/2),top=Math.floor((size-dimensions.height)/2);
 const png=await sharp({create:{width:size,height:size,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:resized,left,top}]).png().toBuffer();
 const data=await sharp(png).raw().toBuffer(),stats=analyzeAlpha(data,size,size),body=analyzeAlpha(data,size,size,127).subjectBounds;
 return {png,pixelSha256:hash(data),...stats,subjectBoundsAlpha127:body,sourceBounds,sourceDimensions:{width:matte.width,height:matte.height},edgeSignal:matte.edgeSignal,parameters:{...matte.parameters,size,padding,resize:'uniform Lanczos3; no recolor; opaque rendered interior',contourRadii:matte.radii}};
}

const inputs=[
 ['clear','exec-13935e98-8c35-49ed-861d-8a00ead66440.png','contrast'],
 ['aqua','exec-fd99a64b-071a-4311-bc6d-0ea84b5997d7.png','contrast'],
 ['labradorite','exec-11b8dcee-33bb-41ad-baf8-b3dc66ec10a9.png','contrast'],
 ['whitephantom','exec-5aef6470-6638-454d-b0d4-1e8577683e5d.png','contrast'],
 ['tahitian','exec-fe26863a-dae4-46f7-a630-70033cb0492e.png','contrast'],
 ['amethyst','exec-20b6df8c-c418-403f-a1b1-769d074ffc02.png','contrast'],
 ['moonstone','exec-528ef9db-d44a-4aab-8309-8c619d8d2088.png','contrast']
];
const outputSlugs={clear:'clear-quartz',aqua:'aquamarine',whitephantom:'white-phantom-quartz',tahitian:'tahitian-pearl'};
async function main(){
 const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),sourceDir=process.argv[2];
 if(!sourceDir)throw Error('Pass the exact existing generated_images directory; no generation is performed.');
 const outputDir=path.join(root,'workbench/assets/catalog/generated/translucent-v1'),scratch=path.join(root,'work/graphite/assets');
 await fs.mkdir(outputDir,{recursive:true});await fs.mkdir(scratch,{recursive:true});await fs.mkdir(path.join(scratch,'originals'),{recursive:true});
 const entries=[];
 for(const [name,file,edgeMode]of inputs){const source=path.resolve(sourceDir,file),bytes=await fs.readFile(source),sourceMeta=await sharp(bytes).metadata();
  const original=path.join(scratch,'originals',name+'.png');
  try{const old=await fs.readFile(original);if(hash(old)!==hash(bytes))throw Error('Existing preserved original differs: '+original);}catch(error){if(error.code==='ENOENT')await fs.writeFile(original,bytes,{flag:'wx'});else throw error;}
  const result=await prepareBead(bytes,{edgeMode,inset:name==='tahitian'?5:3}),output=path.join(outputDir,(outputSlugs[name]||name)+'.png');await fs.writeFile(output,result.png);
  const {png,...metrics}=result;entries.push({name,source,originalCopy:path.relative(root,original).replaceAll('\\','/'),sourceSha256:hash(bytes),sourceHasAlpha:sourceMeta.hasAlpha,output:path.relative(root,output).replaceAll('\\','/'),width:768,height:768,sha256:hash(png),bytes:png.length,...metrics,provenance:'generated_reference; deterministic local boundary matte of existing generated render; not photography',generationPrompt:'Parent owns exact original generation prompt; not reconstructed here'});
  // Large matte inspection and true thumbnail comparisons; each cell retains
  // identical RGB/alpha and uses only documented flat compositing backgrounds.
  const layers=[],backgrounds=['#ffffff','#e5e7eb','#252a30'];
  for(let b=0;b<3;b++)for(let n=0;n<4;n++){const px=[384,96,48,32][n],y=[25,430,550,620][n],tile=await sharp(png).resize(px,px).flatten({background:backgrounds[b]}).png().toBuffer();layers.push({input:tile,left:b*420+Math.floor((420-px)/2),top:y});}
  const panels=await Promise.all(backgrounds.map(async(bg,b)=>({input:await sharp({create:{width:420,height:680,channels:3,background:bg}}).png().toBuffer(),left:b*420,top:0})));
  const comparison=await sharp({create:{width:1260,height:680,channels:3,background:'#ffffff'}}).composite([...panels,...layers]).png().toBuffer();
  await fs.writeFile(path.join(scratch,name+'-comparison.png'),comparison);
  await fs.writeFile(path.join(scratch,name+'-comparison.png.json'),JSON.stringify({prompt:'Deterministic local comparison sheet of the existing generated-reference bead '+name+'. Left-to-right backgrounds: white #ffffff, neutral #e5e7eb, dark #252a30. Top-to-bottom canvas sizes 384,96,48,32 px. Alpha composite and uniform resize only; not a new generation.',derivedSha256:hash(comparison),sourceSha256:hash(bytes),matteSha256:hash(png)},null,2)+'\n');
  if(hash(await fs.readFile(source))!==hash(bytes))throw Error('Source changed during preparation: '+source);
  console.log(JSON.stringify({name,subjectBounds:result.subjectBounds,edgeSignal:result.edgeSignal,alpha:result.alphaStats}));
 }
 await fs.writeFile(path.join(scratch,'processing-manifest.json'),JSON.stringify({version:1,generatedAt:new Date().toISOString(),status:'PENDING_VISUAL_REVIEW',entries},null,2)+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
