import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { buildP2kP2l } from '../scripts/audit-p2k-p2l-readiness.mjs';

test('P2K/P2L reports ten exact review-ready offers and a factual prototype decision gate', () => {
  const db = new DatabaseSync('data/crystal-design.sqlite');
  const { p2k, p2l } = buildP2kP2l(db);
  assert.equal(p2k.total_exact_review_ready, 10);
  assert.equal(p2k.unresolved_count, 0);
  assert.equal(p2k.promoted_count, 0);
  assert.equal(p2k.offers.every((offer) => offer.classification === 'EXACT_IDENTITY_REVIEW_REQUIRED'), true);
  assert.equal(p2l.classification, 'READY_FOR_USER_PROTOTYPE_DECISION');
  assert.equal(p2l.factual_matrix.exact_hardware_component_benchmark_offers, 2);
  assert.equal(p2l.factual_matrix.exact_packaging_source_product_benchmarks, 4);
  assert.equal(p2l.factual_matrix.explicit_bead_count_offers[0].offer_key, 'EDEL-LAPIS-8MM-38CM-46BEADS');
  db.close();
});
