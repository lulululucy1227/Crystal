let data;
let drafts = [];
let generatedAssets;
let view = 'catalog';
let section = 'minerals_crystals';
let draft = { name: '', theme: 'Glacier', items: [], notes: '' };

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
  view = next;
  if (nextSection) section = nextSection;
  document.querySelectorAll('[data-view]').forEach((button) => button.classList.toggle('selected', button.dataset.view === view && (!button.dataset.section || button.dataset.section === section)));
  render();
}

function addToDesk(name) {
  const source = data.assortment.items.find((item) => item.name === name) || Object.keys(labels).flatMap((key) => displayItems(key)).find((item) => item.name === name);
  if (!source || draft.items.some((item) => item.name === name)) { setStatus('该材料已在当前设计板中。'); return; }
  draft.items.push({ ...source, role: source.roles?.[0] || '', form: source.preferred_forms?.[0] || '' });
  setStatus(`已加入设计板：${zh(source)}`);
  setView('desk');
}

const generatedRoot = 'assets/catalog/generated/';
const generatedRepresentation = 'generated_from_evidence';
const gradeOverrideAtlas = 'crystals-grade-overrides-v1.svg';
const generatedSlug = {'Clear Quartz':'clear_quartz','Smoky Quartz':'smoky_quartz','Aquamarine':'aquamarine','Labradorite':'labradorite','Rainbow Moonstone':'rainbow_moonstone','Amazonite':'amazonite','Lapis Lazuli':'lapis_lazuli','Green Phantom Quartz':'green_phantom_quartz','Obsidian':'obsidian','Amethyst':'amethyst','Citrine':'citrine',"Tiger's Eye":'tigers_eye','Blue Lace Agate':'blue_lace_agate','Kunzite':'kunzite','Bloodstone':'bloodstone','White Phantom Quartz':'white_phantom_quartz','Rose Quartz':'rose_quartz','Rainbow Obsidian':'rainbow_obsidian','Larimar':'larimar','Gold Rutilated Quartz':'gold_rutilated_quartz','Black Rutilated Quartz':'black_rutilated_quartz','Rutilated Quartz':'mixed_rutilated_quartz','Sugilite':'sugilite','White freshwater pearl':'freshwater_white','Akoya Pearl':'akoya','Tahitian Pearl':'tahitian','White South Sea Pearl':'south_sea_white','Golden South Sea Pearl':'south_sea_golden','Dark wood / agarwood-like structural spacer':'dark_wood_agarwood_like','925 sterling silver micro spacer':'silver_micro_spacer','925 sterling silver curved tube':'curved_silver_tube','925 sterling silver thin frame / bezel':'thin_silver_frame_bezel','925 sterling silver half-cap / edge-cap':'silver_half_cap','925 sterling silver geometric connector':'geometric_connector','925 sterling silver small round counterweight':'silver_transition_sphere','925 sterling silver fine chain + minimal clasp':'fine_silver_chain_clasp','Oxidized / blackened sterling silver micro accent':'oxidized_silver_micro_accent','Compact matte white rigid presentation box':'matte_white_rigid_box','Cool grey rigid drawer box':'cool_grey_drawer_box','Soft grey or pearl-white protective pouch':'pearl_white_pouch','Material disclosure + care card':'care_card','Branded shipping mailer':'shipping_mailer','Cotton-linen envelope pouch':'cotton_linen_pouch','Book-style magnetic box':'book_style_magnetic_box','One-of-One certificate card':'one_of_one_certificate'};
function assetSlug(item){return item.generated_slug || generatedSlug[itemName(item)]||Object.entries(generatedAssets?.item_labels||{}).find(([,v])=>v.includes(itemName(item))||v.includes(zh(item)))?.[0]}
function atlasSprite(type,slug){const a=generatedAssets?.atlases?.[type],i=a?.order.indexOf(slug);if(!a||i<0)return '';const c=a.grid.columns,r=Math.ceil(a.order.length/c),x=i%c,y=Math.floor(i/c);return `style="--atlas:url('${esc(a.file.replace('workbench/',''))}');--atlas-size:${c*100}% ${r*100}%;--atlas-pos:${x/(c-1)*100}% ${r===1?0:y/(r-1)*100}%"`}
function crystalImage(item){const slug=assetSlug(item);const type=Object.entries(generatedAssets?.atlases||{}).find(([,a])=>a.order?.includes(slug)&&a.file.includes('hero'))?.[0];return type?`<span class="atlas-sprite atlas-hero" ${atlasSprite(type,slug)} role="img" aria-label="${esc(zh(item)+' 标准化视觉参考，非实拍')}"></span><span class="representation-note">生成参考图</span>`:''}

function assetSection(slug) {
  if (generatedAssets?.atlases?.crystals_hero.order.includes(slug)) return 'minerals_crystals';
  if (generatedAssets?.atlases?.pearls_organic_hero.order.includes(slug)) return 'pearls_organic';
  if (generatedAssets?.atlases?.hardware_hero.order.includes(slug)) return 'hardware_accessories';
  if (generatedAssets?.atlases?.packaging_hero.order.includes(slug)) return 'packaging';
}
function generatedDisplayItem(slug) {
  const [zhName, englishName] = generatedAssets.item_labels[slug];
  return { name: englishName, generated_slug: slug, generated_only: true, section: assetSection(slug), zh_name: zhName, selection_notes: '标准化视觉参考；非实拍。' };
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

function renderCatalog() {
  const rows = displayItems(section);
  app.innerHTML = `<section class="content-panel catalogue-panel"><div class="panel-title">${labels[section] || '选品目录'} <span id="catalogue-count">共 ${rows.length} 种${section === 'minerals_crystals' ? '水晶' : '选项'}</span></div><div class="catalogue-filters"><label>搜索 <input id="search" placeholder="名称"></label><label>形状 <input id="shape" placeholder="全部"></label><label>尺寸(mm) <input id="size" placeholder="规格"></label><label>颜色 <select id="color" disabled><option>暂无可信字段</option></select></label><button id="clear-filter">清除</button></div><div class="catalogue-grid" id="catalogue-grid"></div><section class="recent-panel"><div class="panel-title">最近打开的设计板</div>${recentDrafts()}</section></section>`;
  const draw = () => {
    const search = app.querySelector('#search').value.toLowerCase();
    const shape = app.querySelector('#shape').value.toLowerCase();
    const size = app.querySelector('#size').value.toLowerCase();
    const filtered = rows.filter((item) => {
      const forms = (item.preferred_forms || []).join(' ').toLowerCase();
      return (!search || JSON.stringify(item).toLowerCase().includes(search)) && (!shape || forms.includes(shape)) && (!size || forms.includes(size));
    });
    app.querySelector('#catalogue-count').textContent = `共 ${filtered.length} 种${section === 'minerals_crystals' ? '水晶' : '选项'}`;
    app.querySelector('#catalogue-grid').innerHTML = filtered.map((item) => `<article class="material-card"><h2>${bilingual(item)}</h2><div class="visual-stage">${crystalImage(item) || '<span class="asset-missing">图片由 GPT 素材任务接入</span>'}</div>${formSlots(item)}<dl class="material-facts"><div><dt>设计角色</dt><dd>${esc((item.roles || []).slice(0, 2).join(' / ') || '待补')}</dd></div><div><dt>推荐规格</dt><dd>${esc((item.preferred_forms || []).slice(0, 2).join(' · '))}</dd></div></dl><button class="details-button" data-add="${esc(item.name)}">加入设计板</button></article>`).join('') + `<button class="add-material-card" title="当前版本不支持直接新增 canonical 数据"><span>+</span>添加水晶<small>导入或新增目录项尚未接入</small></button>`;
    app.querySelectorAll('[data-add]').forEach((button) => button.onclick = () => addToDesk(button.dataset.add));
  };
  app.querySelectorAll('.catalogue-filters input').forEach((input) => input.oninput = draw);
  app.querySelector('#clear-filter').onclick = () => { app.querySelectorAll('.catalogue-filters input').forEach((input) => input.value = ''); draw(); };
  draw();
  bindViewButtons(app);
  app.querySelectorAll('[data-load]').forEach((button) => button.onclick = () => loadDraft(button.dataset.load));
}

function renderInspiration() {
  const references = data.references.slice(0, 8);
  app.innerHTML = `<section class="content-panel"><div class="panel-title">参考图库</div><div class="library-heading"><h1>灵感库</h1><p>查看已整理的设计参考与主题语言。</p></div><div class="reference-list">${references.map((ref) => `<article><div class="reference-mark">参考图<br>已整理</div><div><h2>${esc(ref.title || '设计参考')}</h2><p>${esc(ref.snippets?.[0]?.value || ref.notes || '已保存的视觉参考。')}</p><small>${esc((ref.themes || []).join(' · ')) || '未标注主题'}</small></div></article>`).join('') || '<p class="recent-empty">暂无可显示的设计参考。</p>'}</div></section>`;
}

async function renderDesk() {
  app.innerHTML = '<section class="content-panel"><div class="panel-title">设计板</div><p class="loading">正在载入草稿…</p></section>';
  const list = await fetch('/api/drafts').then((response) => response.json());
  drafts = list.drafts;
  renderCounts();
  app.innerHTML = `<section class="content-panel"><div class="panel-title">设计板</div><section class="desk-form"><label>设计名称<input id="draft-name" value="${esc(draft.name)}" placeholder="例如：冰川晨光"></label><label>主题<select id="draft-theme">${data.overview.themes.map((theme) => `<option ${theme === draft.theme ? 'selected' : ''}>${esc(theme)}</option>`).join('')}</select></label><label>载入草稿<select id="draft-load"><option value="">选择已有草稿</option>${drafts.map((name) => `<option>${esc(name)}</option>`).join('')}</select></label><label class="full-field">设计备注<textarea id="draft-notes" placeholder="记录这套设计的组合理由或待确认事项。">${esc(draft.notes)}</textarea></label><div class="desk-actions"><button id="open-catalogue">添加材料</button><button id="save-draft">保存草稿</button><button id="export-draft">导出设计单</button></div><p id="desk-message" class="desk-message"></p><div id="draft-items"></div></section></section>`;
  const sync = () => { draft.name = app.querySelector('#draft-name').value; draft.theme = app.querySelector('#draft-theme').value; draft.notes = app.querySelector('#draft-notes').value; const container = app.querySelector('#draft-items'); container.innerHTML = draft.items.length ? draft.items.map((item, index) => `<div class="draft-row"><b>${esc(zh(item))}<small>${esc(itemName(item))}</small></b><label>角色<input data-role="${index}" value="${esc(item.role || '')}"></label><label>规格/形状<input data-form="${index}" value="${esc(item.form || '')}"></label><button data-up="${index}">上移</button><button data-down="${index}">下移</button><button data-remove="${index}">删除</button></div>`).join('') : '<p class="recent-empty">还没有材料。去选品库添加，或点击“添加材料”。</p>'; container.querySelectorAll('[data-role]').forEach((el) => el.oninput = () => { draft.items[Number(el.dataset.role)].role = el.value; }); container.querySelectorAll('[data-form]').forEach((el) => el.oninput = () => { draft.items[Number(el.dataset.form)].form = el.value; }); container.querySelectorAll('[data-up]').forEach((el) => el.onclick = () => { const i = Number(el.dataset.up); if (i) [draft.items[i - 1], draft.items[i]] = [draft.items[i], draft.items[i - 1]]; sync(); }); container.querySelectorAll('[data-down]').forEach((el) => el.onclick = () => { const i = Number(el.dataset.down); if (i < draft.items.length - 1) [draft.items[i + 1], draft.items[i]] = [draft.items[i], draft.items[i + 1]]; sync(); }); container.querySelectorAll('[data-remove]').forEach((el) => el.onclick = () => { draft.items.splice(Number(el.dataset.remove), 1); sync(); }); };
  const message = (value) => { app.querySelector('#desk-message').textContent = value; setStatus(value); };
  sync();
  app.querySelector('#open-catalogue').onclick = () => setView('catalog');
  app.querySelector('#draft-load').onchange = (event) => event.target.value && loadDraft(event.target.value);
  app.querySelector('#save-draft').onclick = async () => { sync(); if (!draft.name.trim()) return message('请先填写设计名称。'); const response = await fetch(`/api/drafts/${encodeURIComponent(draft.name)}`, { method:'PUT', headers:{'content-type':'application/json'}, body:JSON.stringify(draft) }); message(response.ok ? '草稿已保存。' : '保存失败，请检查设计名称。'); if (response.ok) { drafts = await fetch('/api/drafts').then((r) => r.json()).then((x) => x.drafts); renderCounts(); } };
  app.querySelector('#export-draft').onclick = async () => { sync(); if (!draft.name.trim()) return message('请先保存并命名草稿。'); const response = await fetch(`/api/drafts/${encodeURIComponent(draft.name)}/export`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({format:'md'}) }); message(response.ok ? '设计单已导出到 workbench/exports。' : '导出失败，请先保存草稿。'); };
}

async function loadDraft(name) {
  const response = await fetch(`/api/drafts/${encodeURIComponent(name)}`);
  if (!response.ok) { setStatus('无法读取草稿。'); return; }
  draft = await response.json();
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
  if (button.dataset.tool === 'new') { draft = { name:'', theme:'Glacier', items:[], notes:'' }; setStatus('已新建设计板。'); return setView('desk'); }
  if (button.dataset.tool === 'save') return setView('desk');
  const response = await fetch('/api/export/assortment?format=csv');
  setStatus(response.ok ? '已导出当前选品 CSV。' : '导出失败。');
});
bindViewButtons(document);
updateClock();
setInterval(updateClock, 1000);
Promise.all([fetch('/api/data').then((response) => response.json()),fetch('/api/drafts').then((response)=>response.json()),fetch(`${generatedRoot}generated-asset-manifest-v1.json`).then((response)=>response.json()),fetch(`${generatedRoot}generated-asset-overrides-v1.json`).then((response)=>response.json())]).then(([body,saved,manifest,overrides])=>{data=body;drafts=saved.drafts;generatedAssets={...manifest,overrides};render();}).catch(()=>{app.textContent='无法加载工作台数据，请确认本地服务已启动。';});
