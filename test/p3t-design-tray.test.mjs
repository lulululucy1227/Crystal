import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { addToSelection, createBalancedLayout, createTrayPlan, placeMaterialAtSlot } from '../workbench/design-tray.mjs';
import fs from 'node:fs';
import path from 'node:path';

const get = (port, pathname) => new Promise((resolve, reject) => {
  http.get({ hostname: '127.0.0.1', port, path: pathname }, (res) => {
    res.resume();
    res.on('end', () => resolve(res));
  }).on('error', reject);
});

test('adding the same material preserves the catalogue flow and increases its selected bead count', () => {
  const first = addToSelection([], { name: 'Aquamarine', zh_name: '海蓝宝' });
  const second = addToSelection(first, { name: 'Aquamarine', zh_name: '海蓝宝' });
  assert.equal(second.length, 1);
  assert.equal(second[0].quantity, 2);
});

test('17cm and 18cm trays expose an honest bead capacity without auto-filling a bracelet', () => {
  const selection = [{ name: 'Aquamarine', quantity: 3 }, { name: 'Clear Quartz', quantity: 2 }];
  const seventeen = createTrayPlan({ wristCm: 17, beadMm: 8, items: selection });
  const eighteen = createTrayPlan({ wristCm: 18, beadMm: 8, items: selection });
  assert.deepEqual({ targetMm: seventeen.targetMm, capacity: seventeen.capacity, planned: seventeen.planned, remaining: seventeen.remaining }, { targetMm: 175, capacity: 22, planned: 5, remaining: 17 });
  assert.equal(eighteen.targetMm, 185);
  assert.equal(eighteen.capacity, 23);
  assert.equal(eighteen.remaining, 18);
});

test('balanced starting layout separates duplicate focal materials instead of clustering them', () => {
  const layout = createBalancedLayout({ capacity: 22, items: [
    { name: 'Tahitian Pearl', quantity: 2 },
    { name: 'Aquamarine', quantity: 4 },
    { name: 'Smoky Quartz', quantity: 4 },
  ] });
  const tahitianSlots = layout.map((name, index) => name === 'Tahitian Pearl' ? index : -1).filter((index) => index >= 0);
  assert.equal(tahitianSlots.length, 2);
  assert.ok(Math.abs(tahitianSlots[1] - tahitianSlots[0]) > 1);
});

test('a selected material can be placed into any chosen bracelet slot without moving the other focal piece', () => {
  const initial = Array(22).fill(null);
  const first = placeMaterialAtSlot({ layout: initial, slotIndex: 2, materialName: 'Tahitian Pearl', allowedQuantity: 2 });
  const second = placeMaterialAtSlot({ layout: first, slotIndex: 14, materialName: 'Tahitian Pearl', allowedQuantity: 2 });
  assert.equal(second[2], 'Tahitian Pearl');
  assert.equal(second[14], 'Tahitian Pearl');
  assert.equal(second.filter((name) => name === 'Tahitian Pearl').length, 2);
});

test('workbench serves the design-tray browser module with a JavaScript content type', async (t) => {
  const port = 44173;
  const child = spawn(process.execPath, ['workbench/server.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, WORKBENCH_PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => child.kill());
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Workbench test server did not start')), 3000);
    child.stdout.once('data', () => { clearTimeout(timeout); resolve(); });
    child.once('error', reject);
  });
  const response = await get(port, '/design-tray.mjs');
  assert.equal(response.statusCode, 200);
  assert.match(String(response.headers['content-type']), /^application\/javascript/);
});

test('design tray is rendered as a circular bracelet preview, not a linear bead strip', () => {
  const app = fs.readFileSync(path.join(process.cwd(), 'workbench', 'app.js'), 'utf8');
  const css = fs.readFileSync(path.join(process.cwd(), 'workbench', 'style.css'), 'utf8');
  assert.match(app, /class="bracelet-ring"/);
  assert.match(app, /--bead-angle/);
  assert.match(css, /\.bracelet-ring\{/);
  assert.match(css, /rotate\(var\(--bead-angle\)\) translateY/);
});
