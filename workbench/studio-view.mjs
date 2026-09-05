import {createBraceletState,createHistory,applyHistoryCommand,commitHistoryState,serializeBraceletState,undoHistory,redoHistory} from './bracelet-state.mjs';
import {aggregateBom,compareExpectedBom,knownCostSummary} from './bom.mjs';
import {fitEstimate} from './bracelet-fit.mjs';
import {designToStateInput} from './design-package.mjs';
import {renderPortfolio} from './portfolio-view.mjs';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const themes={Mountain:'山',Ocean:'海',Forest:'森林',Sunrise:'日出',Starlight:'星辰',Glacier:'冰川'};
const sourceLabel={APPROVED:'已批准',PROPOSED:'待确认',UNRESOLVED:'待解析'};
const slug=value=>String(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-');
const api=async(url,options)=>{const r=await fetch(url,options); const body=await r.json(); if(!r.ok) throw new Error(body.error?.message||body.error||`请求失败 ${r.status}`); return body;};
const bomRows=instances=>aggregateBom(instances).map(r=>({material_id:r.material_id??r.materialId,spec_id:r.spec_id??r.specId,name_zh:r.name_zh??r.displayNameZh??r.display_name_zh??'',name_en:r.name_en??r.displayNameEn??r.display_name_en??r.materialName??'',form:r.form,size_mm:r.size_mm??r.sizeMm,quantity:r.quantity,source_status:r.source_status??r.sourceStatus,mapping_status:r.mapping_status??r.mappingStatus??'unverified'}));
export function exportDesign(draft,format){
  const rows=bomRows(draft.braceletState?.instances||[]);
  if(format==='bom-csv') {const headers=['material_id','spec_id','name_zh','name_en','form','size_mm','quantity','source_status','mapping_status'];return {ext:'csv',mime:'text/csv;charset=utf-8',text:'\uFEFF'+[headers.join(','),...rows.map(r=>headers.map(k=>`"${String(r[k]??'').replaceAll('"','""')}"`).join(','))].join('\r\n')};}
  if(format==='md') return {ext:'md',mime:'text/markdown;charset=utf-8',text:`# ${draft.name}\n\n主题：${themes[draft.theme]||draft.theme||'未设定'}\n手围：${draft.braceletState?.wristCm??draft.wristCm} cm\n\n## 设计用量\n${rows.map(r=>`- ${r.name_zh||r.name_en||r.material_id} · ${r.spec_id} · ${r.size_mm} mm × ${r.quantity} · ${r.source_status}`).join('\n')}\n\n## 核对\n混合尺寸仅为沿串线长度的近似估算，不是佩戴保证。未知价格不计为零成本。\n\n${draft.notes||''}\n`};
  return {ext:'json',mime:'application/json',text:JSON.stringify(format==='bom-json'?{design_name:draft.name,bom:rows}:draft,null,2)};
}
export function studioMarkup(){return `<section class="p4-studio"><header class="p4-heading"><h1>设计板 <small>Crystal Studio</small></h1><label>设计名称<input data-name placeholder="为这条手串命名"></label><label>载入草稿<select data-load><option value="">选择已保存的草稿</option></select></label></header>
  <div class="p4-tray-area"><div class="p4-tray-stage"><canvas data-studio-canvas width="420" height="420" aria-label="手串设计盘，可拖动每颗珠子"></canvas></div><aside class="p4-inspector"><h2>此刻的设计</h2><div data-studio-status></div><div data-selection></div><p class="p4-note">散珠：盘内自由摆放。成串：沿环拖动改变顺序。点击材料卡仅选中，＋添加一颗。</p><p class="p4-note">生成图仅作排布参考，不代表实物品质；尺寸和贴合度需打样复核。</p><details><summary>设计备注</summary><textarea data-notes aria-label="设计备注"></textarea></details></aside></div>
  <div class="p4-controls"><label>手围<select data-wrist>${[15,16,17,18,19,20].map(n=>`<option value="${n}" ${n===17?'selected':''}>${n} cm</option>`).join('')}</select></label><label>主题<select data-theme>${Object.entries(themes).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label><button data-action="undo">撤销</button><button data-action="redo">重做</button><button data-action="clear">清空</button><button data-action="save">保存草稿</button><button data-action="reload">重载</button><button data-action="bracelet" class="p4-primary">收拢成串</button><button data-action="loose">解除串珠</button></div>
  <p class="p4-message" data-message role="status">选择材料规格，开始排珠。</p>
  <section class="p4-library"><div class="p4-library-heading"><h2>材料库</h2><input data-studio-search type="search" placeholder="搜索中英文材料名称" aria-label="搜索材料"><div data-studio-tabs>${[['crystal','水晶'],['organic','珍珠 / 天然'],['hardware','配饰'],['focal','异形主石']].map(([key,label])=>`<button data-tab="${key}" aria-pressed="${key==='crystal'}">${label}</button>`).join('')}</div></div><div data-studio-material-grid></div></section>
  <details class="p4-bom" open><summary>实时 BOM · 材料与采购状态</summary><div data-studio-bom></div><div class="p4-export"><button data-export="design-json">导出设计 JSON</button><button data-export="bom-json">导出 BOM JSON</button><button data-export="bom-csv">导出 BOM CSV</button><button data-export="md">导出设计单</button></div></details>
  <section class="p4-portfolio"><h2>自然首发 · 六主题设计总览</h2><div data-studio-launch-board>读取正式设计包…</div></section></section>`;}

export function renderStudio({host,initialDraft={},materials=[],resolveMaterial,onDraft=()=>{},setStatus=()=>{}}){
  let draft=structuredClone(initialDraft), tab='crystal',active=materials[0]?.name, specs=new Map(),canvas,disposed=false;
  const input=draft.braceletState||{wristCm:draft.wristCm,items:draft.items,layout:draft.layout};
  let history=createHistory(createBraceletState({...input,layoutMode:input.layoutMode||'loose'}),80);
  let localAssets=[];
  let loadSequence=0;
  host.innerHTML=studioMarkup();
  const q=s=>host.querySelector(s);
  const message=s=>{if(disposed)return;const target=q('[data-message]');if(target)target.textContent=s;setStatus(s);};
  const sync=()=>{if(disposed)return;
    // Catalog choices are a separate ledger, not a projection of placed beads.
    // Coalesce earlier per-instance drafts so one Catalog + still adds exactly one.
    const choices=new Map();
    for(const item of draft.items||[]){const quantity=Math.max(0,Number(item.quantity)||0);if(!item.name||!quantity)continue;const previous=choices.get(item.name);choices.set(item.name,previous?{...previous,quantity:previous.quantity+quantity}:{...item,quantity});}
    draft={...draft,wristCm:history.present.wristCm,braceletState:serializeBraceletState(history.present),items:[...choices.values()]};onDraft(structuredClone(draft));};
  const materialImage=(name,instance={})=>{
    const generated=resolveMaterial(instance.displayNameEn||name,instance)||{};
    const candidates=localAssets.filter(a=>a.material_id===instance.materialId&&a.spec_id===instance.specId&&!a.needs_mask&&a.imageUrl);
    const local=candidates.find(a=>['source_cutout','source_derived'].includes(a.representation_class))||candidates.find(a=>a.representation_class==='generated_from_evidence');
    return local?{...generated,atlas:undefined,imageUrl:local.imageUrl,assetRef:local.file,provenanceClass:local.representation_class}:generated;
  };
  const meta=m=>{const spec=specs.get(m.name)||{sizeMm:8,form:tab==='hardware'?'connector':tab==='focal'?'irregular':'round'};const materialId=m.materialId||`candidate-${slug(m.name)}`;return {...spec,materialName:m.name,materialId,specId:`${materialId}-${spec.form}-${spec.sizeMm}mm`,displayNameZh:m.zhName,displayNameEn:m.name,sourceStatus:'PROPOSED',mappingStatus:'unverified',provenanceClass:'generated_from_evidence'};};
  const commit=command=>{history=applyHistoryCommand(history,command);refresh();};
  const add=m=>{active=m.name;commit({type:'place',...meta(m)});message(`已添加一颗${m.zhName}，可在盘内拖动。`);};
  const select=m=>{active=m.name;history.present={...history.present,activeMaterialName:m.name};library();canvas?.render(history.present);message(`已选${m.zhName}；点击圆盘放入，或用＋添加。`);};
  function library(){
    const search=q('[data-studio-search]').value.toLowerCase();
    const rows=materials.filter(m=>(tab==='focal'?m.category==='crystal':m.category===tab)&&`${m.name} ${m.zhName}`.toLowerCase().includes(search));
    q('[data-studio-material-grid]').innerHTML=rows.map(m=>{const p=meta(m),img=materialImage(m.name,p),count=history.present.instances.filter(i=>i.materialId===p.materialId&&i.specId===p.specId).length;return `<article class="p4-material ${active===m.name?'selected':''}" data-material="${esc(m.name)}"><button class="p4-select" data-select="${esc(m.name)}" aria-pressed="${active===m.name}"><span class="p4-thumb">${img.imageUrl?`<img src="${esc(img.imageUrl)}" alt="${esc(m.zhName)} ${esc(img.provenanceClass)}">`:m.thumbnail||'<span>待接入</span>'}</span><strong>${esc(m.zhName)}</strong><small>${esc(m.name)}</small></button><div class="p4-spec"><label>尺寸<input data-size="${esc(m.name)}" type="number" min="1" max="60" step="0.5" value="${p.sizeMm}" aria-label="${esc(m.zhName)}沿线尺寸 mm"></label><select data-form="${esc(m.name)}" aria-label="${esc(m.zhName)}形态">${[['round','圆珠'],['irregular','异形'],['connector','结构件']].map(([key,label])=>`<option value="${key}" ${p.form===key?'selected':''}>${label}</option>`).join('')}</select></div><div class="p4-count"><button data-minus="${esc(m.name)}" aria-label="减少${esc(m.zhName)}">−</button><b>${count}</b><button data-plus="${esc(m.name)}" aria-label="添加${esc(m.zhName)}">＋</button></div><small>规格待确认 · ${['source_cutout','source_derived'].includes(img.provenanceClass)?'本地源图':'生成参考图'}</small></article>`;}).join('')||'<p>没有匹配材料。</p>';
    q('[data-studio-material-grid]').querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>select(materials.find(m=>m.name===b.dataset.select)));
    q('[data-studio-material-grid]').querySelectorAll('[data-plus]').forEach(b=>b.onclick=()=>add(materials.find(m=>m.name===b.dataset.plus)));
    q('[data-studio-material-grid]').querySelectorAll('[data-minus]').forEach(b=>b.onclick=()=>{const m=materials.find(m=>m.name===b.dataset.minus),p=meta(m),found=[...history.present.instances].reverse().find(i=>i.materialId===p.materialId&&i.specId===p.specId);if(found)commit({type:'remove',instanceId:found.instanceId});});
    q('[data-studio-material-grid]').querySelectorAll('[data-size],[data-form]').forEach(el=>{
      const update=()=>{const name=el.dataset.size||el.dataset.form,m=materials.find(x=>x.name===name),p=meta(m);if(el.dataset.size){const v=Number(el.value);if(!Number.isFinite(v)||v<1||v>60){message('尺寸需在 1–60 mm 之间。');return;}p.sizeMm=v;}else p.form=el.value;specs.set(name,{sizeMm:p.sizeMm,form:p.form});};
      el.oninput=update;el.onchange=update;
    });
  }
  function selection(){
    const i=history.present.instances.find(x=>x.instanceId===history.present.selectedInstanceId);
    q('[data-selection]').innerHTML=i?`<h3>已选珠子</h3><p>${esc(i.displayNameZh||i.materialName)} · ${i.sizeMm} mm</p><button data-delete>删除这颗</button><button data-replace>用当前材料替换</button><button data-swap>与下一颗换位</button>`:'<p class="p4-note">点击珠子可删除、替换或换位。</p>';
    if(!i)return;
    q('[data-delete]').onclick=()=>commit({type:'remove',instanceId:i.instanceId});
    q('[data-replace]').onclick=()=>{const m=materials.find(m=>m.name===active);if(m)commit({type:'replace',instanceId:i.instanceId,...meta(m)});};
    q('[data-swap]').onclick=()=>{
      const state=history.present,n=state.instances.findIndex(x=>x.instanceId===i.instanceId),other=state.instances[(n+1)%state.instances.length];
      if(!other||other===i)return;
      const instances=[...state.instances];
      [instances[n],instances[(n+1)%instances.length]]=[{...other,looseX:i.looseX,looseY:i.looseY},{...i,looseX:other.looseX,looseY:other.looseY}];
      history=commitHistoryState(history,createBraceletState({...serializeBraceletState(state),instances}));refresh();
    };
  }
  function refresh(){if(disposed)return;sync();const state=history.present,fit=fitEstimate({wristCm:state.wristCm,instances:state.instances});q('[data-studio-status]').innerHTML=`<strong>${state.instances.length} 颗 / 件 · ${state.layoutMode==='loose'?'散珠自由摆放':'已收拢成串'}</strong><p>目录备选：${draft.items.length} 种 · ${draft.items.reduce((sum,item)=>sum+item.quantity,0)} 颗 / 件（与已排珠子独立，不自动放入）</p>${draft.items.length?`<small>${draft.items.map(item=>`${esc(materials.find(m=>m.name===item.name)?.zhName||item.name)} × ${item.quantity}`).join(' · ')}</small>`:''}<p>沿线用量 ${fit.usedMm.toFixed(1)} mm / 目标 ${fit.targetMm.toFixed(1)} mm</p><p>${fit.status==='underfilled'?`还差约 ${Math.abs(fit.deltaMm).toFixed(1)} mm`:fit.status==='overflow'?`超出约 ${Math.abs(fit.deltaMm).toFixed(1)} mm`:fit.status==='fit'?'接近目标长度':'尺寸待核对'}</p><small>含 5 mm 余量的近似估算，非实际内圈测量。</small>`;
    q('[data-wrist]').value=state.wristCm;q('[data-action="undo"]').disabled=!history.past.length;q('[data-action="redo"]').disabled=!history.future.length;q('[data-action="bracelet"]').disabled=state.layoutMode==='bracelet';q('[data-action="loose"]').disabled=state.layoutMode==='loose';
    const rows=bomRows(state.instances);q('[data-studio-bom]').innerHTML=`<div class="p4-table-scroll"><table><thead><tr><th>材料</th><th>规格</th><th>数量</th><th>采购状态</th><th>映射</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.name_zh||r.name_en||r.material_id)}</td><td>${esc(r.form)} · ${r.size_mm} mm</td><td>${r.quantity}</td><td>${esc(sourceLabel[r.source_status]||r.source_status)}</td><td>${esc(r.mapping_status)}</td></tr>`).join('')}</tbody></table></div><p>价格：${state.instances.some(i=>i.unitCost)?esc(JSON.stringify(knownCostSummary(state.instances))):'— 尚无可核验价格，不估算总价。'}</p>${draft.expectedBom?`<p>原设计 BOM 对比：${esc(JSON.stringify(compareExpectedBom(aggregateBom(state.instances),draft.expectedBom)))}</p>`:''}`;
    library();selection();canvas?.render(state);
  }
  async function draftOptions(){if(disposed)return;const result=await api('/api/drafts');if(disposed)return;q('[data-load]').innerHTML='<option value="">选择已保存的草稿</option>'+result.drafts.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');}
  const fillMeta=()=>{q('[data-name]').value=draft.name||'';q('[data-theme]').value=draft.theme||'Glacier';q('[data-notes]').value=draft.notes||'';};
  async function load(name){if(disposed)return;const sequence=++loadSequence;let loaded;try{loaded=await api(`/api/drafts/${encodeURIComponent(name)}`);}catch(error){if(disposed||sequence!==loadSequence)return;throw error;}if(disposed||sequence!==loadSequence)return;draft=loaded;history=createHistory(createBraceletState({...draft.braceletState,layout:draft.braceletState?undefined:draft.layout,items:draft.items,layoutMode:draft.braceletState?.layoutMode||'loose',wristCm:draft.wristCm}),80);fillMeta();refresh();message('草稿已重载，珠子身份、位置和规格保留。');}
  fillMeta();q('[data-name]').oninput=e=>{draft.name=e.target.value;sync();};q('[data-notes]').oninput=e=>{draft.notes=e.target.value;sync();};q('[data-theme]').onchange=e=>{draft.theme=e.target.value;sync();};q('[data-wrist]').onchange=e=>commit({type:'wrist',wristCm:Number(e.target.value)});
  q('[data-studio-search]').oninput=library;host.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;host.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));library();});
  q('[data-load]').onchange=e=>e.target.value&&load(e.target.value).catch(e=>message(e.message));
  host.querySelectorAll('[data-action]').forEach(b=>b.onclick=async()=>{try{const action=b.dataset.action;if(action==='undo')history=undoHistory(history);if(action==='redo')history=redoHistory(history);if(action==='clear')history=commitHistoryState(history,createBraceletState({...serializeBraceletState(history.present),instances:[]}));if(action==='bracelet'||action==='loose')history=applyHistoryCommand(history,{type:'layout-mode',layoutMode:action});if(action==='reload'){if(!draft.name)return message('请先命名并保存草稿。');return await load(draft.name);}if(action==='save'){if(!draft.name?.trim())return message('请先填写设计名称。');sync();await api(`/api/drafts/${encodeURIComponent(draft.name)}`,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(draft)});await draftOptions();message('草稿已保存到本机，不改动正式设计包。');}refresh();}catch(e){message(e.message);}});
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
  if(disposed)return;
  const {createBraceletCanvas}=await import('./bracelet-canvas.mjs');if(disposed)return;
  canvas=createBraceletCanvas({canvasElement:q('[data-studio-canvas]'),state:history.present,resolveMaterial:materialImage,onCommand:command=>{if(disposed)return;if(command.type==='select-instance'){history.present={...history.present,selectedInstanceId:command.instanceId};sync();selection();return;}if(command.type==='place'){const m=materials.find(m=>m.name===active);if(!m)return;command={type:'place',looseX:command.looseX,looseY:command.looseY,slotIndex:command.slotIndex,...meta(m)};}commit(command);}});
  // The canvas reads activeMaterialName to allow a selected catalog material to be inserted at any tray point.
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
  return {ready,dispose(){disposed=true;loadSequence+=1;canvas?.dispose();}};
}
