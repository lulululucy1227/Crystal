import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const generated = path.join(root, 'workbench', 'assets', 'catalog', 'generated');
test('P3S manifest defines a complete generated display layer and the workbench consumes hero plus override atlases', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(generated, 'generated-asset-manifest-v1.json'), 'utf8'));
  const overrides = JSON.parse(fs.readFileSync(path.join(generated, 'generated-asset-overrides-v1.json'), 'utf8'));
  const app = fs.readFileSync(path.join(root, 'workbench', 'app.js'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'workbench', 'server.mjs'), 'utf8');
  const total = Object.values(manifest.atlases).reduce((n, atlas) => n + (atlas.order?.length || 0), 0) - manifest.atlases.crystals_comparison.order.length - manifest.atlases.pearls_organic_comparison.order.length;
  assert.equal(manifest.atlases.crystals_hero.order.length, 23);
  assert.equal(manifest.atlases.pearls_organic_hero.order.length, 6);
  assert.equal(manifest.atlases.hardware_hero.order.length, 8);
  assert.equal(manifest.atlases.packaging_hero.order.length, 8);
  assert.equal(total, 45); assert.equal(overrides.order.length, 10);
  for (const slug of overrides.order) assert.ok(manifest.atlases.crystals_hero.order.includes(slug));
  for (const atlas of Object.values(manifest.atlases)) assert.ok(fs.existsSync(path.join(root, atlas.file)));
  assert.match(app, /generated-asset-manifest-v1\.json/);
  assert.match(app, /crystals-grade-overrides-v1\.svg/);
  assert.match(app, /function displayItems/);
  assert.match(app, /generated_only: true/);
  assert.match(app, /data-comparison-source/);
  assert.match(app, /generated_from_evidence/);
  assert.match(server, /image\/svg\+xml/);
  assert.doesNotMatch(app, /source_photo|AAA/);
});
