import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const read = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const p2f = read('inputs/p2f-gpt-packaging-catalog-benchmark-20260830.json');
const p2g = read('inputs/p2g-gpt-core-material-catalog-benchmark-20260830.json');
const p2i = read('inputs/p2i-gpt-packaging-identity-mapping-20260830.json');
const p2j = read('inputs/p2j-gpt-material-gap-resolution-20260830.json');

function stagedRecord(db, offerKey) {
  return db.prepare('select id, validation_status from staged_record where raw_record_json like ?').get(`%${offerKey}%`);
}
function reviewState(db, stagedRecordId) {
  const review = db.prepare('select decision from review_decision where staged_record_id=? order by id desc limit 1').get(stagedRecordId);
  return review?.decision ?? 'none';
}
function target(db, type, code) {
  const table = type === 'packaging_option' ? 'packaging_option' : 'material_variant';
  const field = type === 'packaging_option' ? 'packaging_code' : 'variant_code';
  return db.prepare(`select id from ${table} where ${field}=?`).get(code);
}

export function buildP2kP2l(db) {
  const packageByKey = new Map(p2i.mappings.map((mapping) => [mapping.offer_key, mapping]));
  const materialByKey = new Map([
    ...p2g.catalog_offers.filter((offer) => offer.canonical_parent_mapping && offer.offer_key !== 'EDEL-LABRADORITE-FACETED-AAA-12-13MM-40CM').map((offer) => [offer.offer_key, `SRC-P2G-${offer.offer_key}`]),
    ...p2j.mappings.map((mapping) => [mapping.offer_key, mapping.variant.variant_code]),
  ]);
  const offers = [];
  for (const offer of p2f.catalog_offers) {
    const mapping = packageByKey.get(offer.offer_key);
    const stage = stagedRecord(db, offer.offer_key);
    const canonical = target(db, 'packaging_option', mapping.packaging_code);
    const review = reviewState(db, stage.id);
    offers.push({ offer_key: offer.offer_key, staged_record_id: stage.id, exact_canonical_target: { type: 'packaging_option', id: canonical?.id ?? null, code: mapping.packaging_code }, supplier_source_identity: 'Laval Europe', price: { currency: offer.currency, unit: 'piece', vat_basis: offer.vat_basis, price_tiers: offer.price_tiers }, verification_status: offer.verification_status, review_decision: review, staged_status: stage.validation_status, classification: canonical && review === 'approved' ? 'EXACT_IDENTITY_ALREADY_APPROVED' : canonical ? 'EXACT_IDENTITY_REVIEW_REQUIRED' : 'IDENTITY_STILL_UNRESOLVED', rough_benchmark_usable: true });
  }
  for (const offer of p2g.catalog_offers) {
    const code = materialByKey.get(offer.offer_key);
    const stage = stagedRecord(db, offer.offer_key);
    const canonical = code ? target(db, 'material_variant', code) : null;
    const review = reviewState(db, stage.id);
    offers.push({ offer_key: offer.offer_key, staged_record_id: stage.id, exact_canonical_target: { type: 'material_variant', id: canonical?.id ?? null, code: code ?? null }, supplier_source_identity: 'Gemstone Wholesale / edelsteine.de', price: { currency: offer.currency, unit: offer.unit_label, unit_price_minor: offer.unit_price_minor, vat_basis: offer.vat_basis }, verification_status: offer.verification_status, review_decision: review, staged_status: stage.validation_status, classification: canonical && review === 'approved' ? 'EXACT_IDENTITY_ALREADY_APPROVED' : canonical ? 'EXACT_IDENTITY_REVIEW_REQUIRED' : 'IDENTITY_STILL_UNRESOLVED', rough_benchmark_usable: true });
  }
  const promoted = offers.filter((offer) => offer.staged_status === 'promoted');
  const exactReviewRequired = offers.filter((offer) => offer.classification === 'EXACT_IDENTITY_REVIEW_REQUIRED');
  const unresolved = offers.filter((offer) => offer.classification === 'IDENTITY_STILL_UNRESOLVED');
  const materialCategories = db.prepare(`select distinct m.canonical_name from material_variant mv join material m on m.id=mv.material_id where mv.variant_code like 'SRC-EDEL-%' or mv.variant_code like 'SRC-P2G-%' order by m.canonical_name`).all().map((row) => row.canonical_name);
  const promotedMaterialVariants = db.prepare(`select mv.variant_code, m.canonical_name as material, so.id as supplier_offer_id, so.quote_currency as currency, so.unit_price_minor, so.unit_label as unit from supplier_offer so join material_variant mv on mv.id=so.material_variant_id join material m on m.id=mv.material_id where mv.variant_code like 'SRC-EDEL-%' order by mv.variant_code`).all();
  const hardware = db.prepare(`select c.component_code from supplier_offer so join component c on c.id=so.component_id where c.component_code like 'SRC-PERLES-%' order by c.component_code`).all().map((row) => row.component_code);
  const packaging = p2i.mappings.map((mapping) => mapping.packaging_code);
  const exactStaged = offers.filter((offer) => offer.classification === 'EXACT_IDENTITY_REVIEW_REQUIRED');
  const p2l = {
    phase: 'P2L-PROTOTYPE-READINESS-GATE', read_only: true,
    factual_matrix: {
      distinct_canonical_material_categories: materialCategories,
      exact_source_scoped_material_variants_with_public_catalog_prices: [
        ...promotedMaterialVariants.map((row) => ({ source_state: 'promoted', ...row, price_boundary: 'source-stated catalog basis' })),
        ...offers.filter((offer) => offer.exact_canonical_target.type === 'material_variant').map((offer) => ({ source_state: 'exact_staged_only', offer_key: offer.offer_key, ...offer.exact_canonical_target, price: offer.price })),
      ],
      exact_hardware_component_benchmark_offers: hardware.length,
      hardware_components: hardware,
      exact_packaging_source_product_benchmarks: packaging.length,
      packaging_source_products: packaging,
      promoted_offers: 6,
      exact_staged_only_offers: exactStaged.length,
      price_ranges: [
        { currency: 'EUR', vat_basis: 'excl_vat', min_minor: 158, max_minor: 370, source: 'P2F packaging tiers' },
        { currency: 'EUR', vat_basis: 'incl_19pct_vat', min_minor: 1309, max_minor: 11305, source: 'P2G material strand prices' },
        { currency: 'EUR', vat_basis: 'source_stated_catalog_basis', min_minor: 210, max_minor: 6545, source: 'P2E promoted public-catalog benchmarks' },
      ],
      per_piece_offers: ['PERLES-925-CURVED-TUBE-26X3', 'PERLES-925-ROUND-SPACER-113X6', ...p2f.catalog_offers.map((offer) => offer.offer_key)],
      per_strand_offers: p2g.catalog_offers.map((offer) => offer.offer_key),
      explicit_bead_count_offers: [{ offer_key: 'EDEL-LAPIS-8MM-38CM-46BEADS', bead_count: 46, source_statement: 'seller states 46 beads' }],
      per_bead_cost_must_not_be_inferred: p2g.catalog_offers.filter((offer) => offer.offer_key !== 'EDEL-LAPIS-8MM-38CM-46BEADS').map((offer) => offer.offer_key),
      schema_integrity_process_blockers: [],
    },
    classification: materialCategories.length >= 5 && hardware.length >= 2 && packaging.length >= 2 && unresolved.length === 0 ? 'READY_FOR_USER_PROTOTYPE_DECISION' : 'CONTINUE_ORDINARY_DATA_WORK',
  };
  if (p2l.classification === 'READY_FOR_USER_PROTOTYPE_DECISION') p2l.decision_inputs = { first_prototype_theme_or_design_direction: null, target_prototype_positioning_or_quality_envelope: null, sourcing_route: ['Europe-local ease/speed', 'broader lower-cost sourcing exploration'], staged_benchmarks_policy: ['accept exact staged benchmarks for planning', 'use only approved canonical offers'] };
  return { p2k: { phase: 'P2K-REVIEW-READY-SOURCING-RECONCILIATION', offers, total_exact_review_ready: exactReviewRequired.length, unresolved_count: unresolved.length, promoted_count: promoted.length, exact_staged_public_catalog_benchmarks: exactStaged.map((offer) => offer.offer_key) }, p2l };
}

if (process.argv[1]?.endsWith('audit-p2k-p2l-readiness.mjs')) {
  const db = new DatabaseSync(process.argv[2] ?? 'data/crystal-design.sqlite');
  const { p2k, p2l } = buildP2kP2l(db);
  fs.writeFileSync('outputs/p2k-sourcing-review-ready-pack.json', `${JSON.stringify(p2k, null, 2)}\n`);
  fs.writeFileSync('outputs/p2l-prototype-readiness-gate.json', `${JSON.stringify(p2l, null, 2)}\n`);
  db.close();
  console.log(JSON.stringify({ p2k: { total_exact_review_ready: p2k.total_exact_review_ready, unresolved_count: p2k.unresolved_count }, p2l: { classification: p2l.classification } }, null, 2));
}
