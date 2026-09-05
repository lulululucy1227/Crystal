import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateDesignPackage } from '../workbench/design-package.mjs';
import { renderPortfolio } from '../workbench/portfolio-view.mjs';

const fixture = () => JSON.parse(fs.readFileSync(new URL('./fixtures/nature-launch-valid.json', import.meta.url)));
const validated = () => validateDesignPackage(fixture());

test('portfolio renders six Chinese-primary themes, eighteen fact-bearing load buttons and all 153 comparisons', () => {
  const html = renderPortfolio(validated());
  assert.equal((html.match(/data-design="/g) || []).length, 18);
  assert.equal((html.match(/data-portfolio-theme="/g) || []).length, 6);
  assert.equal((html.match(/data-comparison-row/g) || []).length, 153);
  for (const label of ['山', '海', '森林', '日出', '星辰', '冰川']) assert.ok(html.includes(`<h3>${label} <small`));
  for (const fact of ['TEST-MOUNTAIN-1', '测试Mountain1', 'Synthetic Mountain 1', 'test-1', '测试珠', '16 cm', 'PROPOSED', 'WARN', 'NOT_CHECKED']) assert.ok(html.includes(fact), fact);
  assert.ok(html.includes('结构类型'));
  assert.ok(html.includes('材料重叠'));
  assert.ok(html.includes('结构指纹相同'));
  assert.ok(!html.includes('<pre>'));
  assert.ok(html.includes('合成测试数据'));
});

test('failed and unvalidated designs cannot be loaded and retain their concrete errors', () => {
  const result = validated();
  result.designs[0].validation.status = 'FAIL';
  result.designs[0].validation.errors = ['beads[0].size_mm must be positive'];
  delete result.designs[1].validation;
  const html = renderPortfolio(result);
  assert.match(html, /<button[^>]*data-design="TEST-MOUNTAIN-1"[^>]*disabled/);
  assert.match(html, /<button[^>]*data-design="TEST-MOUNTAIN-2"[^>]*disabled/);
  assert.ok(html.includes('beads[0].size_mm must be positive'));
  assert.ok(html.includes('未运行校验'));
  assert.ok(!html.match(/<button[^>]*data-design="TEST-MOUNTAIN-3"[^>]*disabled/));
});

test('procurement states do not collapse unverified mapping, unmatched mapping, and approved author claims', () => {
  const result = validated();
  const summary = result.designs[0].validation.material_mapping;
  Object.assign(summary, { approved: 1, proposed: 1, unresolved: 0, mapped: 0, unmapped: 1, not_checked: 1 });
  const html = renderPortfolio(result);
  assert.ok(html.includes('APPROVED 1'));
  assert.ok(html.includes('PROPOSED 1'));
  assert.ok(html.includes('未核验 NOT_CHECKED 1'));
  assert.ok(html.includes('未匹配 UNMAPPED 1'));
  assert.ok(html.includes('声明状态不等于采购映射已核验'));
  assert.ok(!html.includes('已全部批准'));
});

test('package content is escaped in attributes, cards, errors and the matrix', () => {
  const result = validated();
  const payload = '"><img src=x onerror=alert(1)>';
  result.designs[0].design_id = payload;
  result.designs[0].zh_name = payload;
  result.designs[0].structure_signature.symmetry = payload;
  result.designs[0].beads[0].display_name_zh = payload;
  result.designs[0].validation.errors = [payload];
  const html = renderPortfolio(result);
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('data-design=""><'));
  assert.ok(html.includes('&lt;img'));
});

test('an empty or absent package has no invented cards or mapping claims', () => {
  for (const input of [undefined, null, { designs: [] }]) {
    const html = renderPortfolio(input);
    assert.ok(html.includes('尚未交付'));
    assert.ok(!html.includes('data-design='));
    assert.ok(!html.includes('APPROVED 0'));
  }
});

test('duplicate design identities disable every ambiguous load target', () => {
  const p = fixture();
  p.designs[1].design_id = p.designs[0].design_id;
  const html = renderPortfolio(validateDesignPackage(p));
  const buttons = html.match(/<button[^>]*data-design="TEST-MOUNTAIN-1"[^>]*>/g);
  assert.equal(buttons.length, 2);
  assert.ok(buttons.every(button => button.includes('disabled')));
});
