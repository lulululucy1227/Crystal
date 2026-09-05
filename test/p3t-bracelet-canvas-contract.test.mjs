import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const serverFile = path.join(root, 'workbench', 'server.mjs');
const canvasFile = path.join(root, 'workbench', 'bracelet-canvas.mjs');
const indexFile = path.join(root, 'workbench', 'index.html');

test('Fabric.js is pinned locally and no CDN dependency ships', () => {
  assert.equal(packageJson.dependencies?.fabric, '7.4.0');
  const index = fs.readFileSync(indexFile, 'utf8');
  assert.doesNotMatch(index, /cdn\.jsdelivr|unpkg|cdnjs/i);
});

test('server exposes only the allow-listed Fabric browser module', () => {
  const server = fs.readFileSync(serverFile, 'utf8');
  assert.match(server, /\/vendor\/fabric\/index\.min\.mjs/);
  assert.match(server, /fabric[\\/]dist[\\/]index\.min\.mjs/);
  assert.doesNotMatch(server, /node_modules.*url\.pathname/);
});

test('canvas adapter exports the semantic bracelet canvas factory', () => {
  assert.ok(fs.existsSync(canvasFile), 'bracelet-canvas.mjs must exist');
  const source = fs.readFileSync(canvasFile, 'utf8');
  assert.match(source, /export function createBraceletCanvas/);
  assert.match(source, /type:\s*['"]move['"]/);
  assert.match(source, /type:\s*['"]remove['"]/);
  assert.match(source, /material\.atlas/);
  assert.match(source, /cropX/);
  assert.match(source, /outsideRing/);
  assert.match(source, /slotDiameter/);
  assert.doesNotMatch(source, /localStorage|fetch\(|\/api\//);
});

test('dragging follows the pointer around the ring before snapping on release', () => {
  const source = fs.readFileSync(canvasFile, 'utf8');
  assert.match(source, /function projectPointToRing/);
  const movingBranch = source.match(/canvas\.on\('object:moving',[\s\S]*?canvas\.on\('object:modified'/)?.[0] || '';
  assert.match(movingBranch, /projectPointToRing/);
  assert.doesNotMatch(movingBranch, /pointForSlot\(slotIndex/);
});

test('running Workbench serves the Fabric module as JavaScript', async (t) => {
  const port = 44174;
  const child = spawn(process.execPath, ['workbench/server.mjs'], {
    cwd: root,
    env: { ...process.env, WORKBENCH_PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => child.kill());
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Workbench test server did not start')), 3000);
    child.stdout.once('data', () => { clearTimeout(timeout); resolve(); });
    child.once('error', reject);
  });
  const response = await fetch(`http://127.0.0.1:${port}/vendor/fabric/index.min.mjs`);
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /^application\/javascript/);
  assert.match(body, /class|function/);
});
