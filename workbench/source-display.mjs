// Shared browser-safe visual lookup. A printed label is not a verified SKU.
export const sourceClasses=['source_cutout','source_neutral_optimized','source_derived'];
const safeFile=file=>typeof file==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_.-]*\.(png|webp)$/.test(file)&&!file.includes('..');
export function resolveSourceDisplay(item={},assets=[]){
 const ready=assets.filter(a=>a&&a.status==='ready'&&!a.needs_mask&&a.rights_status!=='prohibited'&&safeFile(a.file));
 const ordered=sourceClasses.flatMap(c=>ready.filter(a=>a.representation_class===c));
 const exact=ordered.find(a=>item.materialId&&item.specId&&a.material_id===item.materialId&&a.spec_id===item.specId);
 const selected=ordered.find(a=>item.assetKey&&a.asset_key===item.assetKey);
 const names=[item.displayNameZh,item.displayNameEn,item.materialName].filter(Boolean);
 const named=ordered.find(a=>a.identity_status==='source_label_only'&&a.label_kind==='printed_material_label'&&a.material_name&&names.includes(a.material_name));
 const asset=exact||selected||named||ready.find(a=>a.representation_class==='generated_from_evidence'&&item.materialId&&item.specId&&a.material_id===item.materialId&&a.spec_id===item.specId);
 return asset?{...asset,imageUrl:`/assets/local/${encodeURIComponent(asset.file)}`,display_match:exact?'exact_material_spec':selected?'source_sample':'source_label_visual_only',size_status:exact?(asset.size_status||'unverified'):'size_not_verified'}:null;
}
export function sourceImageDescriptor(asset){
 return {imageUrl:asset.imageUrl,assetRef:asset.file,assetKey:asset.asset_key,sourceRef:asset.source_ref,identityStatus:asset.identity_status,sizeStatus:asset.size_status,sourcePosition:asset.source_position,provenanceClass:asset.representation_class,subjectBounds:asset.subject_bounds||asset.subjectBounds,atlas:undefined};
}
