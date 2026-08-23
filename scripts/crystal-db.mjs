import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, 'data', 'crystal-design.sqlite');
const migrationsDir = join(root, 'migrations');

function applyMigrations(db) {
  const applied = new Set(db.prepare('SELECT version FROM schema_migration').all().map(row => row.version));
  const files = readdirSync(migrationsDir).filter(name => /^\d+_.+\.sql$/.test(name)).sort();
  for (const file of files) {
    const version = file.replace(/\.sql$/, '');
    if (applied.has(version)) continue;
    db.exec(readFileSync(join(migrationsDir, file), 'utf8'));
    db.prepare('INSERT INTO schema_migration(version) VALUES (?)').run(version);
  }
}

function openDb(path = dbPath) {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON;');
  return db;
}

function seedEnums(db) {
  const rows = [
    ['theme','Mountain','Mountain',10],['theme','Ocean','Ocean',20],['theme','Forest','Forest',30],['theme','Sunrise','Sunrise',40],['theme','Starlight','Starlight',50],['theme','Glacier','Glacier',60],['theme','Unassigned','Unassigned',99],
    ['shape','round','round',10],['shape','oval','oval',20],['shape','cube','cube',30],['shape','rectangle','rectangle',40],['shape','shield','shield',50],['shape','polygon','polygon',60],['shape','faceted_irregular','faceted irregular',70],['shape','freeform','freeform',80],['shape','disc','disc',90],['shape','column','column',100],['shape','tube','tube',110],['shape','micro_bead','micro bead',120],['shape','other','other',999],
    ['color_role','hero','hero',10],['color_role','anchor','anchor',20],['color_role','atmosphere','atmosphere',30],['color_role','light','light',40],['color_role','shadow','shadow',50],['color_role','accent','accent',60]
  ];
  const stmt = db.prepare('INSERT OR IGNORE INTO reference_enum(domain, code, label, sort_order) VALUES (?, ?, ?, ?)');
  for (const row of rows) stmt.run(...row);
}

function seedSampleData(db) {
  const count = db.prepare('SELECT COUNT(*) AS n FROM material').get().n;
  if (count) return;
  db.exec("INSERT INTO source(source_type,name,source_url,observed_on,verification_status,evidence_strength,notes) VALUES ('internal_note','P0 sample record',NULL,'2026-08-22','verified','high','Demonstration only; not a supplier claim.');");
  const sourceId = db.prepare('SELECT id FROM source WHERE name = ?').get('P0 sample record').id;
  db.prepare('INSERT INTO material(canonical_name,material_family,natural_status,description) VALUES (?,?,?,?)').run('Larimar','gemstone','natural','Sample material demonstrating material/variant separation.');
  const materialId = db.prepare('SELECT id FROM material WHERE canonical_name=?').get('Larimar').id;
  db.prepare("INSERT INTO material_variant(material_id,variant_code,grade_label,color_description,transparency,optical_features,size_range_mm,reproducibility,indicative_currency,indicative_price_minor,provenance_source_id,verification_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").run(materialId,'LARIMAR-COLLECTOR-10MM','collector','blue with white wave pattern','opaque','landscape','10 mm','limited_lot','EUR',2500,sourceId,'partially_verified');
  const variantId = db.prepare('SELECT id FROM material_variant WHERE variant_code=?').get('LARIMAR-COLLECTOR-10MM').id;
  db.prepare("INSERT INTO component(component_code,component_type,material_variant_id,shape_code,size_mm,design_role,visual_weight,source_id,is_one_of_one,notes) VALUES (?,?,?,?,?,?,?,?,?,?)").run('CMP-LARIMAR-ROUND-10','round_bead',variantId,'round','10 mm','hero','heavy',sourceId,0,'Sample usable jewelry component.');
  db.prepare("INSERT INTO component(component_code,component_type,shape_code,size_mm,design_role,visual_weight,hardware_finish,source_id,is_one_of_one,notes) VALUES (?,?,?,?,?,?,?,?,?,?)").run('CMP-SILVER-CAP-BRUSHED','cap','other','5 mm','transition','light','brushed',sourceId,0,'Sample hardware component.');
  const hero = db.prepare('SELECT id FROM component WHERE component_code=?').get('CMP-LARIMAR-ROUND-10').id;
  const cap = db.prepare('SELECT id FROM component WHERE component_code=?').get('CMP-SILVER-CAP-BRUSHED').id;
  db.prepare("INSERT INTO hardware_language(name,hardware_role,metal_material,finish,description) VALUES (?,?,?,?,?)").run('Brushed silver frame','frame','925 silver','brushed','Quiet framing language for a hero mineral.');
  const hardwareId = db.prepare('SELECT id FROM hardware_language WHERE name=?').get('Brushed silver frame').id;
  db.prepare("INSERT INTO focal_assembly(name,focal_intent,assembly_status) VALUES (?,?,?)").run('Ocean focal sample','Frame a singular blue hero mineral without duplicating it.','concept');
  const assemblyId = db.prepare('SELECT id FROM focal_assembly WHERE name=?').get('Ocean focal sample').id;
  db.prepare('INSERT INTO focal_assembly_item(focal_assembly_id,component_id,hardware_language_id,position_role,sequence_order,quantity) VALUES (?,?,?,?,?,?)').run(assemblyId,cap,hardwareId,'left_frame',10,1);
  db.prepare('INSERT INTO focal_assembly_item(focal_assembly_id,component_id,hardware_language_id,position_role,sequence_order,quantity) VALUES (?,?,?,?,?,?)').run(assemblyId,hero,null,'hero',20,1);
  db.prepare('INSERT INTO focal_assembly_item(focal_assembly_id,component_id,hardware_language_id,position_role,sequence_order,quantity) VALUES (?,?,?,?,?,?)').run(assemblyId,cap,hardwareId,'right_frame',30,1);
  db.prepare("INSERT INTO design_pattern(name,pattern_family,description) VALUES (?,?,?)").run('Framed Mineral','focal structure','A hero mineral receives restrained symmetrical framing components.');
  db.prepare("INSERT INTO design_reference(reference_type,source_id,local_image_path,brand_or_designer,relevance_score,notes) VALUES (?,?,?,?,?,?)").run('uploaded_image',sourceId,'references/example-ocean.jpg','Unknown',4,'Image is illustrative; material identification remains uncertain.');
  const refId = db.prepare('SELECT id FROM design_reference WHERE local_image_path=?').get('references/example-ocean.jpg').id;
  db.prepare("INSERT INTO design_reference_observation(design_reference_id,observation_type,observed_value,identification_status,confidence,notes) VALUES (?,?,?,?,?,?)").run(refId,'material','pale blue translucent bead','uncertain','low','Must not be promoted to confirmed Larimar or Aquamarine.');
  db.prepare("INSERT INTO design_assessment(design_reference_id,strengths,weaknesses,reusable_patterns,risks,brand_relevance,possible_theme,assistant_assessment) VALUES (?,?,?,?,?,?,?,?)").run(refId,'Clear focal hierarchy','Too many literal nautical charms would weaken it','Framed Mineral','Over-decoration','High for quiet-luxury Ocean concepts','Ocean','Independent assistant assessment; not user preference.');
  db.prepare("INSERT INTO visual_communication_reference(design_reference_id,composition,background,lighting,presentation_mode,perceived_premium_level,reusable_visual_patterns) VALUES (?,?,?,?,?,?,?)").run(refId,'Centered editorial still life','matte stone gray','soft side light','editorial',4,'Use restrained shadow and generous negative space.');
  db.prepare("INSERT INTO product_concept(name,theme,version_label,status,intent) VALUES (?,?,?,?,?)").run('Ocean','Ocean','v0','research','Natural ocean theme; no bracelet design in P0.');
  const conceptId = db.prepare('SELECT id FROM product_concept WHERE name=?').get('Ocean').id;
  db.prepare("INSERT INTO preference_evidence(design_reference_id,product_concept_id,evidence_type,statement,rationale,source_context) VALUES (?,?,?,?,?,?)").run(refId,conceptId,'explicit_constraint','Avoid a plain single-material bead strand.','Use material and hardware contrast.','User conversation');
  db.prepare("INSERT INTO market_evidence(source_id,brand,product_name,market,price_currency,price_minor,observed_on,claim,verification_status,evidence_strength,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(sourceId,'Sample brand','Sample product','EU','EUR',59900,'2026-08-22','Example price record only; not externally verified.','unverified','low','Shows provenance fields, not market research.');
  db.prepare("INSERT INTO supplier(source_id,supplier_name,geography,verification_status,notes) VALUES (?,?,?,?,?)").run(sourceId,'Sample supplier','Unknown','unverified','Architecture example only.');
  const supplierId = db.prepare('SELECT id FROM supplier WHERE supplier_name=?').get('Sample supplier').id;
  db.prepare("INSERT INTO supplier_offer(supplier_id,material_variant_id,quote_currency,unit_price_minor,unit_label,moq,grade_claim,quoted_on,verification_status) VALUES (?,?,?,?,?,?,?,?,?)").run(supplierId,variantId,'CNY',1800,'per bead',10,'claimed collector grade','2026-08-22','unverified');
  db.prepare("INSERT INTO bom(product_concept_id,version_label,currency,status) VALUES (?,?,?,?)").run(conceptId,'v0','EUR','draft');
  const bomId = db.prepare('SELECT id FROM bom WHERE product_concept_id=?').get(conceptId).id;
  db.prepare('INSERT INTO bom_line(bom_id,component_id,quantity,waste_rate,unit_cost_minor,notes) VALUES (?,?,?,?,?,?)').run(bomId,hero,1,0.05,2500,'Illustrative cost only.');
}

export function initialize(path = dbPath) {
  const db = openDb(path);
  // The first migration creates the migration ledger; forward migrations are never rewritten.
  db.exec(readFileSync(join(migrationsDir, '001_initial.sql'), 'utf8'));
  db.prepare('INSERT OR IGNORE INTO schema_migration(version) VALUES (?)').run('001_initial');
  applyMigrations(db);
  seedEnums(db); seedSampleData(db); db.close();
}

export function validate(path = dbPath) {
  const db = openDb(path);
  const failures = [];
  const tables = ['material','material_variant','component','design_reference','image_asset','design_reference_image','design_reference_pattern','design_reference_theme','design_reference_observation','design_assessment','design_principle','preference_evidence','visual_communication_reference','focal_assembly','focal_assembly_item','market_evidence','market_assessment','supplier','supplier_offer','packaging_option','packaging_supplier_offer','material_alias','material_claim','material_narrative','import_batch','staged_record','staged_field','review_decision','promotion_log','field_review_decision','field_promotion_log','field_promotion_source','product_concept','bom','bom_line'];
  for (const name of tables) if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name)) failures.push(`Missing table: ${name}`);
  const uncertain = db.prepare("SELECT COUNT(*) AS n FROM design_reference_observation WHERE identification_status <> 'confirmed' AND confirmed_material_variant_id IS NOT NULL").get().n;
  if (uncertain) failures.push('Uncertain observation has a confirmed material variant.');
  const oneOfOne = db.prepare("SELECT COUNT(*) AS n FROM material_variant WHERE reproducibility='one_of_one' AND unique_piece_code IS NULL").get().n;
  if (oneOfOne) failures.push('One-of-one variant lacks unique_piece_code.');
  const invalidOffers = db.prepare('SELECT COUNT(*) AS n FROM supplier_offer WHERE material_variant_id IS NULL AND component_id IS NULL').get().n;
  if (invalidOffers) failures.push('Supplier offer lacks a target.');
  const reviewedAliasConflict = db.prepare("SELECT COUNT(*) AS n FROM material_alias WHERE review_status='reviewed' AND (normalized_alias IS NULL OR normalized_alias='')").get().n;
  if (reviewedAliasConflict) failures.push('Reviewed material alias lacks a normalized identity name.');
  const unapprovedPromotion = db.prepare("SELECT COUNT(*) AS n FROM promotion_log p LEFT JOIN review_decision r ON r.staged_record_id=p.staged_record_id AND r.decision='approved' WHERE r.id IS NULL").get().n;
  if (unapprovedPromotion) failures.push('Promotion exists without explicit approval.');
  const missingReferenceKey = db.prepare("SELECT COUNT(*) AS n FROM design_reference WHERE reference_key IS NULL OR trim(reference_key)='' ").get().n;
  if (missingReferenceKey) failures.push('Design reference lacks a stable reference key.');
  const missingAssetKey = db.prepare("SELECT COUNT(*) AS n FROM image_asset WHERE asset_key IS NULL OR trim(asset_key)='' ").get().n;
  if (missingAssetKey) failures.push('Image asset lacks a stable asset key.');
  db.close();
  return failures;
}

export function normalizeIdentityName(value) {
  return String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

export function isSafeMaterialAlias(value) {
  const normalized = normalizeIdentityName(value);
  if (!normalized) return false;
  return !/\b(?:bead|round|oval|faceted|grade|aaa|aa|mm|brazil|ice)\b|\d+\s*mm/i.test(normalized);
}

function createBatch(db, sourceFile, sourceFormat = 'csv', sourceDescription = 'P1A-R staged import') {
  return db.prepare('INSERT INTO import_batch(source_file,source_format,source_description,imported_by,batch_status) VALUES (?,?,?,?,?)')
    .run(sourceFile, sourceFormat, sourceDescription, 'crystal-db import', 'ready_for_review').lastInsertRowid;
}

export function stageMaterialRecord(path, input) {
  const db = openDb(path);
  const batchId = input.importBatchId ?? createBatch(db, input.sourceFile ?? 'controlled-fixture.csv', input.sourceFormat ?? 'manual');
  const rawMaterialName = input.rawMaterialName ?? '';
  const proposedCanonicalName = input.proposedCanonicalName ?? rawMaterialName;
  const aliasSafe = isSafeMaterialAlias(rawMaterialName);
  const warnings = ['Staged data cannot write canonical tables until an explicit human approval exists.', ...(aliasSafe ? [] : ['Material name contains a meaningful descriptor and cannot be auto-stored as an identity alias.'])];
  const validationStatus = aliasSafe && proposedCanonicalName ? 'ready' : 'review_required';
  const result = db.prepare('INSERT INTO staged_record(import_batch_id,source_sheet,source_row,raw_record_json,target_entity,validation_status,warning_summary) VALUES (?,?,?,?,?,?,?)')
    .run(batchId, input.sourceSheet ?? 'CSV', input.sourceRow ?? 1, JSON.stringify(input.rawRecord ?? input), 'material_intake', validationStatus, warnings.join(' '));
  const recordId = Number(result.lastInsertRowid);
  const field = db.prepare('INSERT INTO staged_field(staged_record_id,source_column,raw_value,normalized_value,target_entity,target_field,field_status,warning_or_error) VALUES (?,?,?,?,?,?,?,?)');
  field.run(recordId, input.nameColumn ?? 'material_name', rawMaterialName, normalizeIdentityName(rawMaterialName), 'material_alias', 'alias_raw', aliasSafe ? 'valid' : 'review_required', aliasSafe ? null : warnings.at(-1));
  field.run(recordId, input.nameColumn ?? 'material_name', proposedCanonicalName, normalizeIdentityName(proposedCanonicalName), 'material', 'canonical_name', proposedCanonicalName ? 'valid' : 'error', proposedCanonicalName ? null : 'Canonical material proposal is missing.');
  if (input.sourceTierLabel) field.run(recordId, 'tier', input.sourceTierLabel, input.sourceTierLabel, 'material_variant', 'source_tier_label', 'review_required', 'Commercial tier must remain at variant/offer level.');
  if (input.priceText) field.run(recordId, 'price', input.priceText, input.priceText, 'supplier_offer', 'price_text', 'review_required', 'Price unit, currency, and supplier quote must be reviewed.');
  db.close();
  return { batchId: Number(batchId), recordId, validationStatus, warnings };
}

export function reviewStagedRecord(path, stagedRecordId, decision, reviewer = 'human reviewer', notes = null) {
  if (!['approved','rejected'].includes(decision)) throw new Error('Review decision must be approved or rejected.');
  const db = openDb(path);
  const record = db.prepare('SELECT id FROM staged_record WHERE id=?').get(stagedRecordId);
  if (!record) throw new Error(`Unknown staged record ${stagedRecordId}.`);
  db.prepare('INSERT INTO review_decision(staged_record_id,decision,reviewer,notes) VALUES (?,?,?,?)').run(stagedRecordId, decision, reviewer, notes);
  db.prepare('UPDATE staged_record SET validation_status=? WHERE id=?').run(decision === 'approved' ? 'human_approved' : 'rejected', stagedRecordId);
  db.close();
}

export function reviewStagedField(path, stagedFieldId, decision, reviewer = 'USER', reason = null) {
  if (!['approved','rejected','retained_staged'].includes(decision)) throw new Error('Field review decision must be approved, rejected, or retained_staged.');
  const db = openDb(path);
  const field = db.prepare('SELECT id FROM staged_field WHERE id=?').get(stagedFieldId);
  if (!field) { db.close(); throw new Error(`Unknown staged field ${stagedFieldId}.`); }
  const result = db.prepare('INSERT INTO field_review_decision(staged_field_id,decision,reviewer,reason) VALUES (?,?,?,?)')
    .run(stagedFieldId, decision, reviewer, reason);
  db.close(); return Number(result.lastInsertRowid);
}

export function effectiveFieldReview(path, stagedFieldId) {
  const db = openDb(path);
  const result = db.prepare('SELECT * FROM field_review_decision WHERE staged_field_id=? ORDER BY reviewed_at DESC, id DESC LIMIT 1').get(stagedFieldId) ?? null;
  db.close(); return result;
}

export function recordFieldPromotion(path, input) {
  const db = openDb(path);
  const record = db.prepare('SELECT id FROM staged_record WHERE id=?').get(input.stagedRecordId);
  const sourceFields = [...new Set(input.stagedFieldIds ?? [])];
  if (!record || !sourceFields.length) { db.close(); throw new Error('A promotion needs an existing staged record and at least one staged field.'); }
  const latest = db.prepare('SELECT decision FROM field_review_decision WHERE staged_field_id=? ORDER BY reviewed_at DESC, id DESC LIMIT 1');
  const fieldExists = db.prepare('SELECT id FROM staged_field WHERE id=? AND staged_record_id=?');
  for (const fieldId of sourceFields) {
    if (!fieldExists.get(fieldId, input.stagedRecordId)) { db.close(); throw new Error(`Staged field ${fieldId} does not belong to the stated staged record.`); }
    if (latest.get(fieldId)?.decision !== 'approved') { db.close(); throw new Error(`Staged field ${fieldId} lacks an effective approved decision.`); }
  }
  const result = db.prepare('INSERT INTO field_promotion_log(staged_record_id,canonical_entity,canonical_record_id,canonical_field,operation,promotion_reason,promoted_by) VALUES (?,?,?,?,?,?,?)')
    .run(input.stagedRecordId, input.canonicalEntity, input.canonicalRecordId, input.canonicalField ?? null, input.operation ?? 'create', input.promotionReason, input.promotedBy ?? 'USER');
  const promotionId = Number(result.lastInsertRowid);
  const link = db.prepare('INSERT INTO field_promotion_source(field_promotion_log_id,staged_field_id) VALUES (?,?)');
  for (const fieldId of sourceFields) link.run(promotionId, fieldId);
  db.close(); return promotionId;
}

export function promoteApprovedMaterial(path, stagedRecordId, promotedBy = 'human reviewer') {
  const db = openDb(path);
  const record = db.prepare('SELECT * FROM staged_record WHERE id=?').get(stagedRecordId);
  const approval = db.prepare("SELECT id FROM review_decision WHERE staged_record_id=? AND decision='approved' ORDER BY id DESC LIMIT 1").get(stagedRecordId);
  if (!record || !approval || record.validation_status !== 'human_approved') { db.close(); throw new Error('Canonical promotion requires explicit approval of a staged record.'); }
  const canonical = db.prepare("SELECT raw_value, normalized_value FROM staged_field WHERE staged_record_id=? AND target_entity='material' AND target_field='canonical_name' LIMIT 1").get(stagedRecordId);
  const alias = db.prepare("SELECT raw_value, normalized_value, field_status FROM staged_field WHERE staged_record_id=? AND target_entity='material_alias' AND target_field='alias_raw' LIMIT 1").get(stagedRecordId);
  if (!canonical?.raw_value) { db.close(); throw new Error('Approved record lacks a canonical material name.'); }
  const raw = JSON.parse(record.raw_record_json);
  const sourceId = Number(db.prepare('INSERT INTO source(source_type,name,observed_on,verification_status,evidence_strength,notes) VALUES (?,?,?,?,?,?)')
    .run('user_upload', `Imported batch ${record.import_batch_id}: ${raw.sourceFile ?? 'staged source'}`, new Date().toISOString().slice(0, 10), 'unverified', 'low', `Promotion provenance for staged record ${stagedRecordId}.`).lastInsertRowid);
  const existing = db.prepare('SELECT id FROM material WHERE canonical_name=?').get(canonical.raw_value);
  const materialId = existing?.id ?? Number(db.prepare('INSERT INTO material(canonical_name,material_family,natural_status,description) VALUES (?,?,?,?)')
    .run(canonical.raw_value, 'other', 'unknown', 'Created by explicitly approved staged fixture; identity facts remain sourced claims.').lastInsertRowid);
  db.prepare('INSERT INTO material_claim(material_id,claim_field,raw_value,normalized_value,source_id,verification_status,confidence,notes) VALUES (?,?,?,?,?,?,?,?)')
    .run(materialId, 'identity_name', canonical.raw_value, canonical.normalized_value, sourceId, 'unverified', 'low', `Promoted from staged record ${stagedRecordId}.`);
  if (alias?.raw_value && alias.field_status === 'valid') db.prepare('INSERT OR IGNORE INTO material_alias(material_id,alias_raw,normalized_alias,source_id,review_status,confidence,notes) VALUES (?,?,?,?,?,?,?)')
    .run(materialId, alias.raw_value, alias.normalized_value, sourceId, 'reviewed', 'low', `Approved in staged record ${stagedRecordId}.`);
  db.prepare('INSERT INTO promotion_log(staged_record_id,canonical_entity,canonical_id,promoted_by,provenance_note) VALUES (?,?,?,?,?)')
    .run(stagedRecordId, 'material', materialId, promotedBy, `Source retained through source ${sourceId} and material_claim.`);
  db.prepare("UPDATE staged_record SET validation_status='promoted' WHERE id=?").run(stagedRecordId);
  db.close(); return materialId;
}

function parseCsv(text) {
  const rows = []; let row = []; let value = ''; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]; const next = text[i + 1];
    if (char === '"' && quoted && next === '"') { value += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(value); value = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && next === '\n') i += 1; row.push(value); if (row.some(cell => cell !== '')) rows.push(row); row = []; value = ''; }
    else value += char;
  }
  row.push(value); if (row.some(cell => cell !== '')) rows.push(row); return rows;
}

export function stageMaterialCsv(path, csvPath) {
  const rows = parseCsv(readFileSync(csvPath, 'utf8')); if (rows.length < 2) throw new Error('CSV needs a header row and at least one data row.');
  const headers = rows[0].map(header => header.trim()); const nameIndex = headers.findIndex(header => ['material_name','raw_material_name','英文名称'].includes(header));
  if (nameIndex < 0) throw new Error('CSV needs material_name, raw_material_name, or 英文名称.');
  return rows.slice(1).map((cells, index) => stageMaterialRecord(path, { sourceFile: csvPath, sourceFormat: 'csv', sourceSheet: 'CSV', sourceRow: index + 2, rawMaterialName: cells[nameIndex], proposedCanonicalName: cells[nameIndex], rawRecord: Object.fromEntries(headers.map((header, i) => [header, cells[i] ?? ''])) }));
}

function exportJson(path) {
  const db = openDb();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(x => x.name);
  const out = Object.fromEntries(tables.map(name => [name, db.prepare(`SELECT * FROM ${name}`).all()]));
  db.close(); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, JSON.stringify(out, null, 2));
}

const [command, outputPath] = process.argv.slice(2);
if (command === 'init') { initialize(); console.log(`Initialized ${dbPath}`); }
else if (command === 'validate') { const failures = validate(); if (failures.length) { console.error(failures.join('\n')); process.exitCode=1; } else console.log('Validation passed.'); }
else if (command === 'export-json') { exportJson(resolve(outputPath ?? join(root,'data','export.json'))); console.log('Export complete.'); }
else if (command === 'stage-csv') { console.log(JSON.stringify(stageMaterialCsv(dbPath, resolve(outputPath)), null, 2)); }
else if (command === 'approve-fixture') { reviewStagedRecord(dbPath, Number(outputPath), 'approved', 'CLI fixture reviewer'); console.log(`Approved staged record ${outputPath}.`); }
else if (command === 'promote-fixture') { console.log(`Promoted material ${promoteApprovedMaterial(dbPath, Number(outputPath), 'CLI fixture reviewer')}.`); }
else if (import.meta.url === `file://${process.argv[1]}`) { console.error('Usage: init | validate | export-json [path] | stage-csv file.csv | approve-fixture record-id | promote-fixture record-id'); process.exitCode=1; }
