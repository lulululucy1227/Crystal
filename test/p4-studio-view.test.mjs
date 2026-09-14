import test from 'node:test';
import assert from 'node:assert/strict';
import { studioMarkup, exportDesign } from '../workbench/studio-view.mjs';
test('Graphite Studio has library, tray and inspector in reading order with stable hooks and no checkout', () => {
  const html = studioMarkup();
  for (const hook of ['canvas','status','search','tabs','material-grid','bom','launch-board']) assert.equal((html.match(new RegExp(`data-studio-${hook}(?:[ >])`,'g')) || []).length,1,hook);
  assert.ok(html.indexOf('data-studio-material-grid') < html.indexOf('data-studio-canvas'));
  assert.ok(html.indexOf('data-studio-canvas') < html.indexOf('data-current-bead'));
  assert.match(html,/收拢成串/); assert.match(html,/解除成串/); assert.doesNotMatch(html,/加入购物车/);
});
test('exports preserve exact identities and neutral cost rather than fabricate pricing', () => {
  const draft={name:'测试',braceletState:{instances:[{instanceId:'i1',materialId:'m1',specId:'s1',materialName:'Quartz',displayNameZh:'白水晶',sizeMm:8,form:'round',sourceStatus:'PROPOSED'}]}};
  assert.match(exportDesign(draft,'design-json').text,/"instanceId": "i1"/);
  assert.match(exportDesign(draft,'bom-csv').text,/material_id,spec_id,name_zh/);
  assert.match(exportDesign(draft,'md').text,/PROPOSED/);
});
