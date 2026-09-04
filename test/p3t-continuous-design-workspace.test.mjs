import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../workbench/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../workbench/style.css', import.meta.url), 'utf8');

test('design board uses the instance state model and Fabric canvas adapter', () => {
  assert.match(app, /from '.\/bracelet-state\.mjs'/);
  assert.match(app, /from '.\/bracelet-canvas\.mjs'/);
  assert.match(app, /createBraceletCanvas\s*\(/);
  assert.match(app, /undoHistory\s*\(/);
  assert.match(app, /redoHistory\s*\(/);
});

test('design board keeps materials, circular workspace, and ledger visible together', () => {
  assert.match(app, /studio-material-library/);
  assert.match(app, /bracelet-workspace/);
  assert.match(app, /design-ledger/);
  assert.match(app, /已选/);
  assert.match(app, /已排/);
  assert.match(app, /剩余/);
  assert.match(app, /data-studio-material/);
  assert.match(css, /\.design-studio-grid\s*\{[^}]*grid-template-columns:/s);
});

test('selecting a material does not navigate away or silently place a bead', () => {
  assert.match(app, /data-studio-material/);
  assert.doesNotMatch(app, /data-studio-material[^\n]+setView\(['"]catalog/);
  assert.match(app, /选择材料不会自动放珠/);
});

test('canvas includes explicit fit and history controls', () => {
  for (const label of ['撤销', '重做', '均匀初排', '清空排珠']) assert.match(app, new RegExp(label));
  assert.match(app, /targetCircumferenceMm/);
  assert.match(app, /remainingCircumferenceMm/);
});

