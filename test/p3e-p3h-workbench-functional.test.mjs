import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stateDir = path.join(root, 'workbench', 'state');
const exportDir = path.join(root, 'workbench', 'exports');
let proc;

async function start() {
  proc = spawn(process.execPath, ['workbench/server.mjs'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => { proc.stdout.once('data', resolve); proc.once('error', reject); });
}
async function req(url, options) { const r = await fetch(`http://127.0.0.1:4173${url}`, options); return { status: r.status, body: await r.json() }; }
test.before(async () => { fs.mkdirSync(stateDir, { recursive: true }); fs.mkdirSync(exportDir, { recursive: true }); await start(); });
test.after(() => { proc?.kill(); for (const file of ['acceptance-smoke.json', 'malformed.json']) { try { fs.unlinkSync(path.join(stateDir, file)); } catch {} } for (const file of ['acceptance-smoke.md', 'assortment-selection-v1.csv', 'assortment-selection-v1.json']) { try { fs.unlinkSync(path.join(exportDir, file)); } catch {} } });

test('data endpoint exposes overview, filtered assortment and enriched libraries', async () => {
  const { body } = await req('/api/data');
  assert.equal(body.overview.themes.length, 6);
  assert.ok(body.overview.assortmentByPriority.A_CORE > 0);
  assert.ok(body.assortment.items.some(x => x.identity_status === 'candidate_only'));
  assert.ok(body.libraries.materials[0].variants);
  assert.ok(body.libraries.accessories.some(x => x.origin === 'assortment_candidate'));
  assert.ok(body.libraries.packaging.some(x => x.origin === 'assortment_candidate'));
  assert.ok(body.references[0].asset_count >= 0);
});

test('draft sidecar supports save, load, list and exports', async () => {
  const draft = { name: 'acceptance-smoke', theme: 'Ocean', items: [{ name: 'Aquamarine', section: 'minerals_crystals', role: 'hero', form: '10mm' }], notes: 'smoke' };
  let r = await req('/api/drafts/acceptance-smoke', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(draft) });
  assert.equal(r.status, 200);
  r = await req('/api/drafts/acceptance-smoke'); assert.deepEqual(r.body, draft);
  r = await req('/api/drafts'); assert.ok(r.body.drafts.includes('acceptance-smoke'));
  r = await req('/api/drafts/acceptance-smoke/export', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ format: 'md' }) });
  assert.equal(r.status, 200); assert.match(r.body.path, /acceptance-smoke\.md$/); assert.match(fs.readFileSync(r.body.path, 'utf8'), /Aquamarine/);
});

test('malformed sidecar returns actionable error and remains untouched', async () => {
  const p = path.join(stateDir, 'malformed.json'); fs.writeFileSync(p, '{broken');
  const before = fs.readFileSync(p, 'utf8'); const r = await req('/api/drafts/malformed');
  assert.equal(r.status, 422); assert.equal(r.body.error.code, 'MALFORMED_DRAFT'); assert.match(r.body.error.message, /malformed/i); assert.equal(fs.readFileSync(p, 'utf8'), before);
});

test('assortment and draft exports are available', async () => {
  let r = await req('/api/export/assortment?format=csv'); assert.equal(r.status, 200); assert.match(r.body.path, /assortment-selection-v1\.csv$/);
  r = await req('/api/export/assortment?format=json'); assert.equal(r.status, 200); assert.match(r.body.path, /assortment-selection-v1\.json$/);
});
