import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

const repo = path.resolve(import.meta.dirname, '..');

test('shared Workbench build has an explicit static publication boundary', () => {
  const script = path.join(repo, 'scripts', 'build-workbench-static.mjs');
  const bootstrap = path.join(repo, 'workbench', 'shared-bootstrap.js');
  const workflow = path.join(repo, '.github', 'workflows', 'deploy-workbench-pages.yml');

  assert.equal(fs.existsSync(script), true, 'static build script is required');
  assert.equal(fs.existsSync(bootstrap), true, 'static browser runtime is required');
  assert.equal(fs.existsSync(workflow), true, 'Pages deployment workflow is required');

  const source = fs.readFileSync(script, 'utf8');
  assert.match(source, /assets[\\/]local/);
  assert.match(source, /'exports'/);
  assert.match(source, /static-data\.json/);
  assert.match(source, /127\.0\.0\.1/);

  const runtime = fs.readFileSync(bootstrap, 'utf8');
  assert.match(runtime, /localStorage/);
  assert.match(runtime, /\/api\/drafts/);
  assert.match(runtime, /\/api\/local-assets/);
  assert.match(runtime, /static-data\.json/);
});

test('shared Workbench build excludes local source material and canonical source locations', () => {
  const result = spawnSync(process.execPath, ['scripts/build-workbench-static.mjs'], { cwd: repo, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = path.join(repo, '.static-workbench');
  const snapshot = fs.readFileSync(path.join(output, 'data', 'static-data.json'), 'utf8');
  assert.equal(fs.existsSync(path.join(output, 'assets', 'local')), false);
  assert.equal(fs.existsSync(path.join(output, 'state')), false);
  assert.equal(fs.existsSync(path.join(output, 'exports')), false);
  assert.equal(fs.existsSync(path.join(output, 'vendor', 'fabric', 'index.min.mjs')), true);
  assert.equal(snapshot.includes('local_image_path'), false);
  assert.equal(snapshot.includes('external_locator'), false);
  assert.equal(snapshot.includes('source_url'), false);
});
