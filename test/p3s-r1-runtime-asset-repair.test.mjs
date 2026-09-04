import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const assetPaths = [
  '/assets/catalog/generated/crystals-hero-atlas.svg',
  '/assets/catalog/generated/crystals-comparison-atlas.svg',
  '/assets/catalog/generated/crystals-grade-overrides-v1.svg',
  '/assets/catalog/generated/pearls-organic-hero-atlas.svg',
  '/assets/catalog/generated/hardware-hero-atlas.svg',
  '/assets/catalog/generated/packaging-hero-atlas.svg',
  '/assets/catalog/generated/generated-asset-manifest-v1.json'
];

async function waitFor(url) {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { return await fetch(url); } catch (error) { lastError = error; await new Promise((resolve) => setTimeout(resolve, 50)); }
  }
  throw lastError;
}

test('P3S-R1 workbench serves generated sprites as browser-safe assets without stale-cache ambiguity', async (t) => {
  const port = 47000 + Math.floor(Math.random() * 1000);
  const server = spawn(process.execPath, ['workbench/server.mjs'], { cwd: process.cwd(), env: { ...process.env, WORKBENCH_PORT: String(port) }, stdio: 'ignore' });
  t.after(() => { if (!server.killed) server.kill(); });
  const origin = `http://127.0.0.1:${port}`;
  const landing = await waitFor(`${origin}/`);
  assert.equal(landing.status, 200);
  for (const assetPath of assetPaths) {
    const response = await fetch(`${origin}${assetPath}`);
    assert.equal(response.status, 200, assetPath);
    assert.match(response.headers.get('content-type') || '', assetPath.endsWith('.svg') ? /^image\/svg\+xml/ : /^application\/json/);
    assert.equal(response.headers.get('cache-control'), 'no-store', assetPath);
    assert.ok((await response.arrayBuffer()).byteLength > 100, assetPath);
  }
});
