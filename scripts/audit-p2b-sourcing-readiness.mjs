import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
const dbPath = process.argv[2] ?? 'data/crystal-design.sqlite';
const outPath = process.argv[3] ?? 'outputs/p2b-sourcing-readiness-audit.json';
const db = new DatabaseSync(dbPath);
const count = t => Number(db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n);
const grouped = (t, col) => db.prepare(`SELECT ${col} key, COUNT(*) count FROM ${t} GROUP BY ${col} ORDER BY ${col}`).all();
const audit = {
  protocol_version: 'P2B-SOURCING-READINESS-AUDIT-V1',
  generated_on: '2026-08-30',
  read_only: true,
  counts: Object.fromEntries(['material','material_variant','component','supplier','supplier_offer','packaging_option','packaging_supplier_offer','source','market_evidence','market_assessment','product_concept','bom','bom_line','staged_record','staged_field','review_decision','promotion_log'].map(t => [t, count(t)])),
  grouped: { source_by_type: grouped('source','source_type'), source_by_verification: grouped('source','verification_status'), variants_by_tier: grouped('material_variant','commercial_tier'), variants_by_reproducibility: grouped('material_variant','reproducibility'), staged_by_status: grouped('staged_record','validation_status'), staged_by_target: grouped('staged_record','target_entity'), staged_fields_by_status: grouped('staged_field','field_status'), staged_fields_by_target: grouped('staged_field','target_entity'), components_by_type: grouped('component','component_type'), components_by_role: grouped('component','design_role') },
  readiness: {
    material_variants_price_presence: db.prepare("SELECT SUM(CASE WHEN indicative_price_minor IS NOT NULL THEN 1 ELSE 0 END) with_price, SUM(CASE WHEN indicative_price_minor IS NULL THEN 1 ELSE 0 END) without_price FROM material_variant").get(),
    supplier_offers_detail: db.prepare('SELECT supplier_id, material_variant_id, component_id, moq, quoted_on, verification_status FROM supplier_offer ORDER BY id').all(),
    packaging_options_offer_presence: db.prepare('SELECT po.id, po.packaging_code, po.packaging_type, COUNT(pso.id) offer_count FROM packaging_option po LEFT JOIN packaging_supplier_offer pso ON pso.packaging_option_id=po.id GROUP BY po.id ORDER BY po.id').all(),
    stored_point_price_buckets: db.prepare("SELECT CASE WHEN indicative_price_minor < 10000 THEN '<100' WHEN indicative_price_minor < 30000 THEN '100-299.99' WHEN indicative_price_minor < 70000 THEN '300-699.99' WHEN indicative_price_minor < 200000 THEN '700-1999.99' ELSE '>=2000' END bucket, COUNT(*) count FROM material_variant WHERE indicative_price_minor IS NOT NULL GROUP BY bucket ORDER BY bucket").all(),
    source_and_offer_exact_list: db.prepare('SELECT s.id supplier_id, s.supplier_name, so.id offer_id, so.moq, so.quoted_on, so.verification_status FROM supplier s LEFT JOIN supplier_offer so ON so.supplier_id=s.id ORDER BY s.id, so.id').all()
  },
  safety: { no_schema_changes: true, no_business_table_writes: true, notes: 'Counts are stored-point inventory, not sales distribution; no independent research or gap-filling performed.' }
};
fs.writeFileSync(outPath, JSON.stringify(audit, null, 2) + '\n');
db.close();
console.log(JSON.stringify({outPath, counts: audit.counts}, null, 2));
