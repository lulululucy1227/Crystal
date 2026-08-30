import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const P2I_CONTRACT = 'P2I-GPT-PACKAGING-IDENTITY-MAPPING-V1';
const P2J_CONTRACT = 'P2J-GPT-MATERIAL-GAP-RESOLUTION-V1';

export function importP2iP2j(dbPath, p2i, p2j) {
  if (p2i.contract_version !== P2I_CONTRACT || p2j.contract_version !== P2J_CONTRACT) {
    throw new Error('Invalid P2I/P2J contract version');
  }
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys=ON');
  const result = { packaging: { created: 0, reused: 0 }, materials: { created: 0, reused: 0 }, variants: { created: 0, reused: 0 }, promotions_created: 0 };
  try {
    const laval = db.prepare('select source_id from supplier where supplier_name=?').get('Laval Europe');
    const edel = db.prepare('select source_id from supplier where supplier_name=?').get('Gemstone Wholesale / edelsteine.de');
    if (!laval || !edel) throw new Error('Required canonical supplier/source is missing');
    db.exec('BEGIN IMMEDIATE');
    for (const mapping of p2i.mappings) {
      const existing = db.prepare('select id from packaging_option where packaging_code=?').get(mapping.packaging_code);
      if (existing) { result.packaging.reused++; continue; }
      db.prepare('insert into packaging_option(packaging_code,packaging_type,material_description,dimensions,finish,suitable_tier,source_id,verification_status,notes) values (?,?,?,?,?,?,?,?,?)').run(
        mapping.packaging_code, mapping.packaging_type, mapping.material_description, mapping.dimensions, mapping.finish,
        'unclassified', laval.source_id, 'unverified',
        `P2I source product reference=${mapping.source_product_reference}; source_url=${mapping.source_url}; ${mapping.source_notes}`,
      );
      result.packaging.created++;
    }
    for (const mapping of p2j.mappings) {
      const parentSpec = mapping.canonical_parent ?? { canonical_name: mapping.canonical_parent_name };
      let parent = db.prepare('select id from material where canonical_name=?').get(parentSpec.canonical_name);
      if (!parent) {
        if (!mapping.canonical_parent) throw new Error(`Missing required existing parent ${parentSpec.canonical_name}`);
        const id = Number(db.prepare('insert into material(canonical_name,material_family,natural_status,description) values (?,?,?,?)').run(parentSpec.canonical_name, parentSpec.material_family, parentSpec.natural_status, parentSpec.description).lastInsertRowid);
        parent = { id }; result.materials.created++;
      } else result.materials.reused++;
      const variant = mapping.variant;
      if (db.prepare('select id from material_variant where variant_code=?').get(variant.variant_code)) { result.variants.reused++; continue; }
      db.prepare('insert into material_variant(material_id,variant_code,grade_label,color_description,transparency,optical_features,inclusion_features,cut_description,size_range_mm,treatment_disclosure,reproducibility,provenance_source_id,verification_status,notes,commercial_tier,source_tier_label) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
        parent.id, variant.variant_code, variant.grade_label, variant.color_description, variant.transparency, variant.optical_features,
        variant.inclusion_features, variant.cut_description, variant.size_range_mm, variant.treatment_disclosure, variant.reproducibility,
        edel.source_id, 'unverified',
        `P2J source product=${mapping.source_product_label}; source_url=${mapping.source_url}; ${mapping.source_product_no ? `source_product_no=${mapping.source_product_no}; ` : ''}${mapping.source_conflict_note ?? ''}`,
        'unclassified', variant.source_tier_label,
      );
      result.variants.created++;
    }
    db.exec('COMMIT');
    return result;
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch {}
    throw error;
  } finally { db.close(); }
}

if (process.argv[1]?.endsWith('import-p2i-p2j-identities.mjs')) {
  const p2i = JSON.parse(fs.readFileSync(process.argv[2] ?? 'inputs/p2i-gpt-packaging-identity-mapping-20260830.json', 'utf8'));
  const p2j = JSON.parse(fs.readFileSync(process.argv[3] ?? 'inputs/p2j-gpt-material-gap-resolution-20260830.json', 'utf8'));
  console.log(JSON.stringify(importP2iP2j(process.argv[4] ?? 'data/crystal-design.sqlite', p2i, p2j), null, 2));
}
