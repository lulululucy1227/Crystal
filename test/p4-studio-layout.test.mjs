import test from 'node:test';
import assert from 'node:assert/strict';
import * as stateApi from '../workbench/bracelet-state.mjs';
import fs from 'node:fs/promises';

// Fabric's browser-only absolute import needs a narrow drawing boundary double in Node.
async function canvasHarness(state, resolver = () => ({})) {
  const source = await fs.readFile(new URL('../workbench/bracelet-canvas.mjs', import.meta.url), 'utf8');
  const fabric = `
    export const canvases = [], urls = [];
    export let imageLoader;
    export function setImageLoader(fn) { imageLoader = fn; }
    export class Circle { constructor(props={}) { Object.assign(this, props); } set(props) { Object.assign(this, props); return this; } setCoords() {} dispose() {} }
    export class Rect extends Circle {}
    export class FabricText extends Circle { constructor(text,props) { super(props); } }
    export class Group extends Circle { constructor(children,props) { super(props); this.children=children; } }
    export class FabricImage extends Circle { static async fromURL(url) { urls.push(url); if (imageLoader) await imageLoader(url); return new FabricImage({width:200,height:200}); } }
    export class Canvas { constructor() { this.objects=[]; this.handlers={}; this.width=520; this.height=520; this.clears=0; canvases.push(this); }
      getWidth(){return this.width;} getHeight(){return this.height;} setDimensions(p){Object.assign(this,p);}
      add(obj){this.objects.push(obj);} clear(){this.objects=[];this.clears++;} discardActiveObject(){this.active=null;}
      setActiveObject(o){this.active=o;} requestRenderAll(){} on(name,fn){this.handlers[name]=fn;}
      getScenePoint(e){return e;} dispose(){this.disposed=true;}
    }
  `;
  const url = `data:text/javascript;base64,${Buffer.from(fabric + `\n// ${Math.random()}`).toString('base64')}`;
  const module = await import(`data:text/javascript;base64,${Buffer.from(source.replace("'/vendor/fabric/index.min.mjs'", JSON.stringify(url))).toString('base64')}`);
  const boundary = await import(url);
  const commands = [];
  const element = { parentElement: { clientWidth: 520, clientHeight: 520 }, dataset: {} };
  const api = module.createBraceletCanvas({ canvasElement: element, state, resolveMaterial: resolver, onCommand: command => commands.push(command) });
  await api.render(state);
  return { api, canvas: boundary.canvases[0], urls: boundary.urls, commands, element, boundary };
}

const bead = (instanceId, sizeMm = 8) => ({ instanceId, materialName: 'Quartz', materialId: 'quartz', specId: `quartz-${sizeMm}`, displayNameZh: '白水晶', displayNameEn: 'Quartz', form: 'round', sizeMm, sourceStatus: 'PROPOSED', assetRef: 'asset:q', provenanceClass: 'source_cutout', imageUrl: '/assets/local/quartz.png' });
const loose = () => stateApi.createBraceletState({ layoutMode: 'loose', instances: [bead('a', 6), bead('b', 8), bead('c', 12)] });

test('selection uses a non-intercepting round outline that follows drag without rebuilding beads', async () => {
  const state = { ...loose(), selectedInstanceId: 'a' };
  const h = await canvasHarness(state);
  const objects = h.canvas.objects.filter(x => x.data?.instanceId);
  assert.ok(objects.every(x => x.hasBorders === false && x.hasControls === false));
  const outline = h.canvas.objects.find(x => x.selectionIndicator);
  assert.equal(outline.selectable, false);
  assert.equal(outline.evented, false);
  assert.equal(outline.fill, 'transparent');
  assert.equal(outline.radius, objects[0].data.diameter / 2 + 4);
  assert.equal(outline.left, objects[0].left);
  const clears = h.canvas.clears;
  await h.api.render({ ...state, selectedInstanceId: 'b' });
  assert.equal(h.canvas.clears, clears);
  assert.equal(outline.radius, objects[1].data.diameter / 2 + 4);
  objects[1].set({ left: 280, top: 300 });
  h.canvas.handlers['object:moving']({ target: objects[1] });
  assert.equal(outline.left, 280);
  assert.equal(outline.top, 300);
  assert.equal(h.canvas.active, objects[1]);
  await h.api.render({ ...state, selectedInstanceId: null });
  assert.equal(outline.visible, false);
  assert.equal(h.commands.length, 0);
  h.api.dispose();
});

test('P4 places independent free instances beyond legacy capacity preserving material identity', () => {
  let state = stateApi.createBraceletState({ layoutMode: 'loose', wristCm: 1 });
  for (let i = 0; i < 8; i++) state = stateApi.placeInstance(state, { ...bead(`q-${i}`), looseX: 0.3, looseY: 0.6 });
  assert.equal(state.instances.length, 8);
  assert.deepEqual(Object.fromEntries(Object.keys(bead('q-0')).map(key => [key, state.instances[0][key]])), bead('q-0'));
  assert.equal(state.instances[0].looseX, 0.3);
  assert.equal(state.instances[0].looseY, 0.6);
  assert.equal(stateApi.setWristSize(state, 0.5).wristCm, 0.5);
});

test('loose drag changes only one instance and clamps normalized coordinates to the disk', () => {
  const before = loose();
  const after = stateApi.moveInstance(before, { instanceId: 'b', looseX: 0.7, looseY: 0.3 });
  assert.equal(after.instances[1].looseX, 0.7);
  assert.equal(after.instances[1].looseY, 0.3);
  assert.deepEqual(after.instances[0], before.instances[0]);
  assert.deepEqual(after.instances[2], before.instances[2]);
  const edge = stateApi.moveInstance(after, { instanceId: 'b', looseX: 8, looseY: 9 }).instances[1];
  assert.ok(Math.hypot(edge.looseX - 0.5, edge.looseY - 0.5) <= 0.5 + 1e-10);
});

test('compaction preserves order and uses cumulative half-size spacing including closing gap', () => {
  assert.equal(typeof stateApi.compactToBracelet, 'function');
  const initial = loose();
  const ring = stateApi.compactToBracelet(initial);
  assert.equal(ring.layoutMode, 'bracelet');
  assert.deepEqual(ring.instances.map(x => x.instanceId), ['a', 'b', 'c']);
  const angles = ring.instances.map(x => x.angle);
  const gaps = [angles[1] - angles[0], angles[2] - angles[1], angles[0] + 360 - angles[2]];
  for (const [i, size] of [7, 10, 9].entries()) assert.ok(Math.abs(gaps[i] - size / 26 * 360) < 1e-9);
  assert.deepEqual(stateApi.setLayoutMode(ring, 'loose').instances.map(x => [x.instanceId, x.looseX, x.looseY]), initial.instances.map(x => [x.instanceId, x.looseX, x.looseY]));
});

test('bracelet drag reorders the serialized sequence and mode is undoable', () => {
  let history = stateApi.createHistory(loose());
  history = stateApi.applyHistoryCommand(history, { type: 'layout-mode', layoutMode: 'bracelet' });
  assert.equal(history.present.layoutMode, 'bracelet');
  history = stateApi.applyHistoryCommand(history, { type: 'move', instanceId: 'a', targetIndex: 2 });
  assert.deepEqual(history.present.instances.map(x => x.instanceId), ['b', 'c', 'a']);
  const saved = stateApi.serializeBraceletState(history.present);
  assert.deepEqual(stateApi.serializeBraceletState(stateApi.createBraceletState(saved)), saved);
  history = stateApi.undoHistory(stateApi.undoHistory(history));
  assert.equal(history.present.layoutMode, 'loose');
  assert.equal(stateApi.redoHistory(history).present.layoutMode, 'bracelet');
});

test('legacy names gain stable proposed identities and unknown status is never approved', () => {
  const legacy = stateApi.createBraceletState({ layout: ['Clear Quartz', 'Clear Quartz'] });
  assert.equal(legacy.instances[0].materialId, 'legacy-clear-quartz');
  assert.equal(legacy.instances[0].sourceStatus, 'PROPOSED');
  assert.equal(legacy.instances[0].specId, legacy.instances[1].specId);
  const unknown = stateApi.createBraceletState({ instances: [{ ...bead('a'), sourceStatus: 'APPROVE' }] });
  assert.equal(unknown.instances[0].sourceStatus, 'UNRESOLVED');
});

test('replacement retains instance coordinates but replaces complete material identity', () => {
  const before = loose();
  const replacement = { ...bead('b', 10), materialId: 'pearl', specId: 'pearl-10', materialName: 'Pearl', sourceStatus: 'APPROVED' };
  const after = stateApi.replaceInstance(before, replacement);
  for (const key of Object.keys(replacement)) assert.equal(after.instances[1][key], replacement[key]);
  assert.equal(after.instances[1].looseX, before.instances[1].looseX);
});

test('reorder and save maintain current positions without rewriting the original authored design', () => {
  const design = { design_id: 'authored', beads: [1, 2, 3].map(position => ({ position, instance_id: `source-${position}`, material_id: 'q', spec_id: 'q8', display_name_zh: '白水晶', display_name_en: 'Quartz', source_status: 'APPROVED', size_mm: 8, asset_ref: 'source:q', provenance_class: 'source_cutout' })) };
  const original = structuredClone(design);
  const initial = stateApi.createBraceletState({ layoutMode: 'bracelet', design, instances: design.beads });
  const moved = stateApi.moveInstance(initial, { instanceId: 'source-1', targetIndex: 2 });
  assert.deepEqual(moved.instances.map(i => i.position), [1, 2, 3]);
  assert.deepEqual(moved.instances.map(i => i.sourcePosition), [2, 3, 1]);
  assert.deepEqual(moved.instances.map(i => i.instanceId), ['source-2', 'source-3', 'source-1']);
  const reloaded = stateApi.createBraceletState(stateApi.serializeBraceletState(moved));
  assert.deepEqual(reloaded.instances, moved.instances);
  assert.deepEqual(reloaded.design, original);
  assert.deepEqual(design, original);
  assert.notEqual(initial.design, design);
  for (const instance of reloaded.instances) {
    assert.equal(instance.materialId, 'q');
    assert.equal(instance.sourceStatus, 'APPROVED');
    assert.equal(instance.assetRef, 'source:q');
    for (const alias of ['instance_id', 'material_id', 'spec_id', 'display_name_zh', 'display_name_en', 'source_status', 'size_mm', 'asset_ref', 'provenance_class']) assert.equal(Object.hasOwn(instance, alias), false, alias);
  }
});

test('replacement discards old unit price and all old identity aliases but preserves source position', () => {
  const initial = stateApi.createBraceletState({ layoutMode: 'bracelet', instances: [{ ...bead('a'), position: 1, material_id: 'stale-q', spec_id: 'stale-8', source_status: 'APPROVED', unit_cost: { amount: 7, currency: 'EUR', source: 'old supplier' } }] });
  assert.deepEqual(initial.instances[0].unitCost, { amount: 7, currency: 'EUR', source: 'old supplier' });
  assert.equal(Object.hasOwn(initial.instances[0], 'unit_cost'), false);
  const next = stateApi.replaceInstance(initial, { instanceId: 'a', materialName: 'Pearl', materialId: 'pearl', specId: 'pearl10', sourceStatus: 'PROPOSED', sizeMm: 10 });
  assert.equal(next.instances[0].sourcePosition, 1);
  assert.equal(next.instances[0].position, 1);
  assert.equal(next.instances[0].unitCost, undefined);
  assert.equal(next.instances[0].material_id, undefined);
  assert.equal(next.instances[0].imageUrl, undefined);
  assert.equal(next.instances[0].sourceStatus, 'PROPOSED');
});

test('replacing with a material without an asset does not retain the previous photograph', () => {
  const state = stateApi.replaceInstance(loose(), { instanceId: 'a', materialName: 'Pearl', sizeMm: 10 });
  assert.equal(state.instances[0].imageUrl, undefined);
  assert.equal(state.instances[0].materialId, 'legacy-pearl');
  assert.equal(state.instances[0].sourceStatus, 'PROPOSED');
});

test('canvas preserves mixed-size ratios and instance-local image metadata', async () => {
  const calls = [];
  const h = await canvasHarness(loose(), (name, instance) => { calls.push(instance?.instanceId); return { imageUrl: '/wrong.png', atlas: { url: '/atlas.png', columns: 4 } }; });
  assert.ok(calls.includes('a'));
  assert.ok(h.urls.every(url => url === '/assets/local/quartz.png'));
  const objects = h.canvas.objects.filter(x => x.data?.instanceId);
  assert.equal(objects.length, 3);
  assert.equal(objects[2].width * objects[2].scaleX / (objects[0].width * objects[0].scaleX), 2);
  assert.equal(objects[0].cropX, 0);
  h.api.dispose();
});

test('selection-only canvas renders preserve drag object and loose release emits coordinates', async () => {
  const state = loose();
  const h = await canvasHarness(state);
  const object = h.canvas.objects.find(x => x.data?.instanceId === 'a');
  const clears = h.canvas.clears;
  h.canvas.handlers['mouse:down']({ target: object });
  await h.api.render({ ...state, selectedInstanceId: 'a' });
  assert.equal(h.canvas.clears, clears);
  object.left = 280;
  object.top = 300;
  h.canvas.handlers['object:moving']({ target: object });
  assert.equal(object.left, 280);
  assert.equal(object.top, 300);
  h.canvas.handlers['object:modified']({ target: object });
  const move = h.commands.at(-1);
  assert.equal(move.type, 'move');
  assert.ok(move.looseX > 0.5 && move.looseX < 0.7);
  assert.ok(move.looseY > 0.5 && move.looseY < 0.8);
  h.api.dispose();
});

test('canvas bracelet release emits nearest sequence index, and empty area can place freely', async () => {
  const ring = stateApi.compactToBracelet(loose());
  const h = await canvasHarness(ring);
  const source = h.canvas.objects.find(x => x.data?.instanceId === 'a');
  const target = h.canvas.objects.find(x => x.data?.instanceId === 'c');
  source.left = target.left;
  source.top = target.top;
  h.canvas.handlers['object:modified']({ target: source });
  assert.equal(h.commands.at(-1).targetIndex, 2);
  await h.api.render({ ...loose(), activeMaterialName: 'Quartz' });
  h.canvas.handlers['mouse:down']({ e: { x: 280, y: 290 } });
  assert.equal(h.commands.at(-1).type, 'place');
  assert.ok(h.commands.at(-1).looseX > 0.5);
  h.api.dispose();
});

test('late canvas image work cannot resurrect a removed instance or repaint a disposed canvas', async () => {
  const state = loose();
  const h = await canvasHarness(state);
  const releases = [];
  h.boundary.setImageLoader(() => new Promise(resolve => releases.push(resolve)));
  const loading = h.api.render({ ...state, instances: [...state.instances, bead('d')] });
  h.boundary.setImageLoader(null);
  await h.api.render({ ...state, instances: [state.instances[0]] });
  releases.forEach(resolve => resolve());
  await loading;
  assert.deepEqual(h.canvas.objects.filter(x => x.data).map(x => x.data.instanceId), ['a']);
  h.boundary.setImageLoader(() => new Promise(resolve => releases.push(resolve)));
  const disposedLoading = h.api.render(state);
  h.api.dispose();
  const clears = h.canvas.clears;
  releases.forEach(resolve => resolve());
  await disposedLoading;
  assert.equal(h.canvas.clears, clears);
});

test('returning to the rendered state cancels an outstanding different canvas render', async () => {
  const state = loose();
  const h = await canvasHarness(state);
  const releases = [];
  h.boundary.setImageLoader(() => new Promise(resolve => releases.push(resolve)));
  const pending = h.api.render({ ...state, instances: [...state.instances, bead('d')] });
  await h.api.render(state);
  releases.forEach(resolve => resolve());
  await pending;
  assert.deepEqual(h.canvas.objects.filter(x => x.data).map(x => x.data.instanceId), ['a', 'b', 'c']);
  h.api.dispose();
});

test('dropping at the same bracelet order still snaps the visual object back to its center', async () => {
  const state = stateApi.compactToBracelet(loose());
  const h = await canvasHarness(state);
  const object = h.canvas.objects.find(x => x.data?.instanceId === 'a');
  const original = { x: object.left, y: object.top };
  object.left += 3;
  object.top += 3;
  h.canvas.handlers['object:modified']({ target: object });
  await new Promise(resolve => setImmediate(resolve));
  const snapped = h.canvas.objects.find(x => x.data?.instanceId === 'a');
  assert.equal(snapped.left, original.x);
  assert.equal(snapped.top, original.y);
  h.api.dispose();
});

test('six mixed-size beads compact to an adjacent small bracelet rather than a mostly empty large ring', async () => {
  const state = stateApi.createBraceletState({ layoutMode: 'bracelet', instances: [6, 6, 10, 10, 14, 14].map((size, i) => bead(`b-${i}`, size)) });
  const h = await canvasHarness(state);
  const objects = h.canvas.objects.filter(x => x.data?.instanceId);
  const maxSize = Math.max(...objects.map(x => x.data.diameter));
  assert.ok(Math.hypot(objects[0].left - 260, objects[0].top - 260) < 110);
  for (let i = 0; i < objects.length; i++) {
    const a = objects[i], b = objects[(i + 1) % objects.length];
    const separation = Math.hypot(a.left - b.left, a.top - b.top);
    const touching = (a.data.diameter + b.data.diameter) / 2;
    assert.ok(separation >= touching - 0.001, `neighbor ${i} must not overlap`);
    assert.ok(separation - touching < maxSize * 0.08, `neighbor ${i} gap must remain small`);
    assert.ok(Math.hypot(a.left - 260, a.top - 260) + a.data.diameter / 2 < 228.8);
  }
  assert.ok(Math.abs(objects[4].data.diameter / objects[0].data.diameter - 14 / 6) < 1e-9);
  h.api.dispose();
});

test('unmatched irregular and connector assets use labeled technical shapes rather than round atlas photos', async () => {
  const instances = ['irregular', 'connector'].map((form, i) => ({ ...bead(`shape-${i}`, 12), form, imageUrl: undefined }));
  const h = await canvasHarness(stateApi.createBraceletState({ layoutMode: 'loose', instances }), () => ({ atlas: { url: '/round-atlas.png' } }));
  assert.equal(h.urls.length, 0);
  const objects = h.canvas.objects.filter(x => x.data?.instanceId);
  assert.equal(objects[0].children[0].angle, 45);
  assert.ok(objects[1].children[0].height < objects[1].children[0].width);
  assert.equal(objects[0].representationClass, 'fallback');
  h.api.dispose();
});

test('P4 physical tray stays large and solid when a small bracelet is compacted', async () => {
  const state = loose();
  const h = await canvasHarness(state);
  const looseTray = h.canvas.objects[0];
  assert.equal(looseTray.radius, 228.8);
  assert.match(looseTray.fill, /^#[a-f0-9]{6}$/i);
  assert.ok(looseTray.shadow.blur > 0);
  assert.ok(looseTray.shadow.offsetY > 0);
  await h.api.render(stateApi.compactToBracelet(state));
  const braceletTray = h.canvas.objects[0];
  assert.equal(braceletTray.radius, looseTray.radius);
  assert.equal(braceletTray.fill, looseTray.fill);
  assert.equal(braceletTray.strokeDashArray, undefined);
  const innerRim = h.canvas.objects[1];
  assert.ok(innerRim.radius > 215 && innerRim.radius < braceletTray.radius);
  assert.equal(innerRim.selectable, false);
  h.api.dispose();
});

test('rendered image provenance follows its actual source instead of a stale instance fallback marker', async () => {
  const state = stateApi.createBraceletState({ layoutMode: 'loose', instances: ['generated', 'local', 'missing'].map(instanceId => ({ ...bead(instanceId), imageUrl: undefined, provenanceClass: 'fallback' })) });
  const h = await canvasHarness(state, (name, instance) => instance.instanceId === 'generated'
    ? { atlas: { url: '/generated-atlas.png' }, provenanceClass: 'generated_from_evidence' }
    : instance.instanceId === 'local' ? { imageUrl: '/assets/local/exact.png', provenanceClass: 'source_cutout' } : {});
  const classes = h.canvas.objects.filter(x => x.data?.instanceId).map(x => x.representationClass);
  assert.deepEqual(classes, ['generated_from_evidence', 'source_cutout', 'fallback']);
  assert.deepEqual(JSON.parse(h.element.dataset.instanceGeometry).map(x => x.representationClass), classes);
  h.api.dispose();
});
