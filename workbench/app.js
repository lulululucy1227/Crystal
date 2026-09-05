import { addToSelection, createBalancedLayout, createTrayPlan, placeMaterialAtSlot } from './design-tray.mjs';
import {
  applyHistoryCommand,
  commitHistoryState,
  createBraceletState,
  createHistory,
  redoHistory,
  selectMaterial,
  serializeBraceletState,
  undoHistory,
} from './bracelet-state.mjs';
import { createBraceletCanvas } from './bracelet-canvas.mjs';

let data;
let drafts = [];
let generatedAssets;
let view = 'catalog';
let section = 'minerals_crystals';
let studioSection = 'minerals_crystals';
let braceletHistory;
let braceletCanvas;
let draft = { name: '', theme: 'Glacier', wristCm: 17, beadMm: 8, items: [], notes: '', layout: [], activeItemName: '', manualLayout: false };

const app = document.querySelector('#app');
const status = document.querySelector('#status-text');
const labels = {
  minerals_crystals: '水晶目录',
  pearls_organic: '珍珠 / 天然材质',
  hardware_accessories: '配饰 / 结构件',
  packaging: '包装'
};
const chineseNames = {
  'Clear Quartz':'白水晶','Smoky Quartz':'茶晶','Aquamarine':'海蓝宝','Labradorite':'拉长石',
  'Rainbow Moonstone':'彩虹月光石','Amazonite':'天河石','Lapis Lazuli':'青金石',
  'Green Phantom Quartz':'绿幽灵','Obsidian':'黑曜石','Amethyst':'紫水晶','Citrine':'黄水晶',
  "Tiger's Eye":'虎眼石','Blue Lace Agate':'蓝纹玛瑙','Kunzite':'锂辉石','Bloodstone':'血石',
  'White Phantom Quartz':'白幽灵','Rose Quartz':'粉水晶','Rainbow Obsidian':'彩虹黑曜石',
  'Larimar':'海纹石','Gold Rutilated Quartz':'金发晶','Black Rutilated Quartz':'黑发晶',
  'Rutilated Quartz':'发晶','Sugilite':'舒俱来','Aquamarine / collector focal grade':'海蓝宝 / 收藏级主石',
  'White freshwater pearl':'白色淡水珍珠','Akoya Pearl':'Akoya 珍珠','Tahitian Pearl':'大溪地珍珠','White South Sea Pearl':'白色南洋珠','Golden South Sea Pearl':'金色南洋珠','Dark wood / agarwood-like structural spacer':'深色木材/沉香感结构隔片'
  ,'925 sterling silver micro spacer':'925 银微型隔珠','925 sterling silver curved tube':'925 银弧形管','925 sterling silver thin frame / bezel':'925 银细框 / 包边','925 sterling silver half-cap / edge-cap':'925 银半帽 / 边帽','925 sterling silver geometric connector':'925 银几何连接件','925 sterling silver small round counterweight':'925 银小圆配重珠','925 sterling silver fine chain + minimal clasp':'925 银细链 + 极简扣','925 sterling silver micro organic charm':'925 银微型有机吊饰','Oxidized / blackened sterling silver micro accent':'氧化黑银微型点缀','Gold-tone hardware':'金色五金','Compact matte white rigid presentation box':'紧凑哑光白硬质礼盒','Cool grey rigid drawer box':'冷灰硬质抽屉盒','Soft grey or pearl-white protective pouch':'柔灰 / 珍珠白保护袋','Cotton-linen envelope pouch':'棉麻信封袋','Book-style magnetic box':'书型磁吸盒','Material disclosure + care card':'材质说明 + 养护卡','One-of-One certificate card':'孤品证书卡','Branded shipping mailer':'品牌寄件盒'
};
const tierNames = { A_CORE:'核心常备', B_DESIGN_EXTENSION:'设计扩展', C_SIGNATURE_ONE_OF_ONE:'Signature / 孤品', RESERVE_NOT_CORE:'备用' };
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (x) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const itemName = (item) => item.name || item.canonical_name || item.component_code || item.packaging_code || '未命名选项';
const zh = (item) => item.zh_name || chineseNames[itemName(item)] || itemName(item);
const bilingual = (item) => `<strong>${esc(zh(item))}</strong><small>${esc(itemName(item))}</small>`;
const detail = (item) => item.selection_notes || item.description || item.material_description || item.notes || '可用于设计台的已整理选项。';
const setStatus = (message = '就绪') => { status.textContent = message; };

function updateClock() {
  document.querySelector('#local-clock').textContent = new Intl.DateTimeFormat('zh-CN', { dateStyle:'medium', timeStyle:'short' }).format(new Date());
}

function setView(next, nextSection) {
  if (view === 'desk' && next !== 'desk') {
    braceletCanvas?.dispose();
    braceletCanvas = undefined;
  }
  view = next;
  if (nextSection) section = nextSection;
  document.body.dataset.currentView = next;
  document.querySelectorAll('[data-view]').forEach((button) => button.classList.toggle('selected', button.dataset.view === view && (!button.dataset.section || button.dataset.section === section)));
  render();
}

function addToDesk(name) {
  const source = data.assortment.items.find((item) => item.name === name) || Object.keys(labels).flatMap((key) => displayItems(key)).find((item) => item.name === name);
  if (!source) { setStatus('未找到可加入的材料。'); return; }
  draft.items = addToSelection(draft.items, { ...source, role: source.roles?.[0] || '', form: source.preferred_forms?.[0] || '' });
  draft.manualLayout = true;
  const selected = draft.items.find((item) => item.name === source.name);
  setStatus(`已选 ${zh(source)} × ${selected.quantity}；选择材料不会自动放珠。`);
  if (view === 'catalog') renderCatalog();
  if (view === 'desk') refreshDesignStudio();
}

function itemForName(name) { return draft.items.find((item) => item.name === name); }

function layoutFor(plan) {
  if (!draft.manualLayout) {
    draft.layout = createBalancedLayout({ capacity: plan.capacity, items: draft.items });
    return draft.layout;
  }
  const allowed = new Map(draft.items.map((item) => [item.name, Math.max(0, Number(item.quantity) || 0)]));
  const used = new Map();
  const layout = Array.from({ length: plan.capacity }, (_, index) => draft.layout?.[index] || null).map((name) => {
    if (!name || !allowed.has(name)) return null;
    const nextUsed = (used.get(name) || 0) + 1;
    if (nextUsed > allowed.get(name)) return null;
    used.set(name, nextUsed);
    return name;
  });
  draft.layout = layout;
  return layout;
}

const generatedRoot = 'assets/catalog/generated/';
const generatedRepresentation = 'generated_from_evidence';
const gradeOverrideAtlas = 'crystals-grade-overrides-v1.svg';
const generatedSlug = {'Clear Quartz':'clear_quartz','Smoky Quartz':'smoky_quartz','Aquamarine':'aquamarine','Labradorite':'labradorite','Rainbow Moonstone':'rainbow_moonstone','Amazonite':'amazonite','Lapis Lazuli':'lapis_lazuli','Green Phantom Quartz':'green_phantom_quartz','Obsidian':'obsidian','Amethyst':'amethyst','Citrine':'citrine',"Tiger's Eye":'tigers_eye','Blue Lace Agate':'blue_lace_agate','Kunzite':'kunzite','Bloodstone':'bloodstone','White Phantom Quartz':'white_phantom_quartz','Rose Quartz':'rose_quartz','Rainbow Obsidian':'rainbow_obsidian','Larimar':'larimar','Gold Rutilated Quartz':'gold_rutilated_quartz','Black Rutilated Quartz':'black_rutilated_quartz','Rutilated Quartz':'mixed_rutilated_quartz','Sugilite':'sugilite','White freshwater pearl':'freshwater_white','Akoya Pearl':'akoya','Tahitian Pearl':'tahitian','White South Sea Pearl':'south_sea_white','Golden South Sea Pearl':'south_sea_golden','Dark wood / agarwood-like structural spacer':'dark_wood_agarwood_like','925 sterling silver micro spacer':'silver_micro_spacer','925 sterling silver curved tube':'curved_silver_tube','925 sterling silver thin frame / bezel':'thin_silver_frame_bezel','925 sterling silver half-cap / edge-cap':'silver_half_cap','925 sterling silver geometric connector':'geometric_connector','925 sterling silver small round counterweight':'silver_transition_sphere','925 sterling silver fine chain + minimal clasp':'fine_silver_chain_clasp','Oxidized / blackened sterling silver micro accent':'oxidized_silver_micro_accent','Compact matte white rigid presentation box':'matte_white_rigid_box','Cool grey rigid drawer box':'cool_grey_drawer_box','Soft grey or pearl-white protective pouch':'pearl_white_pouch','Material disclosure + care card':'care_card','Branded shipping mailer':'shipping_mailer','Cotton-linen envelope pouch':'cotton_linen_pouch','Book-style magnetic box':'book_style_magnetic_box','One-of-One certificate card':'one_of_one_certificate'};
function assetSlug(item){return item.generated_slug || generatedSlug[itemName(item)]||Object.entries(generatedAssets?.item_labels||{}).find(([,v])=>v.includes(itemName(item))||v.includes(zh(item)))?.[0]}
function atlasSprite(type,slug){const a=generatedAssets?.atlases?.[type],i=a?.order.indexOf(slug);if(!a||i<0)return '';const c=a.grid.columns,r=Math.ceil(a.order.length/c),x=i%c,y=Math.floor(i/c);return `style="--atlas:url('${esc(a.file.replace('workbench/',''))}');--atlas-size:${c*100}% ${r*100}%;--atlas-pos:${x/(c-1)*100}% ${r===1?0:y/(r-1)*100}%"`}
function crystalImage(item){const slug=assetSlug(item);const type=Object.entries(generatedAssets?.atlases||{}).find(([,a])=>a.order?.includes(slug)&&a.file.includes('hero'))?.[0];return type?`<span class="atlas-sprite atlas-hero" ${atlasSprite(type,slug)} role="img" aria-label="${esc(zh(item)+' 概念占位，非实拍')}"></span><span class="representation-note">概念占位 · 非实拍</span>`:''}

function assetSection(slug) {
  if (generatedAssets?.atlases?.crystals_hero.order.includes(slug)) return 'minerals_crystals';
  if (generatedAssets?.atlases?.pearls_organic_hero.order.includes(slug)) return 'pearls_organic';
  if (generatedAssets?.atlases?.hardware_hero.order.includes(slug)) return 'hardware_accessories';
  if (generatedAssets?.atlases?.packaging_hero.order.includes(slug)) return 'packaging';
}
function generatedDisplayItem(slug) {
  const [zhName, englishName] = generatedAssets.item_labels[slug];
  return { name: englishName, generated_slug: slug, generated_only: true, section: assetSection(slug), zh_name: zhName, selection_notes: '概念占位，非实拍；真实单珠素材待接入。' };
}
function displayItems(targetSection) {
  const orders = Object.values(generatedAssets?.atlases || {}).filter((atlas) => atlas.file.includes('hero')).flatMap((atlas) => atlas.order);
  return orders.filter((slug) => assetSection(slug) === targetSection).map((slug) => data.assortment.items.find((item) => assetSlug(item) === slug) || generatedDisplayItem(slug));
}

function formSlots(item) {
  const slug=assetSlug(item), crystal=generatedAssets?.atlases?.crystals_hero.order.includes(slug), pearl=generatedAssets?.atlases?.pearls_organic_hero.order.includes(slug), override=crystal&&generatedAssets?.overrides?.overrides?.[slug];
  if(!slug||(!crystal&&!pearl))return '<div class="form-slots"><div class="form-slot"><span class="neutral-slot">标准视觉参考</span></div></div>';
  const atlas=override?generatedAssets.overrides:(crystal?generatedAssets.atlases.crystals_comparison:generatedAssets.atlases.pearls_organic_comparison), order=atlas.order, i=order.indexOf(slug), cells=atlas.grid.columns, cols=cells*3, rows=Math.ceil(order.length/cells), y=Math.floor(i/cells);
  return `<div class="form-slots visual-reference" aria-label="视觉品质参考，非市场等级">${[0,1,2].map(v=>`<span class="atlas-sprite atlas-grade ${override?'grade-override':'grade-base'}" data-comparison-source="${override?'override':'base'}" style="--atlas:url('${generatedRoot}${override?gradeOverrideAtlas:'crystals-comparison-atlas.svg'}');--atlas-size:${cols*100}% ${rows*100}%;--atlas-pos:${((i%cells)*3+v)/(cols-1)*100}% ${rows===1?0:y/(rows-1)*100}%"></span>`).join('')}</div>`;
}

function renderCounts() {
  const by = data.overview.assortmentBySection;
  document.querySelector('#today-counts').innerHTML = [
    ['水晶种类', by.minerals_crystals || 0],
    ['配饰数量', by.hardware_accessories || 0],
    ['包装数量', by.packaging || 0],
    ['设计草稿', drafts.length]
  ].map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
}

function railCell(item) {
  return `<button class="rail-item" data-view="catalog" data-section="${esc(item.section)}">${crystalImage(item)||'<span class="rail-empty">标准素材待映射</span>'}<b>${esc(zh(item))}</b><small>${esc(itemName(item))}</small></button>`;
}

function renderRail() {
  const accessories = displayItems('hardware_accessories');
  const packaging = displayItems('packaging');
  document.querySelector('#accessory-preview').innerHTML = accessories.map(railCell).join('') || '<p class="rail-empty-state">暂无配饰选项</p>';
  document.querySelector('#packaging-preview').innerHTML = packaging.map(railCell).join('') || '<p class="rail-empty-state">暂无包装选项</p>';
  bindViewButtons(document);
}

function renderHome() {
  const by = data.overview.assortmentByPriority;
  app.innerHTML = `<section class="content-panel"><div class="panel-title">总览</div><div class="overview"><h1>水晶设计工作台</h1><p>选材料、找灵感、做设计。</p><div class="home-actions"><button data-view="catalog">开始选品</button><button data-view="inspiration">查看灵感</button><button data-view="desk">开始设计</button></div><div class="overview-note">当前材料、配饰与包装均来自项目已有选品；设计草稿仅保存在本地 sidecar。</div><div class="recent-panel"><div class="panel-title">最近打开的设计板</div>${recentDrafts()}</div></div></section>`;
  bindViewButtons(app);
}

function recentDrafts() {
  const items = drafts.slice(0, 3);
  const cards = items.length ? items.map((name) => `<button class="recent-card" data-load="${esc(name)}"><span>设计草稿</span><b>${esc(name)}</b><small>点击载入</small></button>`).join('') : '<div class="recent-empty">尚无已保存草稿</div>';
  return `<div class="recent-grid">${cards}<button class="new-board" data-view="desk"><span>+</span>新建设计板</button></div>`;
}

function selectionSummary() {
  const plan = createTrayPlan(draft);
  return `<section class="selection-summary" aria-label="当前选择"><div><strong>当前选择</strong><span>${draft.items.length} 种材料 · ${plan.planned} 颗/件</span></div>${renderTray(plan, { compact: true })}<button data-view="desk">进入设计板</button><button id="clear-selection" ${draft.items.length ? '' : 'disabled'}>清空选择</button></section>`;
}

function renderCatalog() {
  const rows = displayItems(section);
  app.innerHTML = `<section class="content-panel catalogue-panel"><div class="panel-title">${labels[section] || '选品目录'} <span id="catalogue-count">共 ${rows.length} 种${section === 'minerals_crystals' ? '水晶' : '选项'}</span></div>${selectionSummary()}<div class="catalogue-filters"><label>搜索 <input id="search" placeholder="名称"></label><label>形状 <input id="shape" placeholder="全部"></label><label>尺寸(mm) <input id="size" placeholder="规格"></label><label>颜色 <select id="color" disabled><option>暂无可信字段</option></select></label><button id="clear-filter">清除</button></div><div class="catalogue-grid" id="catalogue-grid"></div><section class="recent-panel"><div class="panel-title">最近打开的设计板</div>${recentDrafts()}</section></section>`;
  const draw = () => {
    const search = app.querySelector('#search').value.toLowerCase();
    const shape = app.querySelector('#shape').value.toLowerCase();
    const size = app.querySelector('#size').value.toLowerCase();
    const filtered = rows.filter((item) => {
      const forms = (item.preferred_forms || []).join(' ').toLowerCase();
      return (!search || JSON.stringify(item).toLowerCase().includes(search)) && (!shape || forms.includes(shape)) && (!size || forms.includes(size));
    });
    app.querySelector('#catalogue-count').textContent = `共 ${filtered.length} 种${section === 'minerals_crystals' ? '水晶' : '选项'}`;
    app.querySelector('#catalogue-grid').innerHTML = filtered.map((item) => `<article class="material-card"><h2>${bilingual(item)}</h2><div class="visual-stage">${crystalImage(item) || '<span class="asset-missing">图片由 GPT 素材任务接入</span>'}</div>${formSlots(item)}<dl class="material-facts"><div><dt>设计角色</dt><dd>${esc((item.roles || []).slice(0, 2).join(' / ') || '待补')}</dd></div><div><dt>推荐规格</dt><dd>${esc((item.preferred_forms || []).slice(0, 2).join(' · '))}</dd></div></dl><button class="details-button" data-add="${esc(item.name)}">加入当前选择</button></article>`).join('') + `<button class="add-material-card" title="当前版本不支持直接新增 canonical 数据"><span>+</span>添加水晶<small>新增目录项需要先完成素材与数据审核</small></button>`;
    app.querySelectorAll('[data-add]').forEach((button) => button.onclick = () => addToDesk(button.dataset.add));
  };
  app.querySelectorAll('.catalogue-filters input').forEach((input) => input.oninput = draw);
  app.querySelector('#clear-filter').onclick = () => { app.querySelectorAll('.catalogue-filters input').forEach((input) => input.value = ''); draw(); };
  app.querySelector('#clear-selection').onclick = () => { draft.items = []; draft.layout = []; draft.activeItemName = ''; draft.manualLayout = false; setStatus('当前选择已清空。'); renderCatalog(); };
  draw();
  bindViewButtons(app);
  app.querySelectorAll('[data-load]').forEach((button) => button.onclick = () => loadDraft(button.dataset.load));
}

function renderInspiration() {
  const references = data.references.slice(0, 8);
  app.innerHTML = `<section class="content-panel"><div class="panel-title">参考图库</div><div class="library-heading"><h1>灵感库</h1><p>查看已整理的设计参考与主题语言。</p></div><div class="reference-list">${references.map((ref) => `<article><div class="reference-mark">参考图<br>已整理</div><div><h2>${esc(ref.title || '设计参考')}</h2><p>${esc(ref.snippets?.[0]?.value || ref.notes || '已保存的视觉参考。')}</p><small>${esc((ref.themes || []).join(' · ')) || '未标注主题'}</small></div></article>`).join('') || '<p class="recent-empty">暂无可显示的设计参考。</p>'}</div></section>`;
}

function traySprite(item) {
  const slug = assetSlug(item);
  const type = Object.entries(generatedAssets?.atlases || {}).find(([, atlas]) => atlas.order?.includes(slug) && atlas.file.includes('hero'))?.[0];
  return type ? `<span class="atlas-sprite tray-bead" ${atlasSprite(type, slug)} title="${esc(zh(item))}" aria-label="${esc(zh(item))}"></span>` : `<span class="tray-bead tray-bead-fallback" title="${esc(zh(item))}">${esc(zh(item).slice(0, 1))}</span>`;
}

function renderTray(plan, { compact = false } = {}) {
  const layout = layoutFor(plan);
  const assigned = layout.map((name) => name ? itemForName(name) : null);
  const ringBead = (item, index) => {
    const angle = (index / plan.capacity) * 360 - 90;
    const content = item ? traySprite(item) : '<span class="tray-bead tray-bead-empty" aria-label="空位"></span>';
    const controls = compact ? '' : ` data-slot="${index}"${item ? ` data-placed-material="${esc(item.name)}"` : ''}`;
    const classes = `bracelet-bead${item ? '' : ' bracelet-bead-empty'}${item?.name === draft.activeItemName ? ' bracelet-bead-active' : ''}`;
    if (compact) return `<span class="${classes}" style="--bead-angle:${angle}deg"${item ? ` title="${esc(zh(item))}"` : ''}>${content}</span>`;
    return `<button type="button" class="${classes}" style="--bead-angle:${angle}deg"${controls}${item ? ` title="${esc(zh(item))}"` : ' aria-label="空位"'}>${content}</button>`;
  };
  const beads = Array.from({ length: plan.capacity }, (_, index) => ringBead(assigned[index], index)).join('');
  const placed = assigned.filter(Boolean).length;
  const statusText = plan.overflow ? `已选超出 ${plan.overflow} 颗/件` : placed < plan.planned ? `待排 ${plan.planned - placed} 颗/件` : `已排 ${placed} 颗/件`;
  if (compact) return `<div class="catalogue-live-tray" aria-label="实时圆环预览"><span>实时预览</span><div class="bracelet-ring bracelet-ring-mini" role="img" aria-label="当前圆形手串排珠预览">${beads}<span class="bracelet-center">${placed}/${plan.capacity}</span></div></div>`;
  return `<section class="design-tray" aria-label="串珠托盘"><div class="tray-heading"><div><h2>圆形手串预览</h2><p>${plan.wristCm}cm 手围 · 约 ${plan.targetMm}mm 成品内圈 · ${plan.beadMm}mm 参考珠径</p></div><strong class="${plan.overflow ? 'tray-overflow' : ''}">${statusText}</strong></div><div class="bracelet-ring" role="list" aria-label="圆形手串排珠预览">${beads}<span class="bracelet-center">${placed}/${plan.capacity}<small>颗/件</small></span></div><p class="tray-note">先选择下方材料，再点圆环上的任意空珠位放入；点击已放珠位可取回。相同材料可以放在任何相隔的位置，不会被自动并排。真实成品长度仍需以线材、珠径与佩戴松量复核。</p></section>`;
}

function renderPlacementPalette(plan) {
  const layout = layoutFor(plan);
  return `<section class="placement-palette" aria-label="排珠材料"><div><h3>排珠材料</h3><p>选择一种材料，再点圆环内任意空位。已放入的珠可点选取回后重新安排。</p></div><div class="placement-actions"><button type="button" data-rebalance>均匀初排</button><button type="button" data-clear-layout>清空排珠</button></div><div class="placement-items">${draft.items.map((item) => { const placed = layout.filter((name) => name === item.name).length; const remaining = Math.max(0, (Number(item.quantity) || 0) - placed); return `<button type="button" class="placement-item${draft.activeItemName === item.name ? ' selected' : ''}" data-active-material="${esc(item.name)}"><span>${esc(zh(item))}<small>${esc(itemName(item))}</small></span><b>${placed}/${Math.max(0, Number(item.quantity) || 0)}</b><em>${remaining ? `可放 ${remaining}` : '已排完'}</em></button>`; }).join('') || '<p class="recent-empty">先从选品库加入材料。</p>'}</div></section>`;
}

function refreshTray() {
  const preview = app.querySelector('#tray-preview');
  const palette = app.querySelector('#placement-palette');
  if (!preview || !palette) return;
  const plan = createTrayPlan(draft);
  preview.innerHTML = renderTray(plan);
  palette.innerHTML = renderPlacementPalette(plan);
  bindTrayPlacement(app);
}

function currentTrayLayout(plan) {
  const visibleSlots = [...app.querySelectorAll('#tray-preview [data-slot]')];
  if (visibleSlots.length === plan.capacity) return visibleSlots.map((slot) => slot.dataset.placedMaterial || null);
  return layoutFor(plan);
}

function handleTrayInteraction(event) {
  if (view !== 'desk' || !(event.target instanceof Element)) return;
  const materialButton = event.target.closest('[data-active-material]');
  if (materialButton) {
    draft.activeItemName = materialButton.dataset.activeMaterial;
    setStatus(`已选择 ${zh(itemForName(draft.activeItemName))}；请点圆环空位放入。`);
    refreshTray();
    return;
  }
  const rebalanceButton = event.target.closest('[data-rebalance]');
  if (rebalanceButton) {
    const plan = createTrayPlan(draft);
    draft.manualLayout = false;
    draft.layout = createBalancedLayout({ capacity: plan.capacity, items: draft.items });
    setStatus('已按多种材料交错均匀初排；你仍可逐颗手动调整。');
    refreshTray();
    return;
  }
  const clearButton = event.target.closest('[data-clear-layout]');
  if (clearButton) {
    draft.manualLayout = true;
    draft.layout = Array(createTrayPlan(draft).capacity).fill(null);
    setStatus('圆环已清空；材料数量仍保留，可重新逐颗放入。');
    refreshTray();
    return;
  }
  const slotButton = event.target.closest('[data-slot]');
  if (!slotButton) return;
  const index = Number(slotButton.dataset.slot);
  const plan = createTrayPlan(draft);
  const layout = currentTrayLayout(plan);
  const placedMaterial = slotButton.dataset.placedMaterial;
  if (placedMaterial) {
    draft.layout = layout;
    draft.layout[index] = null;
    draft.manualLayout = true;
    setStatus(`已取回 ${zh(itemForName(placedMaterial))}，可重新放到任意位置。`);
    refreshTray();
    return;
  }
  const item = itemForName(draft.activeItemName);
  if (!item) return setStatus('请先在“排珠材料”中选择一种材料。');
  const next = placeMaterialAtSlot({ layout, slotIndex: index, materialName: item.name, allowedQuantity: item.quantity });
  if (next[index] !== item.name) return setStatus(`${zh(item)} 的可放数量已用完；请先取回一个已放珠位。`);
  draft.layout = next;
  draft.manualLayout = true;
  setStatus(`已将 ${zh(item)} 放入第 ${index + 1} 个珠位。`);
  refreshTray();
}

function bindTrayPlacement(scope) {
  scope.querySelectorAll('[data-active-material],[data-rebalance],[data-clear-layout],[data-slot]').forEach((button) => {
    button.onclick = (event) => {
      event.stopPropagation();
      handleTrayInteraction({ target: button });
    };
  });
}

async function renderLegacyDesk() {
  app.innerHTML = '<section class="content-panel"><div class="panel-title">设计板</div><p class="loading">正在载入草稿…</p></section>';
  const list = await fetch('/api/drafts').then((response) => response.json());
  drafts = list.drafts;
  renderCounts();
  app.innerHTML = `<section class="content-panel"><div class="panel-title">设计板</div><section class="desk-form"><label>设计名称<input id="draft-name" value="${esc(draft.name)}" placeholder="例如：冰川晨光"></label><label>主题<select id="draft-theme">${data.overview.themes.map((theme) => `<option ${theme === draft.theme ? 'selected' : ''}>${esc(theme)}</option>`).join('')}</select></label><label>目标手围<select id="draft-wrist">${[17, 18, 19].map((value) => `<option value="${value}" ${Number(draft.wristCm || 17) === value ? 'selected' : ''}>${value}cm</option>`).join('')}</select></label><label>参考珠径<select id="draft-bead-size">${[6, 8, 10, 12].map((value) => `<option value="${value}" ${Number(draft.beadMm || 8) === value ? 'selected' : ''}>${value}mm</option>`).join('')}</select></label><label>载入草稿<select id="draft-load"><option value="">选择已有草稿</option>${drafts.map((name) => `<option>${esc(name)}</option>`).join('')}</select></label><label class="full-field">设计备注<textarea id="draft-notes" placeholder="记录这套设计的组合理由或待确认事项。">${esc(draft.notes)}</textarea></label><div class="desk-actions"><button id="open-catalogue">继续选择材料</button><button id="save-draft">保存草稿</button><button id="export-draft">导出设计单</button></div><p id="desk-message" class="desk-message"></p><div id="tray-preview"></div><div id="placement-palette"></div><div id="draft-items"></div></section></section>`;
  const sync = () => { draft.name = app.querySelector('#draft-name').value; draft.theme = app.querySelector('#draft-theme').value; draft.wristCm = Number(app.querySelector('#draft-wrist').value); draft.beadMm = Number(app.querySelector('#draft-bead-size').value); draft.notes = app.querySelector('#draft-notes').value; refreshTray(); const container = app.querySelector('#draft-items'); container.innerHTML = draft.items.length ? draft.items.map((item, index) => `<div class="draft-row"><b>${esc(zh(item))}<small>${esc(itemName(item))}</small></b><label>数量<input type="number" min="1" max="99" data-quantity="${index}" value="${Math.max(1, Number(item.quantity) || 1)}"></label><label>角色<input data-role="${index}" value="${esc(item.role || '')}"></label><label>规格/形状<input data-form="${index}" value="${esc(item.form || '')}"></label><button data-up="${index}">上移</button><button data-down="${index}">下移</button><button data-remove="${index}">删除</button></div>`).join('') : '<p class="recent-empty">还没有材料。先到选品库多选材料，再回到这里排入托盘。</p>'; container.querySelectorAll('[data-quantity]').forEach((el) => el.oninput = () => { draft.items[Number(el.dataset.quantity)].quantity = Math.max(1, Number(el.value) || 1); sync(); }); container.querySelectorAll('[data-role]').forEach((el) => el.oninput = () => { draft.items[Number(el.dataset.role)].role = el.value; }); container.querySelectorAll('[data-form]').forEach((el) => el.oninput = () => { draft.items[Number(el.dataset.form)].form = el.value; }); container.querySelectorAll('[data-up]').forEach((el) => el.onclick = () => { const i = Number(el.dataset.up); if (i) [draft.items[i - 1], draft.items[i]] = [draft.items[i], draft.items[i - 1]]; sync(); }); container.querySelectorAll('[data-down]').forEach((el) => el.onclick = () => { const i = Number(el.dataset.down); if (i < draft.items.length - 1) [draft.items[i + 1], draft.items[i]] = [draft.items[i], draft.items[i + 1]]; sync(); }); container.querySelectorAll('[data-remove]').forEach((el) => el.onclick = () => { draft.items.splice(Number(el.dataset.remove), 1); if (draft.activeItemName === item.name) draft.activeItemName = ''; sync(); }); };
  const message = (value) => { app.querySelector('#desk-message').textContent = value; setStatus(value); };
  sync();
  app.querySelector('#open-catalogue').onclick = () => setView('catalog');
  app.querySelector('#draft-wrist').onchange = sync;
  app.querySelector('#draft-bead-size').onchange = sync;
  app.querySelector('#draft-load').onchange = (event) => event.target.value && loadDraft(event.target.value);
  app.querySelector('#save-draft').onclick = async () => { sync(); if (!draft.name.trim()) return message('请先填写设计名称。'); const response = await fetch(`/api/drafts/${encodeURIComponent(draft.name)}`, { method:'PUT', headers:{'content-type':'application/json'}, body:JSON.stringify(draft) }); message(response.ok ? '草稿已保存。' : '保存失败，请检查设计名称。'); if (response.ok) { drafts = await fetch('/api/drafts').then((r) => r.json()).then((x) => x.drafts); renderCounts(); } };
  app.querySelector('#export-draft').onclick = async () => { sync(); if (!draft.name.trim()) return message('请先保存并命名草稿。'); const response = await fetch(`/api/drafts/${encodeURIComponent(draft.name)}/export`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({format:'md'}) }); message(response.ok ? '设计单已导出到 workbench/exports。' : '导出失败，请先保存草稿。'); };
}

const beadPalette = {
  'Clear Quartz':'#e9f1f4','Smoky Quartz':'#8c7e72','Aquamarine':'#90cbd4','Labradorite':'#6e7474',
  'Rainbow Moonstone':'#eef0f5','Amazonite':'#66b7ae','Lapis Lazuli':'#405dad','Green Phantom Quartz':'#88b29a',
  'Obsidian':'#202326','Amethyst':'#8d67b8','Citrine':'#d9b85e',"Tiger's Eye":'#a87b42','Blue Lace Agate':'#9fc8d8',
  'Kunzite':'#d6a8cf','Bloodstone':'#52715f','White Phantom Quartz':'#dce4e3','Rose Quartz':'#dfaebd',
  'Rainbow Obsidian':'#3f4149','Larimar':'#80c7c9','Gold Rutilated Quartz':'#cab06c','Black Rutilated Quartz':'#77716b',
  'Rutilated Quartz':'#b9ad8c','Sugilite':'#74518f','Tahitian Pearl':'#536061','Akoya Pearl':'#efe9de',
};

function allStudioMaterials() {
  return ['minerals_crystals', 'pearls_organic', 'hardware_accessories'].flatMap((key) => displayItems(key));
}

function studioMaterial(name) {
  return allStudioMaterials().find((item) => itemName(item) === name) || draft.items.find((item) => item.name === name);
}

function materialBeadSize(item) {
  return Number(item?.chosenBeadMm) || Number(draft.beadMm) || 8;
}

function ensureBraceletHistory() {
  if (braceletHistory) return braceletHistory;
  const initial = createBraceletState({
    ...(draft.braceletState || {}),
    wristCm: draft.wristCm,
    fallbackBeadMm: draft.beadMm,
    layout: draft.braceletState ? undefined : draft.layout,
    items: draft.items,
    activeItemName: draft.activeItemName,
  });
  braceletHistory = createHistory(initial, 50);
  return braceletHistory;
}

function syncBraceletDraft() {
  const state = ensureBraceletHistory().present;
  draft.wristCm = state.wristCm;
  draft.beadMm = state.fallbackBeadMm;
  draft.activeItemName = state.activeMaterialName;
  draft.braceletState = serializeBraceletState(state);
  draft.layout = Array.from({ length: state.capacity }, () => null);
  state.instances.forEach((instance) => { draft.layout[instance.slotIndex] = instance.materialName; });
  draft.manualLayout = true;
}

function canvasMaterial(name) {
  const item = studioMaterial(name) || { name };
  const slug = assetSlug(item);
  const atlas = Object.values(generatedAssets?.atlases || {}).find((entry) => entry.file.includes('hero') && entry.order.includes(slug));
  return {
    zhName: zh(item),
    shortLabel: zh(item).slice(0, 1),
    fallbackColor: beadPalette[name] || '#d8d4cb',
    sizeMm: materialBeadSize(item),
    assetRef: slug ? `generated:${slug}` : '',
    provenanceClass: generatedRepresentation,
    atlas: atlas ? {
      url: `/${atlas.file.replace('workbench/', '')}`,
      columns: atlas.grid.columns,
      rows: Math.ceil(atlas.order.length / atlas.grid.columns),
      index: atlas.order.indexOf(slug),
    } : undefined,
  };
}

function placedCount(name) {
  return ensureBraceletHistory().present.instances.filter((instance) => instance.materialName === name).length;
}

function renderStudioLibrary() {
  const host = app.querySelector('#studio-material-list');
  if (!host) return;
  const query = (app.querySelector('#studio-search')?.value || '').trim().toLowerCase();
  const rows = displayItems(studioSection).filter((item) => !query || `${zh(item)} ${itemName(item)}`.toLowerCase().includes(query));
  host.innerHTML = rows.map((item) => {
    const selected = draft.items.find((entry) => entry.name === itemName(item));
    const active = ensureBraceletHistory().present.activeMaterialName === itemName(item);
    return `<article class="studio-material-card${active ? ' active' : ''}">
      <button type="button" class="studio-material-select" data-studio-material="${esc(itemName(item))}" aria-pressed="${active}">
        <span class="studio-thumb">${crystalImage(item) || '<span class="asset-missing">待接入</span>'}</span>
        <span class="studio-material-name">${bilingual(item)}<em>${active ? '已激活，点圆盘空位放入' : '选择材料'}</em></span>
      </button>
      <span class="studio-quantity"><button type="button" data-studio-subtract="${esc(itemName(item))}" aria-label="减少一颗">−</button><b>${selected?.quantity || 0}</b><button type="button" data-studio-add="${esc(itemName(item))}" aria-label="增加一颗">+</button></span>
    </article>`;
  }).join('') || '<p class="studio-empty">没有匹配材料。</p>';
  host.querySelectorAll('[data-studio-material]').forEach((button) => button.onclick = () => {
    braceletHistory.present = selectMaterial(braceletHistory.present, button.dataset.studioMaterial);
    syncBraceletDraft();
    setStatus(`已选择 ${zh(studioMaterial(button.dataset.studioMaterial))}；选择材料不会自动放珠，请在圆盘指定位置放入。`);
    refreshDesignStudio();
  });
  host.querySelectorAll('[data-studio-add]').forEach((button) => button.onclick = () => addToDesk(button.dataset.studioAdd));
  host.querySelectorAll('[data-studio-subtract]').forEach((button) => button.onclick = () => {
    const item = itemForName(button.dataset.studioSubtract);
    if (!item) return;
    const placed = placedCount(item.name);
    if (Number(item.quantity) <= placed) return setStatus(`已有 ${placed} 颗 ${zh(item)} 在圆盘中，请先移除珠子。`);
    item.quantity -= 1;
    if (item.quantity <= 0) draft.items = draft.items.filter((entry) => entry.name !== item.name);
    setStatus(`已将 ${zh(item)} 的备选数量减为 ${Math.max(0, item.quantity)}。`);
    refreshDesignStudio();
  });
}

function renderDesignLedger() {
  const host = app.querySelector('#design-ledger-items');
  if (!host) return;
  host.innerHTML = draft.items.map((item) => {
    const selected = Math.max(0, Number(item.quantity) || 0);
    const placed = placedCount(item.name);
    return `<article class="ledger-row"><span>${esc(zh(item))}<small>${esc(itemName(item))}</small></span><dl><div><dt>已选</dt><dd>${selected}</dd></div><div><dt>已排</dt><dd>${placed}</dd></div><div><dt>剩余</dt><dd>${Math.max(0, selected - placed)}</dd></div></dl></article>`;
  }).join('') || '<p class="studio-empty">从左侧为材料增加数量，再选择并放入圆盘。</p>';
}

function renderFitStatus() {
  const state = ensureBraceletHistory().present;
  const selected = draft.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const remaining = Math.max(0, selected - state.instances.length);
  const host = app.querySelector('#bracelet-fit-status');
  if (host) host.innerHTML = `<strong>${state.instances.length}/${state.capacity}</strong><span>圆盘珠位</span><small>已选 ${selected} · 已排 ${state.instances.length} · 剩余 ${remaining}</small><small>已用 ${Math.round(state.usedCircumferenceMm)}mm / 目标 ${Math.round(state.targetCircumferenceMm)}mm</small><small class="${state.remainingCircumferenceMm < 0 ? 'fit-warning' : ''}">${state.remainingCircumferenceMm >= 0 ? `尚余约 ${Math.round(state.remainingCircumferenceMm)}mm` : `超出约 ${Math.round(state.overflowMm)}mm`}</small>`;
  app.querySelector('#undo-layout').disabled = !braceletHistory.past.length;
  app.querySelector('#redo-layout').disabled = !braceletHistory.future.length;
}

function refreshDesignStudio() {
  if (view !== 'desk') return;
  syncBraceletDraft();
  renderStudioLibrary();
  renderDesignLedger();
  renderFitStatus();
  braceletCanvas?.render(braceletHistory.present);
}

function applyCanvasCommand(command) {
  const state = ensureBraceletHistory().present;
  if (command.type === 'select-instance') {
    braceletHistory.present = { ...state, selectedInstanceId: command.instanceId };
    syncBraceletDraft();
    return;
  }
  if (command.type === 'place') {
    const selected = itemForName(command.materialName);
    if (!selected) return setStatus('请先用 + 增加这类材料的备选数量。');
    if (placedCount(command.materialName) >= Number(selected.quantity)) return setStatus(`${zh(selected)} 已全部放入圆盘；请先增加数量或移除一颗。`);
  }
  const next = applyHistoryCommand(braceletHistory, command);
  if (next === braceletHistory) return setStatus('该珠位已占用；可拖动珠子交换位置，或点击其他空位。');
  braceletHistory = next;
  syncBraceletDraft();
  setStatus(command.type === 'remove' ? '已从圆盘移除一颗珠子，备选数量仍保留。' : '圆形设计已更新。');
  refreshDesignStudio();
}

async function renderDesk() {
  const list = await fetch('/api/drafts').then((response) => response.json());
  drafts = list.drafts;
  ensureBraceletHistory();
  syncBraceletDraft();
  renderCounts();
  app.innerHTML = `<section class="content-panel design-board-panel"><div class="panel-title">设计板 · 圆形手串实时工作区</div>
    <section class="design-meta-bar">
      <label>设计名称<input id="draft-name" value="${esc(draft.name)}" placeholder="例如：冰川晨光"></label>
      <label>主题<select id="draft-theme">${data.overview.themes.map((theme) => `<option ${theme === draft.theme ? 'selected' : ''}>${esc(theme)}</option>`).join('')}</select></label>
      <label>目标手围<select id="draft-wrist">${[15,16,17,18,19,20].map((value) => `<option value="${value}" ${Number(draft.wristCm) === value ? 'selected' : ''}>${value}cm</option>`).join('')}</select></label>
      <label>参考珠径<select id="draft-bead-size">${[6,8,10,12].map((value) => `<option value="${value}" ${Number(draft.beadMm) === value ? 'selected' : ''}>${value}mm</option>`).join('')}</select></label>
      <label>载入草稿<select id="draft-load"><option value="">选择已有草稿</option>${drafts.map((name) => `<option>${esc(name)}</option>`).join('')}</select></label>
    </section>
    <section class="design-studio-grid">
      <aside class="studio-material-library" aria-label="材料库">
        <header><h2>材料库</h2><p>先设数量，再选择材料；不会自动跳页或放珠。</p></header>
        <div class="studio-tabs">${[['minerals_crystals','水晶'],['pearls_organic','珍珠/天然'],['hardware_accessories','配饰']].map(([key,label]) => `<button type="button" data-studio-section="${key}" class="${studioSection === key ? 'selected' : ''}">${label}</button>`).join('')}</div>
        <input id="studio-search" type="search" placeholder="搜索中英文名称">
        <div id="studio-material-list" class="studio-material-list"></div>
      </aside>
      <main class="bracelet-workspace" aria-label="圆形串珠设计区">
        <div class="workspace-toolbar"><button type="button" id="undo-layout">撤销</button><button type="button" id="redo-layout">重做</button><button type="button" id="auto-layout">均匀初排</button><button type="button" id="clear-layout">清空排珠</button></div>
        <div class="bracelet-canvas-host"><canvas id="bracelet-canvas" width="560" height="560"></canvas><div id="bracelet-fit-status" class="bracelet-fit-status"></div></div>
        <p class="workspace-guide">点左侧材料只会选中；再点圆环位置放入。点在已有珠位旁可插入并自动腾位。圆珠可沿圆环自由拖动，落到已有珠位会换位，拖出圆环可移除。</p>
      </main>
      <aside class="design-ledger" aria-label="设计用量清单"><header><h2>设计用量</h2><p>随圆盘实时更新</p></header><div id="design-ledger-items"></div><label>设计备注<textarea id="draft-notes" placeholder="记录组合理由或待确认事项。">${esc(draft.notes)}</textarea></label><div class="ledger-actions"><button id="save-draft">保存草稿</button><button id="export-draft">导出设计单</button></div><p id="desk-message" class="desk-message"></p></aside>
    </section>
  </section>`;

  const message = (value) => { app.querySelector('#desk-message').textContent = value; setStatus(value); };
  renderStudioLibrary();
  renderDesignLedger();
  renderFitStatus();
  braceletCanvas?.dispose();
  braceletCanvas = createBraceletCanvas({ canvasElement: app.querySelector('#bracelet-canvas'), state: braceletHistory.present, resolveMaterial: canvasMaterial, onCommand: applyCanvasCommand });
  app.querySelectorAll('[data-studio-section]').forEach((button) => button.onclick = () => { studioSection = button.dataset.studioSection; app.querySelectorAll('[data-studio-section]').forEach((tab) => tab.classList.toggle('selected', tab === button)); renderStudioLibrary(); });
  app.querySelector('#studio-search').oninput = renderStudioLibrary;
  app.querySelector('#draft-name').oninput = (event) => { draft.name = event.target.value; };
  app.querySelector('#draft-theme').onchange = (event) => { draft.theme = event.target.value; };
  app.querySelector('#draft-notes').oninput = (event) => { draft.notes = event.target.value; };
  app.querySelector('#draft-wrist').onchange = (event) => {
    const next = applyHistoryCommand(braceletHistory, { type:'wrist', wristCm:Number(event.target.value) });
    if (next === braceletHistory) {
      event.target.value = String(braceletHistory.present.wristCm);
      return setStatus('当前已排珠数超过该手围的珠位容量，请先移除部分珠子。');
    }
    braceletHistory = next;
    refreshDesignStudio();
  };
  app.querySelector('#draft-bead-size').onchange = (event) => { const next = createBraceletState({ ...serializeBraceletState(braceletHistory.present), fallbackBeadMm:Number(event.target.value), instances:braceletHistory.present.instances }); braceletHistory = commitHistoryState(braceletHistory, next); refreshDesignStudio(); };
  app.querySelector('#draft-load').onchange = (event) => event.target.value && loadDraft(event.target.value);
  app.querySelector('#undo-layout').onclick = () => { braceletHistory = undoHistory(braceletHistory); refreshDesignStudio(); };
  app.querySelector('#redo-layout').onclick = () => { braceletHistory = redoHistory(braceletHistory); refreshDesignStudio(); };
  app.querySelector('#auto-layout').onclick = () => { const state = braceletHistory.present; const layout = createBalancedLayout({ capacity:state.capacity, items:draft.items }); const next = createBraceletState({ wristCm:state.wristCm, fallbackBeadMm:state.fallbackBeadMm, layout, items:draft.items, activeMaterialName:state.activeMaterialName }); braceletHistory = commitHistoryState(braceletHistory, next); setStatus('已生成交错初排；这是一次可撤销操作，你仍可逐颗拖动。'); refreshDesignStudio(); };
  app.querySelector('#clear-layout').onclick = () => { const state = braceletHistory.present; const next = createBraceletState({ wristCm:state.wristCm, fallbackBeadMm:state.fallbackBeadMm, activeMaterialName:state.activeMaterialName }); braceletHistory = commitHistoryState(braceletHistory, next); setStatus('圆盘已清空，左侧备选数量保留。'); refreshDesignStudio(); };
  app.querySelector('#save-draft').onclick = async () => { syncBraceletDraft(); if (!draft.name.trim()) return message('请先填写设计名称。'); const response = await fetch(`/api/drafts/${encodeURIComponent(draft.name)}`, { method:'PUT', headers:{'content-type':'application/json'}, body:JSON.stringify(draft) }); message(response.ok ? '草稿已保存。' : '保存失败，请检查设计名称。'); if (response.ok) drafts = (await fetch('/api/drafts').then((r) => r.json())).drafts; };
  app.querySelector('#export-draft').onclick = async () => { syncBraceletDraft(); if (!draft.name.trim()) return message('请先保存并命名草稿。'); const response = await fetch(`/api/drafts/${encodeURIComponent(draft.name)}/export`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({format:'md'}) }); message(response.ok ? '设计单已导出。' : '导出失败，请先保存草稿。'); };
}

async function loadDraft(name) {
  const response = await fetch(`/api/drafts/${encodeURIComponent(name)}`);
  if (!response.ok) { setStatus('无法读取草稿。'); return; }
  braceletCanvas?.dispose();
  braceletCanvas = undefined;
  braceletHistory = undefined;
  draft = { layout: [], activeItemName: '', manualLayout: true, ...(await response.json()) };
  setView('desk');
}

function render() {
  renderCounts();
  renderRail();
  if (view === 'home') return renderHome();
  if (view === 'inspiration') return renderInspiration();
  if (view === 'desk') return renderDesk();
  return renderCatalog();
}

function bindViewButtons(scope) {
  scope.querySelectorAll('[data-view]').forEach((button) => button.onclick = () => setView(button.dataset.view, button.dataset.section));
}

const mineralNav = document.querySelector('[data-section="minerals_crystals"]');
if (mineralNav && !document.querySelector('[data-section="pearls_organic"]')) mineralNav.insertAdjacentHTML('afterend', '<button data-view="catalog" data-section="pearls_organic"><span class="tree-icon">○</span>珍珠 / 天然材质</button>');


document.querySelectorAll('[data-tool]').forEach((button) => button.onclick = async () => {
  if (button.dataset.tool === 'new') { braceletCanvas?.dispose(); braceletCanvas = undefined; braceletHistory = undefined; draft = { name:'', theme:'Glacier', wristCm:17, beadMm:8, items:[], notes:'', layout:[], activeItemName:'', manualLayout:true }; setStatus('已新建设计板。'); return setView('desk'); }
  const response = await fetch('/api/export/assortment?format=csv');
  setStatus(response.ok ? '已导出当前选品 CSV。' : '导出失败。');
});
bindViewButtons(document);
updateClock();
setInterval(updateClock, 1000);
Promise.all([fetch('/api/data').then((response) => response.json()),fetch('/api/drafts').then((response)=>response.json()),fetch(`${generatedRoot}generated-asset-manifest-v1.json`).then((response)=>response.json()),fetch(`${generatedRoot}generated-asset-overrides-v1.json`).then((response)=>response.json())]).then(([body,saved,manifest,overrides])=>{data=body;drafts=saved.drafts;generatedAssets={...manifest,overrides};render();}).catch(()=>{app.textContent='无法加载工作台数据，请确认本地服务已启动。';});
