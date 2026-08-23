import { DatabaseSync } from 'node:sqlite';

export const REVIEWER = 'GPT_APPROVED_2026_08_22';

// The source-row mapping is the explicit P1A-F review decision, not an inferred taxonomy.
const decisions = [
  { row: 3, canonical: 'Clear Quartz', family: 'crystal', alias: '白水晶', display: 'Clear Quartz' },
  { row: 4, canonical: 'Rose Quartz', family: 'crystal', alias: '粉水晶', display: 'Rose Quartz' },
  { row: 5, canonical: 'Citrine', family: 'crystal', treatment: 'heat-treated', display: 'Citrine (heat-treated)' },
  { row: 6, canonical: 'Amethyst', family: 'crystal', alias: '紫水晶', display: 'Amethyst' },
  { row: 7, canonical: 'Smoky Quartz', family: 'crystal', alias: '茶晶', display: 'Smoky Quartz' },
  { row: 8, canonical: 'Obsidian', family: 'gemstone', color: 'Black', display: 'Black Obsidian' },
  { row: 9, canonical: 'Obsidian', family: 'gemstone', optical: 'Silver Sheen', display: 'Silver Sheen Obsidian' },
  { row: 10, canonical: 'Obsidian', family: 'gemstone', optical: 'Golden Sheen', display: 'Golden Sheen Obsidian' },
  { row: 11, canonical: 'Green Aventurine', family: 'gemstone', alias: '绿东陵', origin: 'India', display: 'Green Aventurine' },
  { row: 12, canonical: "Tiger's Eye", family: 'gemstone', color: 'Gold / Golden Brown', display: "Gold Tiger's Eye" },
];

function normalized(value) {
  return String(value).normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

function getFields(db, recordId) {
  const all = db.prepare('SELECT * FROM staged_field WHERE staged_record_id=? ORDER BY id').all(recordId);
  const pick = (entity, field) => all.find(row => row.target_entity === entity && row.target_field === field);
  return {
    all, alias: pick('material_alias', 'alias_raw'), canonical: pick('material', 'canonical_name'),
    quality: pick('material_variant', 'quality_description'), tier: pick('material_variant', 'source_tier_label'),
    size: pick('material_variant', 'size_range_mm'), price: pick('supplier_offer', 'price_text'),
    supplier: pick('supplier', 'supplier_candidate'), narrative: pick('material_narrative', 'statement'),
    market: pick('market_assessment', 'assessment_text'),
  };
}

function ensureFieldShape(fields, row) {
  for (const [key, value] of Object.entries(fields)) if (key !== 'all' && !value) throw new Error(`Source row ${row} lacks staged field ${key}.`);
}

function promoteEvent(db, recordId, entity, entityId, field, operation, reason, sourceFields) {
  if (!sourceFields.length) throw new Error(`Promotion for ${entity} has no source field.`);
  const id = Number(db.prepare('INSERT INTO field_promotion_log(staged_record_id,canonical_entity,canonical_record_id,canonical_field,operation,promotion_reason,promoted_by) VALUES (?,?,?,?,?,?,?)')
    .run(recordId, entity, entityId, field, operation, reason, REVIEWER).lastInsertRowid);
  const insert = db.prepare('INSERT INTO field_promotion_source(field_promotion_log_id,staged_field_id) VALUES (?,?)');
  for (const sourceField of sourceFields) insert.run(id, sourceField.id);
  return id;
}

function decide(db, field, decision, reason) {
  db.prepare('INSERT INTO field_review_decision(staged_field_id,decision,reviewer,reason) VALUES (?,?,?,?)').run(field.id, decision, REVIEWER, reason);
}

export function promoteReviewedPilot(path) {
  const db = new DatabaseSync(path); db.exec('PRAGMA foreign_keys = ON;');
  const realRecordCount = db.prepare('SELECT COUNT(*) AS n FROM staged_record WHERE source_row BETWEEN 3 AND 12').get().n;
  if (realRecordCount !== 10) { db.close(); throw new Error(`Expected exactly 10 reviewed pilot rows; found ${realRecordCount}.`); }
  const prior = db.prepare('SELECT COUNT(*) AS n FROM promotion_log WHERE staged_record_id IN (SELECT id FROM staged_record WHERE source_row BETWEEN 3 AND 12)').get().n;
  const priorDecisions = db.prepare('SELECT COUNT(*) AS n FROM field_review_decision WHERE staged_field_id IN (SELECT f.id FROM staged_field f JOIN staged_record r ON r.id=f.staged_record_id WHERE r.source_row BETWEEN 3 AND 12)').get().n;
  if (prior || priorDecisions) { db.close(); throw new Error('Pilot review or promotion history already exists; refusing a duplicate promotion run.'); }
  const summary = { materialsCreated: 0, materialsReused: 0, variantsCreated: 0, aliasesCreated: 0, claimsCreated: 0, narrativesCreated: 0, assessmentsCreated: 0, decisionsCreated: 0, eventsCreated: 0, sourceLinksCreated: 0, rowSummaries: 0 };
  try {
    db.exec('BEGIN IMMEDIATE;');
    for (const decision of decisions) {
      const record = db.prepare('SELECT * FROM staged_record WHERE source_row=?').get(decision.row);
      const fields = getFields(db, record.id); ensureFieldShape(fields, decision.row);
      db.prepare('INSERT INTO review_decision(staged_record_id,decision,reviewer,notes) VALUES (?,?,?,?)')
        .run(record.id, 'approved', REVIEWER, 'Row-level authorization for partial promotion; field-level decisions remain authoritative.');
      db.prepare("UPDATE staged_record SET validation_status='human_approved' WHERE id=?").run(record.id);
      // Every source field is explicitly reviewed; price and supplier stay outside canonical data.
      for (const field of [fields.alias, fields.canonical, fields.quality, fields.tier, fields.size, fields.narrative, fields.market]) { decide(db, field, 'approved', 'Approved field-level P1A-F decision.'); summary.decisionsCreated += 1; }
      for (const field of [fields.price, fields.supplier]) { decide(db, field, 'retained_staged', 'Supplier identity and price unit/MOQ remain unresolved.'); summary.decisionsCreated += 1; }
      const raw = JSON.parse(record.raw_record_json);
      const sourceId = Number(db.prepare('INSERT INTO source(source_type,name,observed_on,verification_status,evidence_strength,notes) VALUES (?,?,?,?,?,?)')
        .run('user_upload', `Legacy workbook ${raw.source_file ?? raw.sourceFile ?? 'source.xlsx'} / ${record.source_sheet} row ${record.source_row}`, null, 'unverified', 'low', 'P1A-F provenance source; no supplier verification.').lastInsertRowid);
      let material = db.prepare('SELECT id FROM material WHERE canonical_name=?').get(decision.canonical);
      if (!material) {
        const materialId = Number(db.prepare('INSERT INTO material(canonical_name,material_family,natural_status,description) VALUES (?,?,?,?)')
          .run(decision.canonical, decision.family, 'unknown', 'Created through approved P1A-F pilot promotion; source-specific characteristics remain variants/claims.').lastInsertRowid);
        material = { id: materialId }; summary.materialsCreated += 1;
        summary.eventsCreated += 1; summary.sourceLinksCreated += 2;
        promoteEvent(db, record.id, 'material', materialId, 'canonical_name', 'create', `Approved canonical mapping to ${decision.canonical}.`, [fields.alias, fields.canonical]);
      } else summary.materialsReused += 1;
      const rawTier = fields.tier.raw_value;
      const variantCode = `P1AF-${decision.canonical.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toUpperCase()}-R${decision.row}`;
      const variantId = Number(db.prepare('INSERT INTO material_variant(material_id,variant_code,color_description,optical_features,size_range_mm,treatment_disclosure,reproducibility,commercial_tier,source_tier_label,provenance_source_id,verification_status,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
        .run(material.id, variantCode, decision.color ?? null, decision.optical ?? null, fields.size.raw_value, decision.treatment ?? null, 'limited_lot', 'accessible', rawTier, sourceId, 'unverified', `Display/trade terminology: ${decision.display}. Raw source label: ${fields.alias.raw_value}. Quality source text: ${fields.quality.raw_value}`).lastInsertRowid);
      summary.variantsCreated += 1; summary.eventsCreated += 1; summary.sourceLinksCreated += 5;
      promoteEvent(db, record.id, 'material_variant', variantId, null, 'create', 'Approved variant, size and accessible commercial tier.', [fields.alias, fields.canonical, fields.quality, fields.size, fields.tier]);
      if (decision.alias) {
        const aliasId = Number(db.prepare('INSERT INTO material_alias(material_id,alias_raw,normalized_alias,source_id,review_status,confidence,notes) VALUES (?,?,?,?,?,?,?)')
          .run(material.id, decision.alias, normalized(decision.alias), sourceId, 'reviewed', 'medium', `Approved P1A-F identity alias from source row ${record.source_row}.`).lastInsertRowid);
        summary.aliasesCreated += 1; summary.eventsCreated += 1; summary.sourceLinksCreated += 1;
        promoteEvent(db, record.id, 'material_alias', aliasId, 'alias_raw', 'create', 'Approved material identity alias.', [fields.alias]);
      }
      if (decision.origin) {
        const claimId = Number(db.prepare('INSERT INTO material_claim(material_id,claim_field,raw_value,normalized_value,source_id,verification_status,confidence,notes) VALUES (?,?,?,?,?,?,?,?)')
          .run(material.id, 'origin', decision.origin, decision.origin, sourceId, 'unverified', 'low', `Source-derived from raw label ${fields.alias.raw_value}; not independently verified.`).lastInsertRowid);
        summary.claimsCreated += 1; summary.eventsCreated += 1; summary.sourceLinksCreated += 1;
        promoteEvent(db, record.id, 'material_claim', claimId, 'origin', 'create', 'Approved source-derived, unverified India origin claim.', [fields.alias]);
      }
      const narrativeId = Number(db.prepare('INSERT INTO material_narrative(material_id,narrative_type,statement,source_id,source_context,confidence,notes) VALUES (?,?,?,?,?,?,?)')
        .run(material.id, 'brand_story', fields.narrative.raw_value, sourceId, 'Legacy workbook energy/meaning field.', 'low', 'Narrative only; not medical, scientific or guaranteed efficacy.').lastInsertRowid);
      summary.narrativesCreated += 1; summary.eventsCreated += 1; summary.sourceLinksCreated += 1;
      promoteEvent(db, record.id, 'material_narrative', narrativeId, 'statement', 'create', 'Approved as non-factual legacy narrative.', [fields.narrative]);
      const assessmentId = Number(db.prepare('INSERT INTO market_assessment(subject_type,subject_id,target_market,assessment_text,analyst,basis_notes,confidence) VALUES (?,?,?,?,?,?,?)')
        .run('material_variant', variantId, 'EU', fields.market.raw_value, REVIEWER, `Internal legacy-workbook assessment; source row ${record.source_row}; not market evidence.`, 'low').lastInsertRowid);
      summary.assessmentsCreated += 1; summary.eventsCreated += 1; summary.sourceLinksCreated += 1;
      promoteEvent(db, record.id, 'market_assessment', assessmentId, 'assessment_text', 'create', 'Approved as low-confidence internal market assessment.', [fields.market]);
      db.prepare('INSERT INTO promotion_log(staged_record_id,canonical_entity,canonical_id,promoted_by,provenance_note) VALUES (?,?,?,?,?)')
        .run(record.id, 'partial_promotion_summary', variantId, REVIEWER, 'PARTIALLY_PROMOTED: identity/variant/narrative/market assessment promoted; price and supplier retained_staged.');
      summary.rowSummaries += 1;
    }
    db.exec('COMMIT;'); db.close(); return summary;
  } catch (error) { try { db.exec('ROLLBACK;'); } catch {} db.close(); throw error; }
}

if (process.argv[1]?.endsWith('promote-reviewed-pilot.mjs')) {
  const path = process.argv[2];
  if (!path) throw new Error('Usage: node promote-reviewed-pilot.mjs DATABASE.sqlite');
  console.log(JSON.stringify(promoteReviewedPilot(path), null, 2));
}
