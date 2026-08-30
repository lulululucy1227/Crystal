import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { buildGlacierPlanningOutputs } from '../scripts/audit-p2n-p2q-glacier.mjs';

test('P2N-P2Q keeps exact staged evidence visible and reaches purchase approval without a purchase action', () => {
  const db = new DatabaseSync('data/crystal-design.sqlite');
  const { p2n, p2o, p2p, p2q } = buildGlacierPlanningOutputs(db);
  assert.equal(p2n.prototype_variants.length, 2);
  assert.equal(p2n.prototype_variants[0].code, 'P01-A');
  assert.equal(p2o.variants[0].known_catalog_spend.eur_incl_19pct_vat_minor, 7973);
  assert.equal(p2o.variants[0].optional_larimar_hero_incremental.eur_incl_19pct_vat_minor, 8500);
  assert.equal(p2p.packaging_shortlist.length, 4);
  assert.equal(p2q.classification, 'READY_FOR_PURCHASE_APPROVAL');
  assert.equal(p2q.purchase_decision_packet.purchase_authorization_granted, false);
  db.close();
});
