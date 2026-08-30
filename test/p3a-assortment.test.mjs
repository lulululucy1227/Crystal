import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAssortment } from '../scripts/build-p3a-assortment.mjs';

test('P3A preserves all four assortment sections and reports candidate-only identities', () => {
  const result = buildAssortment('data/assortment-selection-v1.json', 'data/crystal-design.sqlite');
  assert.equal(result.items.some((item) => item.section === 'minerals_crystals'), true);
  assert.equal(result.items.some((item) => item.section === 'pearls_organic'), true);
  assert.equal(result.items.some((item) => item.section === 'hardware_accessories'), true);
  assert.equal(result.items.some((item) => item.section === 'packaging'), true);
  assert.equal(result.reconciliation.selected_mineral_count > 0, true);
  assert.equal(result.reconciliation.candidate_only_count > 0, true);
});
