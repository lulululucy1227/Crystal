import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const response = body => ({ ok: true, json: async () => body });
async function studioModule() {
  const file = new URL('../workbench/studio-view.mjs', import.meta.url);
  const canvasUrl = `data:text/javascript;base64,${Buffer.from(`export function createBraceletCanvas(){return {render(){},dispose(){}}} // ${Math.random()}`).toString('base64')}`;
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
