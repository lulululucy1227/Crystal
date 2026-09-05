import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { addToSelection, createTrayPlan } from '../workbench/design-tray.mjs';

async function openStudio(t, initialDraft) {
  const dom = new JSDOM('<main></main>');
  t.after(() => dom.window.close());
  const file = new URL('../workbench/studio-view.mjs', import.meta.url);
  // Only the browser canvas renderer and HTTP boundary are replaced; state and UI handlers stay real.
  const canvas = `data:text/javascript;base64,${Buffer.from('export function createBraceletCanvas(){return {render(){},dispose(){}}}').toString('base64')}`;
  const source = (await fs.readFile(file, 'utf8'))
    .replace("import('./bracelet-canvas.mjs')", `import(${JSON.stringify(canvas)})`)
    .replace(/from '\.\/([^']+)'/g, (_, name) => `from '${new URL(name, file).href}'`);
  const { renderStudio } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const previousFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = previousFetch; });
  globalThis.fetch = async url => ({ ok: true, json: async () => url === '/api/local-assets' ? { assets: [] } : url === '/api/drafts' ? { drafts: [] } : { available: false } });
  const host = dom.window.document.querySelector('main');
  let draft;
  const controller = renderStudio({ host, initialDraft, materials: [{ name: 'Quartz', zhName: '白水晶', category: 'crystal' }], resolveMaterial: () => ({}), onDraft: value => { draft = value; } });
  await controller.ready;
  t.after(() => controller.dispose());
  return { host, get draft() { return draft; } };
}

test('Catalog choices survive Studio entry without automatically placing beads', async t => {
  const studio = await openStudio(t, { items: [{ name: 'Quartz', quantity: 3 }], layout: [] });
  assert.equal(studio.draft.braceletState.instances.length, 0);
  assert.deepEqual(studio.draft.items, [{ name: 'Quartz', quantity: 3 }]);
  assert.match(studio.host.querySelector('[data-studio-status]').textContent, /目录备选.*1 种.*3 颗/);
});

test('adding and clearing placed instances does not overwrite Catalog quantities', async t => {
  const studio = await openStudio(t, { items: [{ name: 'Quartz', quantity: 3 }], layout: [] });
  studio.host.querySelector('[data-plus]').click();
  studio.host.querySelector('[data-plus]').click();
  assert.equal(studio.draft.braceletState.instances.length, 2);
  assert.deepEqual(studio.draft.items, [{ name: 'Quartz', quantity: 3 }]);
  studio.host.querySelector('[data-action="clear"]').click();
  assert.equal(studio.draft.braceletState.instances.length, 0);
  assert.equal(studio.draft.items[0].quantity, 3);
});

test('returning from Catalog preserves newly chosen quantities and existing bead identities', async t => {
  const first = await openStudio(t, { items: [{ name: 'Quartz', quantity: 3 }], layout: [] });
  first.host.querySelector('[data-plus]').click();
  const saved = structuredClone(first.draft), id = saved.braceletState.instances[0].instanceId;
  saved.items = addToSelection(saved.items, { name: 'Quartz' });
  const second = await openStudio(t, saved);
  assert.deepEqual(second.draft.items, [{ name: 'Quartz', quantity: 4 }]);
  assert.equal(second.draft.braceletState.instances.length, 1);
  assert.equal(second.draft.braceletState.instances[0].instanceId, id);
});

test('legacy per-instance selection rows become one material row so Catalog plus adds exactly one', async t => {
  const studio = await openStudio(t, { items: [{ name: 'Quartz', quantity: 1 }, { name: 'Quartz', quantity: 1 }], braceletState: { layoutMode: 'loose', instances: [] } });
  assert.deepEqual(studio.draft.items, [{ name: 'Quartz', quantity: 2 }]);
  const added = addToSelection(studio.draft.items, { name: 'Quartz' });
  assert.deepEqual(added, [{ name: 'Quartz', quantity: 3 }]);
});

test('Catalog labels selection quantities separately from the placed design', async () => {
  const source = await fs.readFile(new URL('../workbench/app.js', import.meta.url), 'utf8');
  const definition = source.slice(source.indexOf('function selectionSummary()'), source.indexOf('function renderCatalog()'));
  const html = vm.runInNewContext(`${definition}; selectionSummary()`, {
    draft: { items: [{ name: 'Quartz', quantity: 3 }], braceletState: { instances: [{}, {}] } },
    createTrayPlan, renderTray: () => '',
  });
  assert.match(html, /目录备选/);
  assert.match(html, /1 种材料.*3 颗/);
  assert.match(html, /已排.*2 颗/);
});

test('clearing Catalog selection leaves already placed beads and legacy positions intact', async () => {
  const source = await fs.readFile(new URL('../workbench/app.js', import.meta.url), 'utf8');
  const handler = source.match(/app\.querySelector\('#clear-selection'\)\.onclick = ([^\n]+);/)[1];
  const draft = { items: [{ name: 'Quartz', quantity: 3 }], layout: ['Quartz'], braceletState: { instances: [{ instanceId: 'placed-1' }] } };
  vm.runInNewContext(`(${handler})()`, { draft, setStatus() {}, renderCatalog() {} });
  assert.equal(draft.items.length, 0);
  assert.deepEqual(draft.layout, ['Quartz']);
  assert.equal(draft.braceletState.instances[0].instanceId, 'placed-1');
});
