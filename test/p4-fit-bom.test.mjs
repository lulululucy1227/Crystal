import test from 'node:test';
import assert from 'node:assert/strict';
import { fitEstimate } from '../workbench/bracelet-fit.mjs';
import { aggregateBom, compareExpectedBom, knownCostSummary } from '../workbench/bom.mjs';

test('mixed dimensions produce an explicitly approximate fit, not fixed-size capacity math', () => {
  const fit = fitEstimate({ wristCm: 3, instances: [{sizeMm:8},{sizeMm:8},{sizeMm:12},{sizeMm:4}], allowanceMm:0 });
  assert.equal(fit.usedMm,32);
  assert.equal(fit.deltaMm,2);
  assert.equal(fit.confidence,'approximate');
  assert.equal(fit.status,'fit');
  assert.equal(fitEstimate({wristCm:16,instances:[{size_mm:8}]}).status,'underfilled');
  assert.equal(fitEstimate({wristCm:1,instances:[{sizeMm:30}]}).status,'overflow');
});

test('missing dimensions and invalid targets do not silently become a guaranteed fit', () => {
  assert.equal(fitEstimate({wristCm:16,instances:[{}]}).status,'unknown');
  assert.equal(fitEstimate({wristCm:null,instances:[]}).status,'unknown');
  assert.equal(fitEstimate({wristCm:16,instances:[{sizeMm:-8}]}).missingSizeCount,1);
  assert.equal(fitEstimate({wristCm:1,instances:[{sizeMm:15,quantity:3}]}).usedMm,15);
});

test('BOM groups stable material and spec and never upgrades mixed approval states', () => {
  const rows=aggregateBom([
    {materialId:'aq',specId:'aq-8',displayNameZh:'海蓝宝',sizeMm:8,sourceStatus:'APPROVED'},
    {material_id:'aq',spec_id:'aq-8',display_name_zh:'同名',size_mm:8,quantity:2,source_status:'APPROVED'},
    {materialId:'aq',specId:'aq-10',sizeMm:10,sourceStatus:'PROPOSED'},
    {materialId:'aq',specId:'aq-8',sizeMm:8,sourceStatus:'PROPOSED'}
  ]);
  assert.equal(rows.length,3);
  assert.equal(rows.find(x=>x.specId==='aq-8'&&x.sourceStatus==='APPROVED').quantity,3);
  assert.equal(rows.filter(x=>x.sourceStatus==='PROPOSED').length,2);
});

test('expected BOM comparisons catch quantity, identity, status and duplicate-row errors', () => {
  const actual=aggregateBom([{materialId:'aq',specId:'8',sourceStatus:'PROPOSED'}]);
  const expected=[{material_id:'aq',spec_id:'8',source_status:'PROPOSED',quantity:1}];
  assert.equal(compareExpectedBom(actual,expected).match,true);
  for(const patch of [{quantity:2},{spec_id:'10'},{source_status:'APPROVED'}]) {
    assert.equal(compareExpectedBom(actual,[{...expected[0],...patch}]).match,false);
  }
  assert.equal(compareExpectedBom(actual,[expected[0],expected[0]]).match,false);
  assert.equal(compareExpectedBom(actual,undefined).match,false);
  assert.equal(compareExpectedBom([{materialId:'a',specId:'8',quantity:1,sourceStatus:'UNRESOLVED'}],[{material_id:'a',spec_id:'8',quantity:1}]).match,false);
});

test('cost remains unknown without sourced amounts and never combines currencies', () => {
  assert.equal(knownCostSummary([{price:15}]).display,'—');
  const result=knownCostSummary([
    {quantity:2,unitCost:{amount:1.25,currency:'EUR',source:'purchase-list'}},
    {unitCost:{amount:3,currency:'USD',source:'supplier-quote'}},
    {unitCost:{amount:99,currency:'EUR'}},
    {unitCost:{amount:-1,currency:'EUR',source:'invalid'}}
  ]);
  assert.deepEqual(result.totals,{EUR:2.5,USD:3});
  assert.equal(result.unknownQuantity,2);
  assert.equal(result.complete,false);
});
