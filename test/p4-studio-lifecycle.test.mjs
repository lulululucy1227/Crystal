import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const response = body => ({ ok: true, json: async () => body });
async function studioModule(canvasSource = 'export function createBraceletCanvas(){return {render(){},dispose(){}}}') {
  const file = new URL('../workbench/studio-view.mjs', import.meta.url);
  const canvasUrl = `data:text/javascript;base64,${Buffer.from(`${canvasSource} // ${Math.random()}`).toString('base64')}`;
  const source = (await fs.readFile(file, 'utf8'))
    .replace("import('./bracelet-canvas.mjs')", `import(${JSON.stringify(canvasUrl)})`)
    .replace(/from '\.\/([^']+)'/g, (_, name) => `from '${new URL(name, file).href}'`);
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}

test('Studio returns a synchronous disposer before assets load and cannot update a departed page', async t => {
  const dom = new JSDOM('<main></main>');
  t.after(() => dom.window.close());
  const host = dom.window.document.querySelector('main');
  const assets = deferred(), changes = [];
  const oldFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = oldFetch; });
  globalThis.fetch = () => assets.promise;
  const { renderStudio } = await studioModule();
  const controller = renderStudio({ host, resolveMaterial: () => ({}), onDraft: value => changes.push(value) });
  assert.equal(typeof controller.dispose, 'function');
  controller.dispose();
  host.innerHTML = '<p>Another page</p>';
  assets.resolve(response({ assets: [] }));
  await controller.ready;
  assert.equal(host.textContent, 'Another page');
  assert.equal(changes.length, 0);
});

test('out-of-order draft responses cannot replace the most recently requested design', async t => {
  const dom = new JSDOM('<main></main>');
  t.after(() => dom.window.close());
  const host = dom.window.document.querySelector('main');
  const a = deferred(), b = deferred(), changes = [];
  const oldFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = oldFetch; });
  globalThis.fetch = async url => url === '/api/local-assets' ? response({ assets: [] })
    : url === '/api/drafts' ? response({ drafts: ['A', 'B'] })
      : url === '/api/nature-launch' ? response({ available: false }) : url.endsWith('/A') ? a.promise : b.promise;
  const { renderStudio } = await studioModule();
  const controller = renderStudio({ host, resolveMaterial: () => ({}), onDraft: value => changes.push(value) });
  await controller.ready;
  const select = host.querySelector('[data-load]');
  const first = select.onchange({ target: { value: 'A' } });
  const second = select.onchange({ target: { value: 'B' } });
  b.resolve(response({ name: 'B', wristCm: 17, braceletState: { layoutMode: 'loose', instances: [] } }));
  await second;
  a.resolve(response({ name: 'A', wristCm: 17, braceletState: { layoutMode: 'loose', instances: [] } }));
  await first;
  assert.equal(host.querySelector('[data-name]').value, 'B');
  assert.equal(changes.at(-1).name, 'B');
  controller.dispose();
});

test('a pending draft response after disposal cannot sync stale data back into the app', async t => {
  const dom = new JSDOM('<main></main>');
  t.after(() => dom.window.close());
  const host = dom.window.document.querySelector('main');
  const pending = deferred(), changes = [];
  const oldFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = oldFetch; });
  globalThis.fetch = async url => url === '/api/local-assets' ? response({ assets: [] })
    : url === '/api/drafts' ? response({ drafts: ['A'] })
      : url === '/api/nature-launch' ? response({ available: false }) : pending.promise;
  const { renderStudio } = await studioModule();
  const controller = renderStudio({ host, resolveMaterial: () => ({}), onDraft: value => changes.push(value) });
  await controller.ready;
  const load = host.querySelector('[data-load]').onchange({ target: { value: 'A' } });
  controller.dispose();
  const count = changes.length;
  host.innerHTML = '<p>Another page</p>';
  pending.resolve(response({ name: 'A', wristCm: 17, braceletState: { layoutMode: 'loose', instances: [] } }));
  await load;
  assert.equal(changes.length, count);
  assert.equal(host.textContent, 'Another page');
});

test('typing a size then pressing plus without blur adds that size immediately', async t => {
  const dom = new JSDOM('<main></main>');
  t.after(() => dom.window.close());
  const host = dom.window.document.querySelector('main'), changes = [];
  const oldFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = oldFetch; });
  globalThis.fetch = async url => response(url === '/api/local-assets' ? { assets: [] } : url === '/api/drafts' ? { drafts: [] } : { available: false });
  const { renderStudio } = await studioModule();
  const controller = renderStudio({ host, materials: [{ name: 'Quartz', zhName: '白水晶', category: 'crystal' }], resolveMaterial: () => ({}), onDraft: value => changes.push(value) });
  await controller.ready;
  const size = host.querySelector('[data-size]');
  size.value = '14';
  size.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  host.querySelector('[data-plus]').click();
  assert.equal(changes.at(-1).braceletState.instances[0].sizeMm, 14);
  assert.match(changes.at(-1).braceletState.instances[0].specId, /14mm$/);
  controller.dispose();
});

test('selecting a bead immediately renders its selection without changing bead identities or positions', async t => {
  const dom = new JSDOM('<main></main>');
  t.after(() => dom.window.close());
  const host = dom.window.document.querySelector('main'), changes = [];
  const oldFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = oldFetch; });
  globalThis.fetch = async url => response(url === '/api/local-assets' ? { assets: [] } : url === '/api/drafts' ? { drafts: [] } : { available: false });
  // Capture the real Studio command handler and render payload at the canvas boundary.
  const { renderStudio } = await studioModule(`export function createBraceletCanvas({canvasElement,onCommand}){
    canvasElement.sendCommand=onCommand;canvasElement.renderedStates=[];
    return {render(state){canvasElement.renderedStates.push(structuredClone(state));},dispose(){}};
  }`);
  const controller = renderStudio({ host, resolveMaterial: () => ({}), onDraft: value => changes.push(value), initialDraft: { braceletState: { layoutMode: 'loose', instances: [
    { instanceId: 'bead-1', materialName: 'Quartz', materialId: 'quartz', specId: 'quartz-round-8mm', sizeMm: 8, looseX: 0.35, looseY: 0.45 },
    { instanceId: 'bead-2', materialName: 'Pearl', materialId: 'pearl', specId: 'pearl-round-10mm', sizeMm: 10, looseX: 0.65, looseY: 0.55 },
  ] } } });
  t.after(() => controller.dispose());
  await controller.ready;
  const canvas = host.querySelector('[data-studio-canvas]');
  const before = structuredClone(canvas.renderedStates.at(-1).instances);
  for (const instanceId of ['bead-1', 'bead-2']) {
    const count = canvas.renderedStates.length;
    canvas.sendCommand({ type: 'select-instance', instanceId });
    assert.equal(canvas.renderedStates.length, count + 1, 'selection must render before any drag or refresh');
    assert.equal(canvas.renderedStates.at(-1).selectedInstanceId, instanceId);
    assert.deepEqual(canvas.renderedStates.at(-1).instances, before);
    assert.deepEqual(changes.at(-1).braceletState.instances, before);
    assert.match(host.querySelector('[data-selection]').textContent, /已选珠子/);
    assert.equal(host.querySelector('[data-action="undo"]').disabled, true, 'selection must not add a history step');
  }
});

test('Studio cards and canvas resolver use class priority with truthful source labels and safety gates', async t => {
  const dom = new JSDOM('<main></main>');
  t.after(() => dom.window.close());
  const host = dom.window.document.querySelector('main');
  const oldFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = oldFetch; });
  const { renderStudio } = await studioModule(`export function createBraceletCanvas({canvasElement,resolveMaterial}){
    return {render(state){canvasElement.assetResolution=resolveMaterial('Quartz',state.instances[0]);},dispose(){}};
  }`);
  const asset = (representation_class, extra = {}) => ({ material_id: 'quartz', spec_id: 'quartz-round-8mm', representation_class, status: 'ready', needs_mask: false, publication_status: 'local_only', file: `${representation_class}.png`, imageUrl: `/assets/local/${representation_class}.png`, ...extra });
  const classes = ['source_cutout', 'source_neutral_optimized', 'source_derived', 'generated_from_evidence'];
  const rejected = [{ needs_mask: true }, { status: 'pending' }, { rights_status: 'prohibited' }, { material_id: 'other' }, { spec_id: 'other' }];
  const scenarios = classes.flatMap((want, rank) => [classes.slice(rank), classes.slice(rank).reverse()].map(order => ({ assets: order.map(c => asset(c)), want })));
  scenarios.push(...rejected.map(extra => ({ assets: [asset('source_cutout', extra), asset('source_neutral_optimized')], want: 'source_neutral_optimized' })));
  scenarios.push({ assets: rejected.map(extra => asset('source_cutout', extra)), want: 'fallback' });
  for (const { assets, want } of scenarios) {
    const before = structuredClone(assets);
    globalThis.fetch = async url => response(url === '/api/local-assets' ? { assets } : url === '/api/drafts' ? { drafts: [] } : { available: false });
    const controller = renderStudio({ host, materials: [{ name: 'Quartz', zhName: '白水晶', category: 'crystal', materialId: 'quartz' }], initialDraft: { braceletState: { instances: [{ instanceId: 'bead-1', materialName: 'Quartz', materialId: 'quartz', specId: 'quartz-round-8mm', sizeMm: 8 }] } }, resolveMaterial: () => ({ imageUrl: '/fallback.svg', provenanceClass: 'fallback' }) });
    try {
      await controller.ready;
      const url = want === 'fallback' ? '/fallback.svg' : `/assets/local/${want}.png`;
      assert.equal(host.querySelector('[data-studio-material-grid] img').getAttribute('src'), url, want);
      const resolved = host.querySelector('[data-studio-canvas]').assetResolution;
      assert.equal(resolved.imageUrl, url, 'canvas receives the same selected image as its card');
      assert.equal(resolved.provenanceClass, want);
      if (want.startsWith('source_')) assert.match(host.querySelector('[data-studio-material-grid]').textContent, /本地源图/);
      assert.deepEqual(assets, before);
    } finally { controller.dispose(); }
  }
});
