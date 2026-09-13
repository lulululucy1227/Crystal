import {createBraceletState,createHistory,applyHistoryCommand,commitHistoryState,serializeBraceletState,undoHistory,redoHistory} from './bracelet-state.mjs';
import {aggregateBom,compareExpectedBom,knownCostSummary} from './bom.mjs';
import {fitEstimate} from './bracelet-fit.mjs';
import {designToStateInput} from './design-package.mjs';
import {renderPortfolio} from './portfolio-view.mjs';
import {layoutStudio} from './studio-layout.mjs';
import {resolveSourceDisplay,sourceImageDescriptor} from './source-display.mjs';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const themes={Mountain:'山',Ocean:'海',Forest:'森林',Sunrise:'日出',Starlight:'星辰',Glacier:'冰川'};
const sourceLabel={APPROVED:'已批准',PROPOSED:'待确认',UNRESOLVED:'待解析'};
const sourceClasses=['source_cutout','source_neutral_optimized','source_derived'];
const slug=value=>String(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-');
const api=async(url,options)=>{const r=await fetch(url,options); const body=await r.json(); if(!r.ok) throw new Error(body.error?.message||body.error||`请求失败 ${r.status}`); return body;};
const bomRows=instances=>aggregateBom(instances).map(r=>({material_id:r.material_id??r.materialId,spec_id:r.spec_id??r.specId,name_zh:r.name_zh??r.displayNameZh??r.display_name_zh??'',name_en:r.name_en??r.displayNameEn??r.display_name_en??r.materialName??'',form:r.form,size_mm:r.size_mm??r.sizeMm,quantity:r.quantity,source_status:r.source_status??r.sourceStatus,mapping_status:r.mapping_status??r.mappingStatus??'unverified'}));
export function exportDesign(draft,format){
  const rows=bomRows(draft.braceletState?.instances||[]);
  if(format==='bom-csv') {const headers=['material_id','spec_id','name_zh','name_en','form','size_mm','quantity','source_status','mapping_status'];return {ext:'csv',mime:'text/csv;charset=utf-8',text:'\uFEFF'+[headers.join(','),...rows.map(r=>headers.map(k=>`"${String(r[k]??'').replaceAll('"','""')}"`).join(','))].join('\r\n')};}
  if(format==='md') return {ext:'md',mime:'text/markdown;charset=utf-8',text:`# ${draft.name}\n\n主题：${themes[draft.theme]||draft.theme||'未设定'}\n手围：${draft.braceletState?.wristCm??draft.wristCm} cm\n\n## 设计用量\n${rows.map(r=>`- ${r.name_zh||r.name_en||r.material_id} · ${r.spec_id} · ${r.size_mm} mm × ${r.quantity} · ${r.source_status}`).join('\n')}\n\n## 核对\n混合尺寸仅为沿串线长度的近似估算，不是佩戴保证。未知价格不计为零成本。\n\n${draft.notes||''}\n`};
  return {ext:'json',mime:'application/json',text:JSON.stringify(format==='bom-json'?{design_name:draft.name,bom:rows}:draft,null,2)};
}
export function studioMarkup(){return `<section class="p4-studio"><header class="p4-heading"><h1>设计工作室 <small>CRYSTAL STUDIO</small></h1><input data-name aria-label="设计名称" placeholder="未命名设计"><div class="p4-history"><button data-action="undo" title="Ctrl Z">撤销</button><button data-action="redo" title="Ctrl Shift Z">重做</button><button data-action="save" class="p4-primary">保存草稿</button><button data-action="present">展示</button></div></header>
 <div class="p4-workspace"><section class="p4-editor"><div class="p4-controls"><div class="p4-segment"><button data-tray="round" aria-pressed="true">圆盘</button><button data-tray="linear" aria-pressed="false">直槽</button></div><label>手围<input data-wrist type="number" min="5" max="35" step="0.5" value="17" aria-label="手围厘米"><small>cm</small></label><label><select data-wrap aria-label="圈数"><option value="1">单圈</option><option value="2">双圈</option><option value="3">三圈</option></select></label><label>余量<input data-allowance type="number" min="0" max="30" step="1" value="5" aria-label="每圈余量毫米"><small>mm</small></label></div>
 <div class="p4-linear-filter p4-segment" data-linear-filter hidden aria-label="直槽显示范围"><button data-section="all" aria-pressed="true">全部</button><button data-section="front" aria-pressed="false">正手</button><button data-section="back" aria-pressed="false">背手</button><small>仅筛选显示，不改变顺序或用量</small></div>
 <div class="p4-tray-area"><div class="p4-tray-caption"><span data-tray-caption>散珠 · 自由排布</span><span data-sequence-caption>顺序起点 1 →</span></div><div class="p4-tray-stage"><canvas data-studio-canvas width="800" height="620" tabindex="0" aria-label="手串设计盘；PageUp / PageDown 选择上一颗 / 下一颗，方向键调整，Delete 删除"></canvas></div><div class="p4-tray-tools"><button data-action="bracelet" class="p4-primary">收拢成串</button><button data-action="loose">解除串珠</button><button data-trash class="p4-trash" aria-label="删除所选珠子，或拖到此处">⌫ 删除 / 拖入移除</button></div>
 <div data-order-preview class="p4-order-preview" hidden><strong>成串预览 · 保留当前顺序</strong><p>从第 1 颗开始，圆盘顺时针；直槽沿箭头连续排列。不会按材质重新排序。</p><ol data-order-list></ol><button data-confirm-order class="p4-primary">按此顺序成串</button><button data-cancel-order>取消</button></div></div>
 <div data-studio-status class="p4-readout"></div><p class="p4-message" data-message role="status">选择材料规格，用＋或拖入盘中添加一颗。</p>
 <details class="p4-inspector"><summary>编辑所选珠子 / 设计设置</summary><div class="p4-selection-navigation"><button data-select-prev>上一颗</button><button data-select-next>下一颗</button></div><p class="p4-note">PageUp / PageDown 选择上一颗 / 下一颗；方向键移动，Delete 删除。圆盘与直槽分别记住散珠位置。</p><div data-selection></div><div class="p4-draft-settings"><label>主题<select data-theme>${Object.entries(themes).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label><label>载入<select data-load><option value="">选择已保存的草稿</option></select></label><button data-action="reload">重载</button><button data-action="clear">清空</button></div><textarea data-notes aria-label="设计备注" placeholder="设计备注"></textarea><p class="p4-note">生成参考图不代表实物品质；未确认素材身份以原图位置标注。沿线与内圈为近似估算，需实物复核。</p></details>
 </section><aside class="p4-library" aria-label="材料库"><div class="p4-library-heading"><h2>材料 <small data-library-count></small></h2><label class="p4-used"><input type="checkbox" data-used> 只看已用</label><input data-studio-search type="search" placeholder="搜索材料 / 原图编号" aria-label="搜索材料"><div data-studio-tabs>${[['crystal','水晶'],['organic','天然'],['hardware','配饰'],['focal','异形'],['local','本地素材']].map(([key,label])=>`<button data-tab="${key}" aria-pressed="${key==='crystal'}">${label}</button>`).join('')}</div></div><div data-studio-material-grid></div></aside></div>
 <details class="p4-bom"><summary>实时 BOM · 材料与采购状态</summary><div data-studio-bom></div><div class="p4-export"><button data-export-image>导出实排图片 PNG</button><button data-export="design-json">导出设计 JSON</button><button data-export="bom-json">导出 BOM JSON</button><button data-export="bom-csv">导出 BOM CSV</button><button data-export="md">导出设计单</button></div></details>
 <details class="p4-portfolio"><summary>自然首发 · 六主题设计总览</summary><div data-studio-launch-board>读取正式设计包…</div></details><div class="p4-presentation-bar"><strong data-presentation-title></strong><span data-presentation-legend></span><button data-export-image>导出图片</button><button data-exit-present>返回编辑</button></div></section>`;}

export function renderStudio({host,initialDraft={},materials=[],resolveMaterial,onDraft=()=>{},setStatus=()=>{}}){
  let draft=structuredClone(initialDraft), tab='crystal',active=materials[0]?.name, specs=new Map(),canvas,disposed=false,linearSection='all';
  const input=draft.braceletState||{wristCm:draft.wristCm,items:draft.items,layout:draft.layout};
  let history=createHistory(createBraceletState({...input,layoutMode:input.layoutMode||'loose'}),80);
  let localAssets=[];
  let loadSequence=0;
  host.innerHTML=studioMarkup();
  const q=s=>host.querySelector(s);
  const draw=(state=history.present)=>canvas?.render(state,{linearSection});
  const visibleInstances=()=>{const state=history.present;if(state.trayMode!=='linear'||linearSection==='all')return state.instances;const ids=new Set(layoutStudio(state,900,560,{linearSection}).points.filter(p=>p.visible).map(p=>p.instanceId));return state.instances.filter(i=>ids.has(i.instanceId));};
  const selectedVisible=()=>visibleInstances().find(i=>i.instanceId===history.present.selectedInstanceId);
  const selectRelative=direction=>{const items=visibleInstances();if(!items.length)return;const n=items.findIndex(i=>i.instanceId===history.present.selectedInstanceId),index=n<0?(direction>0?0:items.length-1):(n+direction+items.length)%items.length;history.present={...history.present,selectedInstanceId:items[index].instanceId};refresh();};
  const message=s=>{if(disposed)return;const target=q('[data-message]');if(target)target.textContent=s;setStatus(s);};
  const sync=()=>{if(disposed)return;
    // Catalog choices are a separate ledger, not a projection of placed beads.
    // Coalesce earlier per-instance drafts so one Catalog + still adds exactly one.
    const choices=new Map();
    for(const item of draft.items||[]){const quantity=Math.max(0,Number(item.quantity)||0);if(!item.name||!quantity)continue;const previous=choices.get(item.name);choices.set(item.name,previous?{...previous,quantity:previous.quantity+quantity}:{...item,quantity});}
    draft={...draft,wristCm:history.present.wristCm,braceletState:serializeBraceletState(history.present),items:[...choices.values()]};onDraft(structuredClone(draft));};
  const materialImage=(name,instance={})=>{
    const generated=resolveMaterial(instance.displayNameEn||name,instance)||{};
    const local=resolveSourceDisplay({...instance,materialName:name},localAssets);
    return local?{...generated,...sourceImageDescriptor(local)}:generated;
  };
  const meta=m=>{const spec=specs.get(m.name)||{sizeMm:8,form:m.sourceForm?(/^(round|faceted_round)/.test(m.sourceForm)?'round':'irregular'):m.category==='hardware'?'connector':tab==='focal'?'irregular':'round'};const materialId=m.materialId||`candidate-${slug(m.name)}`;return {...spec,materialName:m.name,materialId,specId:`${materialId}-${spec.form}-${spec.sizeMm}mm`,displayNameZh:m.zhName,displayNameEn:m.displayNameEn||m.name,assetKey:m.assetKey,sourceStatus:'PROPOSED',mappingStatus:'unverified',provenanceClass:'generated_from_evidence'};};
  const commit=command=>{if(command.instanceId&&!visibleInstances().some(i=>i.instanceId===command.instanceId)&&command.type!=='place')return;q('[data-order-preview]').hidden=true;if(['place','move','replace'].includes(command.type)){const stage=q('.p4-tray-stage');command={...command,settle:true,viewport:{width:stage.clientWidth||900,height:stage.clientHeight||560}};}history=applyHistoryCommand(history,command);refresh();};
  const placement=m=>{const p=meta(m),img=materialImage(m.name,p);return {...p,...(img.imageUrl?{imageUrl:img.imageUrl,assetRef:img.assetRef,assetKey:img.assetKey,sourceRef:img.sourceRef,identityStatus:img.identityStatus,sizeStatus:img.sizeStatus,sourcePosition:img.sourcePosition,provenanceClass:img.provenanceClass,subjectBounds:img.subjectBounds}:img.atlas?{atlas:img.atlas,assetRef:img.assetRef,provenanceClass:img.provenanceClass}:{})};};
  const add=m=>{active=m.name;commit({type:'place',...placement(m)});message(`已添加一颗${m.zhName}，可在盘内拖动。`);};
  const select=m=>{active=m.name;history.present={...history.present,activeMaterialName:m.name};library();draw();message(`已选${m.zhName}；用＋或拖入盘中添加一颗。`);};
  function library(){
    const search=q('[data-studio-search]').value.toLowerCase();
    const rows=materials.filter(m=>(tab==='local'?m.isLocal:!m.isLocal&&(tab==='focal'?m.category==='crystal':m.category===tab))&&`${m.name} ${m.zhName}`.toLowerCase().includes(search)&&(!q('[data-used]').checked||history.present.instances.some(i=>i.materialId===meta(m).materialId)));
    q('[data-library-count]').textContent=`${rows.length} 种`;
    q('[data-studio-material-grid]').innerHTML=rows.map(m=>{const p=meta(m),img=materialImage(m.name,p),count=history.present.instances.filter(i=>i.materialId===p.materialId&&i.specId===p.specId).length;return `<article class="p4-material ${active===m.name?'selected':''}" data-material="${esc(m.name)}"><button class="p4-select" data-select="${esc(m.name)}" aria-pressed="${active===m.name}"><span class="p4-thumb">${img.imageUrl?`<img src="${esc(img.imageUrl)}" alt="${esc(m.zhName)} ${esc(img.provenanceClass)}">`:m.thumbnail||'<span>待接入</span>'}</span><strong>${esc(m.zhName)}</strong><small>${esc(m.name)}</small></button><div class="p4-spec"><label>虚拟尺寸<input data-size="${esc(m.name)}" type="number" min="1" max="60" step="0.5" value="${p.sizeMm}" aria-label="${esc(m.zhName)}沿线尺寸 mm"></label><select data-form="${esc(m.name)}" aria-label="${esc(m.zhName)}形态">${[['round','圆珠'],['irregular','异形'],['connector','结构件']].map(([key,label])=>`<option value="${key}" ${p.form===key?'selected':''}>${label}</option>`).join('')}</select></div><div class="p4-count"><button data-minus="${esc(m.name)}" aria-label="减少${esc(m.zhName)}">−</button><b>${count}</b><button data-plus="${esc(m.name)}" aria-label="添加${esc(m.zhName)}">＋</button></div><small>虚拟尺寸可编辑 · 标签/尺寸未核验 · ${sourceClasses.includes(img.provenanceClass)?'本地源图':'生成参考图'}</small></article>`;}).join('')||'<p>没有匹配材料。</p>';
    q('[data-studio-material-grid]').querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>select(materials.find(m=>m.name===b.dataset.select)));
    q('[data-studio-material-grid]').querySelectorAll('[data-material]').forEach(card=>{card.draggable=true;card.ondragstart=event=>{const m=materials.find(m=>m.name===card.dataset.material);active=m.name;event.dataTransfer.setData('application/x-crystal-material',JSON.stringify(placement(m)));event.dataTransfer.effectAllowed='copy';};});
    q('[data-studio-material-grid]').querySelectorAll('[data-plus]').forEach(b=>b.onclick=()=>add(materials.find(m=>m.name===b.dataset.plus)));
    q('[data-studio-material-grid]').querySelectorAll('[data-minus]').forEach(b=>b.onclick=()=>{const m=materials.find(m=>m.name===b.dataset.minus),p=meta(m),found=[...visibleInstances()].reverse().find(i=>i.materialId===p.materialId&&i.specId===p.specId);if(found)commit({type:'remove',instanceId:found.instanceId});});
    q('[data-studio-material-grid]').querySelectorAll('[data-size],[data-form]').forEach(el=>{
      const update=()=>{const name=el.dataset.size||el.dataset.form,m=materials.find(x=>x.name===name),p=meta(m);if(el.dataset.size){const v=Number(el.value);if(!Number.isFinite(v)||v<1||v>60){message('尺寸需在 1–60 mm 之间。');return;}p.sizeMm=v;}else p.form=el.value;specs.set(name,{sizeMm:p.sizeMm,form:p.form});};
      el.oninput=update;el.onchange=update;
    });
  }
  function selection(){
    const i=selectedVisible();
    q('[data-selection]').innerHTML=i?`<h3>已选珠子</h3><p>第 ${history.present.instances.indexOf(i)+1} 颗 · ${esc(i.displayNameZh||i.materialName)} · ${i.sizeMm} mm</p><button data-delete>删除这颗</button><button data-replace>用当前材料替换</button><button data-swap>与下一颗换位</button><button data-rotate>旋转 15°</button><label>沿线尺寸 <input data-instance-size type="number" min="1" max="60" step="0.5" value="${i.sizeMm}"> mm</label><small>${esc(i.provenanceClass)} · ${esc(i.sourceStatus)}</small>`:'<p class="p4-note">点击珠子可删除、替换、旋转或换位。方向键移动 / 调整顺序。</p>';
    if(!i)return;
    q('[data-delete]').onclick=()=>commit({type:'remove',instanceId:i.instanceId});
    q('[data-replace]').onclick=()=>{const m=materials.find(m=>m.name===active);if(m)commit({type:'replace',instanceId:i.instanceId,...placement(m)});};
    q('[data-rotate]').onclick=()=>commit({type:'rotate',instanceId:i.instanceId,rotationDeg:(i.rotationDeg||0)+15});
    q('[data-instance-size]').onchange=e=>{const sizeMm=Number(e.target.value);if(sizeMm>=1&&sizeMm<=60)commit({type:'replace',...i,sizeMm,specId:`${i.materialId}-${i.form}-${sizeMm}mm`,sourceStatus:'PROPOSED',mappingStatus:'unverified'});};
    q('[data-swap]').onclick=()=>{
      const items=visibleInstances(),n=items.findIndex(x=>x.instanceId===i.instanceId),other=items[(n+1)%items.length];
      if(!other||other===i)return;
      commit({type:'swap',instanceId:i.instanceId,otherInstanceId:other.instanceId});
    };
  }
  function refresh(){if(disposed)return;sync();const state=history.present,fit=fitEstimate(state);q('[data-studio-status]').innerHTML=`<strong>${state.instances.length} 颗 / 件</strong><span>沿线 ${fit.usedMm.toFixed(1)} / 约 ${fit.targetMm?.toFixed(1)??'—'} mm</span><span>${fit.status==='underfilled'?`还差约 ${Math.abs(fit.deltaMm).toFixed(1)} mm`:fit.status==='overflow'?`超出约 ${Math.abs(fit.deltaMm).toFixed(1)} mm`:fit.status==='fit'?'接近估算目标':'尺寸待核对'}</span><small title="厚度暂以沿线尺寸代入；扣除每圈 π × 平均厚度，不是实际内圈测量">估算每圈内圈 ${(fit.estimatedInnerMm/state.wrapCount).toFixed(1)} mm · 需打样</small>${draft.items.length?`<small>目录备选：${draft.items.length} 种 · ${draft.items.reduce((sum,item)=>sum+item.quantity,0)} 颗 / 件（独立）</small>`:''}`;
    q('[data-tray-caption]').textContent=`${state.layoutMode==='loose'?'散珠 · 自由排布':'成串 · 连续顺序'} / ${state.trayMode==='linear'?'直槽':'圆盘'}`;q('[data-sequence-caption]').textContent=state.layoutMode==='bracelet'?`起点 1 → · ${state.wrapCount} 圈，不复制珠子`:'';
    q('[data-wrap]').value=state.wrapCount;q('[data-allowance]').value=state.allowanceMm;host.querySelectorAll('[data-tray]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tray===state.trayMode)));
    q('[data-linear-filter]').hidden=state.trayMode!=='linear';host.querySelectorAll('[data-section]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.section===linearSection)));
    q('[data-presentation-title]').textContent=draft.name||'未命名设计';q('[data-presentation-legend]').textContent=bomRows(state.instances).map(r=>`${r.name_zh||r.name_en} ${r.size_mm}mm × ${r.quantity}`).join(' · ');
    q('[data-wrist]').value=state.wristCm;q('[data-action="undo"]').disabled=!history.past.length;q('[data-action="redo"]').disabled=!history.future.length;q('[data-action="bracelet"]').disabled=state.layoutMode==='bracelet';q('[data-action="loose"]').disabled=state.layoutMode==='loose';
    const rows=bomRows(state.instances);q('[data-studio-bom]').innerHTML=`<div class="p4-table-scroll"><table><thead><tr><th>材料</th><th>规格</th><th>数量</th><th>采购状态</th><th>映射</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.name_zh||r.name_en||r.material_id)}</td><td>${esc(r.form)} · ${r.size_mm} mm</td><td>${r.quantity}</td><td>${esc(sourceLabel[r.source_status]||r.source_status)}</td><td>${esc(r.mapping_status)}</td></tr>`).join('')}</tbody></table></div><p>价格：${state.instances.some(i=>i.unitCost)?esc(JSON.stringify(knownCostSummary(state.instances))):'— 尚无可核验价格，不估算总价。'}</p>${draft.expectedBom?`<p>原设计 BOM 对比：${esc(JSON.stringify(compareExpectedBom(aggregateBom(state.instances),draft.expectedBom)))}</p>`:''}`;
    library();selection();draw(state);
  }
  async function draftOptions(){if(disposed)return;const result=await api('/api/drafts');if(disposed)return;q('[data-load]').innerHTML='<option value="">选择已保存的草稿</option>'+result.drafts.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');}
  const fillMeta=()=>{q('[data-name]').value=draft.name||'';q('[data-theme]').value=draft.theme||'Glacier';q('[data-notes]').value=draft.notes||'';};
  async function load(name){if(disposed)return;const sequence=++loadSequence;let loaded;try{loaded=await api(`/api/drafts/${encodeURIComponent(name)}`);}catch(error){if(disposed||sequence!==loadSequence)return;throw error;}if(disposed||sequence!==loadSequence)return;draft=loaded;history=createHistory(createBraceletState({...draft.braceletState,layout:draft.braceletState?undefined:draft.layout,items:draft.items,layoutMode:draft.braceletState?.layoutMode||'loose',wristCm:draft.wristCm}),80);fillMeta();refresh();message('草稿已重载，珠子身份、位置和规格保留。');}
  fillMeta();q('[data-name]').oninput=e=>{draft.name=e.target.value;sync();};q('[data-notes]').oninput=e=>{draft.notes=e.target.value;sync();};q('[data-theme]').onchange=e=>{draft.theme=e.target.value;sync();};q('[data-wrist]').onchange=e=>commit({type:'wrist',wristCm:Number(e.target.value)});
  q('[data-studio-search]').oninput=library;host.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;host.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));library();});
  q('[data-used]').onchange=library;
  host.querySelectorAll('[data-section]').forEach(b=>b.onclick=()=>{linearSection=b.dataset.section;q('[data-order-preview]').hidden=true;host.querySelectorAll('[data-section]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));selection();draw();});
  q('[data-select-prev]').onclick=()=>selectRelative(-1);q('[data-select-next]').onclick=()=>selectRelative(1);
  host.querySelectorAll('[data-tray]').forEach(b=>b.onclick=()=>commit({type:'tray-mode',trayMode:b.dataset.tray}));
  q('[data-wrap]').onchange=e=>commit({type:'wrap-count',wrapCount:Number(e.target.value)});
  q('[data-allowance]').onchange=e=>commit({type:'allowance',allowanceMm:Number(e.target.value)});
  q('[data-trash]').onclick=()=>selectedVisible()&&commit({type:'remove',instanceId:history.present.selectedInstanceId});
  q('[data-confirm-order]').onclick=()=>commit({type:'layout-mode',layoutMode:'bracelet'});
  q('[data-cancel-order]').onclick=()=>{q('[data-order-preview]').hidden=true;draw();};
  q('[data-exit-present]').onclick=()=>{q('.p4-studio').classList.remove('is-presenting');canvas?.resize?.();};
  const stage=q('.p4-tray-stage');stage.ondragover=e=>{if(e.dataTransfer.types.includes('application/x-crystal-material')){e.preventDefault();e.dataTransfer.dropEffect='copy';}};
  stage.ondrop=e=>{e.preventDefault();try{const payload=JSON.parse(e.dataTransfer.getData('application/x-crystal-material'));if(materials.some(m=>m.name===payload.materialName))canvas?.dropMaterial?.(payload,e.clientX,e.clientY);}catch{message('未识别的材料拖放。');}};
  host.onkeydown=e=>{
    if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
    const state=history.present,i=selectedVisible();
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();history=e.shiftKey?redoHistory(history):undoHistory(history);refresh();return;}
    if(e.key==='Escape'){q('[data-cancel-order]').click();q('[data-exit-present]').click();return;}
    if(e.key==='PageDown'||e.key==='PageUp'){e.preventDefault();selectRelative(e.key==='PageDown'?1:-1);return;}
    if(!i&&e.key.startsWith('Arrow')){e.preventDefault();selectRelative(1);return;}
    if(!i)return;
    if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();commit({type:'remove',instanceId:i.instanceId});}
    if(e.key.startsWith('Arrow')){e.preventDefault();const step=e.shiftKey?.05:.015;
      if(state.layoutMode==='loose'){const linear=state.trayMode==='linear',x=linear?(i.looseLinearX??i.looseX):i.looseX,y=linear?(i.looseLinearY??i.looseY):i.looseY;commit({type:'move',instanceId:i.instanceId,[linear?'looseLinearX':'looseX']:x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),[linear?'looseLinearY':'looseY']:y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0)});}
      else commit({type:'move',instanceId:i.instanceId,targetIndex:Math.min(state.instances.length-1,Math.max(0,state.instances.indexOf(i)+(['ArrowRight','ArrowDown'].includes(e.key)?1:-1)))});
    }
  };
  host.querySelectorAll('[data-export-image]').forEach(button=>button.onclick=async()=>{try{const url=await canvas?.exportImage?.();if(!url)return message('图片尚未准备好。');const link=host.ownerDocument.createElement('a');link.href=url;link.download=(draft.name||'Crystal-design')+'.png';link.click();message('已导出当前实排图片；没有生成或替换素材。');}catch(e){message('图片导出失败：'+e.message);}});
  q('[data-load]').onchange=e=>e.target.value&&load(e.target.value).catch(e=>message(e.message));
  host.querySelectorAll('[data-action]').forEach(b=>b.onclick=async()=>{
    try{
      const action=b.dataset.action;
      if(action==='undo')history=undoHistory(history);
      if(action==='redo')history=redoHistory(history);
      if(action==='clear')history=commitHistoryState(history,createBraceletState({...serializeBraceletState(history.present),instances:[]}));
      if(action==='bracelet'){
        q('[data-order-preview]').hidden=false;
        q('[data-order-list]').innerHTML=history.present.instances.map(i=>`<li>${esc(i.displayNameZh||i.materialName)} ${i.sizeMm}mm</li>`).join('');
        draw({...history.present,layoutMode:'bracelet'});return;
      }
      if(action==='loose')history=applyHistoryCommand(history,{type:'layout-mode',layoutMode:action});
      if(action==='present'){q('.p4-studio').classList.add('is-presenting');canvas?.resize?.();}
      if(action==='reload'){if(!draft.name)return message('请先命名并保存草稿。');return await load(draft.name);}
      if(action==='save'){
        if(!draft.name?.trim())return message('请先填写设计名称。');sync();
        await api(`/api/drafts/${encodeURIComponent(draft.name)}`,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(draft)});
        await draftOptions();message('草稿已保存到本机，不改动正式设计包。');return;
      }
      q('[data-order-preview]').hidden=true;refresh();
    }catch(e){message(e.message);}
  });
  host.querySelectorAll('[data-export]').forEach(button=>button.onclick=async()=>{
    try {
      sync();
      const result=await api('/api/studio-export',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({draft,format:button.dataset.export})});
      if(disposed)return;
      message('文件已准备好；点击下载。现有 exports 未改动。');
      const link=document.createElement('a');
      link.href=result.downloadUrl;link.download=result.filename;link.textContent='下载 '+result.filename;
      q('[data-message]').append(' ',link);
    } catch(error){message('导出失败：'+error.message);}
  });
  const ready=(async()=>{
  try{const body=await api('/api/local-assets');if(disposed)return;localAssets=body.assets||[];}catch(e){message(`本地素材暂不可用：${e.message}`);}
  materials=[...materials,...localAssets.filter(a=>a.asset_key&&resolveSourceDisplay({assetKey:a.asset_key},[a])).map(a=>({name:a.asset_key,zhName:a.display_name_zh||`${a.source_ref?.source_key} ${a.source_position}`,displayNameEn:a.display_name_en,materialId:a.material_id,assetKey:a.asset_key,sourceForm:a.form,category:a.category||'crystal',isLocal:true}))];
  if(disposed)return;
  const {createBraceletCanvas}=await import('./bracelet-canvas.mjs');if(disposed)return;
  canvas=createBraceletCanvas({canvasElement:q('[data-studio-canvas]'),trashElement:q('[data-trash]'),state:history.present,resolveMaterial:materialImage,onCommand:command=>{if(disposed)return;if(command.type==='select-instance'){if(!visibleInstances().some(i=>i.instanceId===command.instanceId))return;history.present={...history.present,selectedInstanceId:command.instanceId};sync();selection();draw();return;}commit(command);}});
  history.present={...history.present,activeMaterialName:active};refresh();
  await draftOptions().catch(e=>message(e.message));
  if(disposed)return;
  try {
    const launch=await api('/api/nature-launch');
    if(disposed)return;
    const board=q('[data-studio-launch-board]');
    if(!launch.available) board.textContent='正式 18 款设计包尚未交付；不会用测试设计冒充首发方案。';
    else {
      const designs=launch.validation.designs;
      board.innerHTML=renderPortfolio(launch.validation);
      board.querySelectorAll('[data-design]').forEach(button=>button.onclick=()=>{
        loadSequence+=1;
        const design=designs.find(d=>d.design_id===button.dataset.design);
        history=createHistory(createBraceletState({...designToStateInput(design),layoutMode:'bracelet'}),80);
        draft={name:design.zh_name,theme:design.theme,designId:design.design_id,notes:design.scene,expectedBom:design.expected_bom,formalSource:'nature-launch-v1'};
        fillMeta();refresh();host.scrollIntoView({behavior:'smooth',block:'start'});
        message('已载入 '+design.zh_name+' 的本地可编辑副本。');
      });
    }
  }
  catch(e){if(!disposed)q('[data-studio-launch-board]').textContent=`设计包读取失败：${e.message}`;}
  })();
  return {ready,dispose(){disposed=true;loadSequence+=1;host.onkeydown=null;canvas?.dispose();}};
}
