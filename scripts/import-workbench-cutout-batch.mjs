import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {assertSafeLocalPath,loadLocalAssetManifest} from '../workbench/local-asset-manifest.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
// Existing producer outputs are already normalized with one uniform scale.
// Verify their bytes/body bounds; copying them avoids a second interpolation.
export async function importCutoutBatch({rootDir,entries,archive,expectedArchiveHash,sourceAudit}){
 rootDir=path.resolve(rootDir);
 if(!Array.isArray(entries)||!entries.length)throw new Error('Nonempty entries required');
 let archiveSha256=null;
 if(archive){archiveSha256=hash(fs.readFileSync(archive));if(expectedArchiveHash&&archiveSha256!==expectedArchiveHash.toLowerCase())throw new Error('Archive hash mismatch');}
 const old=loadLocalAssetManifest({rootDir});if(old.error)throw new Error(old.error);
 const seen=new Set(),verified=[],sourceHashes=new Map();
 for(const entry of entries){
  if(!/^SRC-IMG_\d+$/.test(entry.source_key)||! /^(P\d+|R\d+-C\d+)$/.test(entry.position))throw new Error('Invalid source position');
  const key=`${entry.source_key}__${entry.position}`;
  if(seen.has(key))throw new Error('Duplicate source position');seen.add(key);
  for(const [field,digest] of [['derived_file','derived_sha256'],['source_path','source_sha256'],['cutout_file','cutout_sha256']]){
   const target=assertSafeLocalPath(rootDir,entry[field],{mustExist:true});
   if(!sourceHashes.has(target))sourceHashes.set(target,hash(fs.readFileSync(target)));
   if(!/^[a-f0-9]{64}$/i.test(entry[digest]||'')||sourceHashes.get(target)!==entry[digest].toLowerCase())throw new Error(`${field} hash mismatch: ${key}`);
  }
  const bytes=fs.readFileSync(assertSafeLocalPath(rootDir,entry.derived_file,{mustExist:true}));
  const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=info.width,top=info.height,right=-1,bottom=-1,transparent=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const alpha=data[(y*info.width+x)*4+3];if(alpha===0)transparent++;if(alpha>127){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}}
  if(right<left||!transparent)throw new Error(`Blank/opaque cutout: ${key}`);
  const bounds={left,top,width:right-left+1,height:bottom-top+1,alpha_threshold:127};
  const supplied=entry.subject_bounds_alpha_gt_127;
  if(supplied&&['left','top','width','height'].some(k=>supplied[k]!==bounds[k]))throw new Error(`Body bounds mismatch: ${key}`);
  const file=`${key}__${entry.derived_sha256.slice(0,16)}.png`;
  const target=assertSafeLocalPath(rootDir,`workbench/assets/local/${file}`);
  assertSafeLocalPath(rootDir,`workbench/assets/local/${file}.json`);
  if(fs.existsSync(target)&&hash(fs.readFileSync(target))!==entry.derived_sha256)throw new Error(`Existing derived hash mismatch: ${key}`);
  const named=Boolean(entry.printed_label&&entry.label_kind!=='unresolved');
  const source=sourceAudit?.sources?.find(s=>s.source_key===entry.source_key);
  const {processing_parameters,...inventory}=entry;
  const asset={...inventory,transformation_summary:{operation:processing_parameters?.operation,source_repair:entry.source_repair,normalization:processing_parameters?.normalization},asset_key:key,material_id:`source-${key}`,spec_id:`source-${key}-virtual`,
   display_name_zh:`${named?entry.display_name_zh||entry.display_name||entry.printed_label:'未标注'}${named&&entry.printed_label!==entry.display_name_zh?' · '+entry.printed_label:''} · ${entry.source_key} ${entry.position}`,
   material_name:named?(entry.display_name_zh||entry.display_name||entry.printed_label):null,
   identity_status:named?'source_label_only':'unresolved_source_position',category:entry.form?.includes('pearl')?'organic':'crystal',
   form:entry.form,source_position:entry.position,source_ref:{source_key:entry.source_key,position:entry.position,source_sha256:entry.source_sha256,...(source?{url:source.drive_url,file_id:source.drive_file_id}:{})},
   file,width:info.width,height:info.height,subject_bounds:bounds,archive_sha256:archiveSha256,
   representation_class:'source_cutout',publication_status:'local_only',rights_status:'user_supplied_private',
   size_status:'size_not_verified',virtual_default_size_mm:8,needs_mask:entry.status!=='ready',
   real_photography_verified:false,mineral_identity_verified:false};
  verified.push({asset,bytes,target,processing_parameters});
 }
 const manifestPath=assertSafeLocalPath(rootDir,'workbench/state/local-asset-manifest.json');
 const retained=old.assets.filter(a=>!seen.has(a.asset_key));
 let created=0,reused=0;
 for(const {asset,bytes,target,processing_parameters} of verified){
  fs.mkdirSync(path.dirname(target),{recursive:true});
  if(fs.existsSync(target))reused++;else{fs.writeFileSync(target,bytes,{flag:'wx'});created++;}
  const sidecar={prompt:`Origin ${asset.source_key} ${asset.position}; source ${asset.source_path}; supplied cutout ${asset.cutout_file}; source-derived transformation ${JSON.stringify(processing_parameters)}. Not an AI generation prompt or verified photography.`,processing_parameters,source_ref:asset.source_ref,source_sha256:asset.source_sha256,cutout_sha256:asset.cutout_sha256,derived_sha256:asset.derived_sha256,archive_sha256:archiveSha256,subject_bounds:asset.subject_bounds};
  const text=JSON.stringify(sidecar,null,2)+'\n';asset.transformation_metadata_file=asset.file+'.json';asset.transformation_metadata_sha256=hash(text);if(!fs.existsSync(target+'.json')||fs.readFileSync(target+'.json','utf8')!==text)fs.writeFileSync(target+'.json',text);
 }
 const assets=[...retained,...verified.map(v=>v.asset)],manifest={...old,version:1,assets};
 fs.mkdirSync(path.dirname(manifestPath),{recursive:true});const text=JSON.stringify(manifest,null,2)+'\n';
 if(!fs.existsSync(manifestPath)||fs.readFileSync(manifestPath,'utf8')!==text)fs.writeFileSync(manifestPath,text);
 return {assets,created,reused,preserved:retained.length,imported:verified.length,ready:verified.filter(v=>v.asset.status==='ready').length,reference_only:verified.filter(v=>v.asset.status==='reference-only').length,weak_quality:verified.filter(v=>v.asset.status==='weak-quality').length,archive_sha256:archiveSha256};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=Object.fromEntries(process.argv.slice(2).reduce((pairs,v,n,a)=>n%2?pairs:[...pairs,[v.replace(/^--/,''),a[n+1]]],[]));
 if(!args.root||!args.manifest||!args.archive||!args['archive-sha256']||!args.audit)throw new Error('Explicit --root --manifest --archive --archive-sha256 --audit required');
 const producer=readJson(args.manifest),sourceAudit=readJson(args.audit);
 const result=await importCutoutBatch({rootDir:args.root,entries:producer.entries,archive:args.archive,expectedArchiveHash:args['archive-sha256'],sourceAudit});
 const {assets,...counts}=result;console.log(JSON.stringify(counts,null,2));
}
