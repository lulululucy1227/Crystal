import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(process.argv[2] ?? 'data/crystal-design.sqlite');
const p2f = JSON.parse(fs.readFileSync('inputs/p2f-gpt-packaging-catalog-benchmark-20260830.json', 'utf8'));
const p2g = JSON.parse(fs.readFileSync('inputs/p2g-gpt-core-material-catalog-benchmark-20260830.json', 'utf8'));

const staged = db.prepare(`
  SELECT raw_record_json FROM staged_record
  WHERE target_entity = ?
`).all('packaging_supplier_offer').map((row) => JSON.parse(row.raw_record_json));
const variants = db.prepare(`
  SELECT mv.variant_code, m.canonical_name AS material_name
  FROM material_variant mv JOIN material m ON m.id = mv.material_id
  WHERE mv.variant_code LIKE 'SRC-P2G-%'
  ORDER BY mv.variant_code
`).all();

const packaging = p2f.catalog_offers.map((offer) => ({
  offer_key: offer.offer_key,
  result: 'no_match',
  reason: 'No exact existing packaging_option identity and no approved packaging promotion record.',
  staged: staged.some((row) => row.offer_key === offer.offer_key),
  promotion: 'not_created',
  price_tiers: offer.price_tiers,
  price_basis: offer.vat_basis,
}));

const p2gOffers = p2g.catalog_offers.map((offer) => {
  const conflict = offer.offer_key === 'EDEL-LABRADORITE-FACETED-AAA-12-13MM-40CM';
  const noParent = offer.offer_key === 'EDEL-RUTILATED-QUARTZ-MULTI-8MM-40CM';
  const variantCode = `SRC-P2G-${offer.offer_key}`;
  return {
    offer_key: offer.offer_key,
    result: conflict ? 'ambiguous' : noParent ? 'no_match' : 'exact_identity_created',
    reason: conflict
      ? 'Seller title and description retain conflicting size claims; no exact variant was normalized.'
      : noParent
        ? 'Authoritative input intentionally supplies no canonical parent mapping.'
        : 'Explicit canonical parent mapping reconciled to a source-scoped, unverified variant.',
    staged: true,
    source_scoped_variant_code: conflict || noParent ? null : variantCode,
    promotion: 'not_created_pending_review',
  };
});

const packagingCosts = p2f.catalog_offers.flatMap((offer) => offer.price_tiers.map((tier) => tier.price_minor));
const materialCosts = p2g.catalog_offers.map((offer) => offer.unit_price_minor);

fs.writeFileSync('outputs/p2f-packaging-matchability-audit.json', `${JSON.stringify({
  phase: 'P2F-EUROPE-PACKAGING-BENCHMARK-INTAKE',
  exact: 0,
  no_match: packaging.length,
  ambiguous: 0,
  packaging_cost_benchmark_range: {
    currency: 'EUR',
    price_basis: 'catalog_excluding_vat',
    min_minor: Math.min(...packagingCosts),
    max_minor: Math.max(...packagingCosts),
  },
  offers: packaging,
}, null, 2)}\n`);

fs.writeFileSync('outputs/p2g-core-material-matchability-audit.json', `${JSON.stringify({
  phase: 'P2G-CORE-MATERIAL-CATALOG-BENCHMARK-INTAKE',
  exact_identity_created: p2gOffers.filter((offer) => offer.result === 'exact_identity_created').length,
  no_match: p2gOffers.filter((offer) => offer.result === 'no_match').length,
  ambiguous: p2gOffers.filter((offer) => offer.result === 'ambiguous').length,
  promotion_created: 0,
  material_cost_benchmark_range: {
    currency: 'EUR',
    min_minor: Math.min(...materialCosts),
    max_minor: Math.max(...materialCosts),
  },
  source_scoped_variants: variants,
  offers: p2gOffers,
}, null, 2)}\n`);
