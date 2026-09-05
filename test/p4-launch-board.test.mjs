import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateDesignPackage } from '../workbench/design-package.mjs';
import { buildLaunchBoard, differenceMatrix } from '../workbench/nature-launch.mjs';
const fixture=()=>JSON.parse(fs.readFileSync(new URL('./fixtures/nature-launch-valid.json',import.meta.url)));

test('board groups eighteen real input cards into six themes and includes comparison facts', () => {
  const board=buildLaunchBoard(validateDesignPackage(fixture()));
  assert.equal(board.length,6);
  assert.ok(board.every(group=>group.cards.length===3));
  const card=board[0].cards[0];
  assert.equal(card.designId,'TEST-MOUNTAIN-1');
  assert.equal(card.zhName,'测试Mountain1');
  assert.equal(card.enName,'Synthetic Mountain 1');
  assert.equal(card.archetype,'test-1');
  assert.deepEqual(card.coreMaterials,['测试珠']);
  assert.equal(card.wristCm,16);
  assert.equal(card.materialStatus.proposed,2);
  assert.equal(card.validationStatus,'WARN');
  assert.equal(card.beads.length,2);
});

test('board never invents placeholder designs when package is absent', () => {
  assert.equal(buildLaunchBoard({designs:[]}).flatMap(x=>x.cards).length,0);
  assert.deepEqual(differenceMatrix([]),[]);
});

test('difference matrix identifies same-theme and cross-theme repeat risk without counting color-only changes', () => {
  const a=fixture().designs[0], b=structuredClone(a);
  b.design_id='SECOND'; b.zh_name='改名'; b.color_language=['different'];
  let matrix=differenceMatrix([a,b]);
  assert.equal(matrix.length,1);
  assert.equal(matrix[0].sameTheme,true);
  assert.equal(matrix[0].duplicateStructure,true);
  assert.equal(matrix[0].materialOverlap,1);
  assert.deepEqual(matrix[0].structuralDifferences,[]);
  b.theme='Ocean';
  b.structure_signature.symmetry='asymmetric';
  matrix=differenceMatrix([a,b]);
  assert.equal(matrix[0].sameTheme,false);
  assert.equal(matrix[0].duplicateStructure,false);
  assert.deepEqual(matrix[0].structuralDifferences,['symmetry']);
});
