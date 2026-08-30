import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(process.argv[2] ?? 'data/crystal-design.sqlite');
const all = (sql, ...params) => db.prepare(sql).all(...params);
const count = (sql, ...params) => db.prepare(sql).get(...params).n;
const catalogVariants = all(`SELECT mv.variant_code, m.canonical_name AS material, so.id AS supplier_offer_id, so.quote_currency, so.unit_price_minor, so.unit_label FROM supplier_offer so JOIN material_variant mv ON mv.id = so.material_variant_id JOIN material m ON m.id = mv.material_id WHERE so.verification_status = 'unverified' AND so.notes LIKE 'Public catalog%benchmark%' ORDER BY mv.variant_code`);
const catalogComponents = all(`SELECT c.component_code, so.id AS supplier_offer_id, so.quote_currency, so.unit_price_minor, so.unit_label FROM supplier_offer so JOIN component c ON c.id = so.component_id WHERE so.verification_status = 'unverified' AND so.notes LIKE 'Public catalog%benchmark%' ORDER BY c.component_code`);
const themes = all(`SELECT DISTINCT theme AS theme_name FROM design_reference_theme ORDER BY theme`);
const out = {
  phase: 'P2H-SOURCING-COST-READINESS-MATRIX', read_only: true,
  price_boundary: 'Catalog benchmarks are public prices only, not landed production costs or supplier selections.',
  counts: { materials: count('select count(*) n from material'), variants: count('select count(*) n from material_variant'), components: count('select count(*) n from component'), suppliers: count('select count(*) n from supplier'), supplier_offers: count('select count(*) n from supplier_offer'), packaging_supplier_offers: count('select count(*) n from packaging_supplier_offer') },
  supplier_offer_by_status: all('select verification_status,count(*) count from supplier_offer group by verification_status'),
  catalog_benchmarks_usable_for_bom_costing: { material_variant_offers: catalogVariants, component_offers: catalogComponents, total: catalogVariants.length + catalogComponents.length },
  staged_only_evidence: { supplier_offer: count("select count(*) n from staged_record where target_entity='supplier_offer' and validation_status='review_required'"), packaging_offer: count("select count(*) n from staged_record where target_entity='packaging_supplier_offer' and validation_status='review_required'") },
  cost_ranges: { promoted_supplier_offer: all('select min(unit_price_minor) min_minor,max(unit_price_minor) max_minor,quote_currency from supplier_offer group by quote_currency'), staged_packaging: { currency: 'EUR', vat_basis: 'excl_vat', min_minor: 158, max_minor: 370 }, staged_p2g_material: { currency: 'EUR', vat_basis: 'incl_19pct_vat', min_minor: 1309, max_minor: 11305 } },
  sourcing_coverage: { materials_with_exact_catalog_offer: [...new Set(catalogVariants.map((row) => row.material))], components_with_exact_catalog_offer: catalogComponents.map((row) => row.component_code), themes_observed_read_only: themes.map((row) => row.theme_name), blocked_only_by_missing_or_unapproved_data: ['P2F packaging offers require exact packaging_option mapping and/or approved promotion.', 'P2G offers remain review_required; Labradorite faceted size conflict and Rutilated Quartz parent mapping remain staged.'], genuine_user_business_decision_required: [] },
  classification: 'CONTINUE_ORDINARY_DATA_WORK', reason: 'Ordinary exact identity and review work remains before selecting a prototype theme, quality tier, or sourcing route.'
};
fs.writeFileSync(process.argv[3] ?? 'outputs/p2h-sourcing-cost-readiness-matrix.json', `${JSON.stringify(out, null, 2)}\n`);
db.close(); console.log(JSON.stringify(out, null, 2));
