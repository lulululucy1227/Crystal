import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const api=await import('../scripts/prepare-generated-beads.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});

async function fixture(){
 const width=256,height=256,data=Buffer.alloc(width*height*3);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const dx=x-128,dy=y-128,r=88*(1+.12*Math.cos(3*Math.atan2(dy,dx))),inside=Math.hypot(dx,dy)<r,n=(y*width+x)*3;
  const gray=(Math.floor(x/8)+Math.floor(y/8))%2?180:220;
  data[n]=inside?70+Math.floor(x/16):gray;data[n+1]=inside?120:gray;data[n+2]=inside?170:gray;
 }
 return {data,png:await sharp(data,{raw:{width,height,channels:3}}).png().toBuffer()};
}
test('image-derived matte follows asymmetric lobes instead of a geometric circle and removes the exterior checkerboard',async()=>{
 assert.equal(typeof api.extractSilhouette,'function');const {png,data}=await fixture(),result=await api.extractSilhouette(png);
 const pixel=(x,y)=>Array.from(result.rgba.subarray((y*256+x)*4,(y*256+x)*4+4));
 assert.equal(pixel(222,128)[3],255,'right lobe survives beyond a nominal circle');
 assert.equal(pixel(44,128)[3],0,'opposite indentation is not filled by a circle');
 for(const [x,y]of [[0,0],[255,0],[0,255],[255,255],[128,5]])assert.equal(pixel(x,y)[3],0);
 assert.deepEqual(pixel(128,128),[...data.subarray((128*256+128)*3,(128*256+128)*3+3),255],'interior RGB is unchanged');
 assert.ok(Math.max(...result.radii)-Math.min(...result.radii)>17,'data-derived contour retains noncircular variation');
});
test('preparation emits actual square RGBA with measured padded subject bounds, not an opaque checkerboard canvas',async()=>{
 assert.equal(typeof api.prepareBead,'function');const {png}=await fixture(),result=await api.prepareBead(png,{size:512,padding:32});
 const {data,info}=await sharp(result.png).raw().toBuffer({resolveWithObject:true});
 assert.equal(info.width,512);assert.equal(info.height,512);assert.equal(info.channels,4);
 const b=result.subjectBounds;assert.ok(b.left>=30&&b.top>=30);assert.ok(b.left+b.width<=482&&b.top+b.height<=482);
 assert.notEqual(b.width,b.height,'no forced square body');assert.ok(result.alphaStats.transparent>100000);assert.ok(result.alphaStats.opaque>50000);
 for(let x=0;x<512;x++){assert.equal(data[x*4+3],0);assert.equal(data[((511*512)+x)*4+3],0);}
});
test('flat input fails closed instead of inventing a circular bead',async()=>{
 assert.equal(typeof api.extractSilhouette,'function');const png=await sharp({create:{width:256,height:256,channels:3,background:'#bbbbbb'}}).png().toBuffer();
 await assert.rejects(api.extractSilhouette(png),/boundary|signal/i);
});
