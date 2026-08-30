import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const inputPath = process.argv[2] ?? 'inputs/p2c-gpt-sourcing-discovery-20260830.json';
const dbPath = process.argv[3] ?? 'data/crystal-design.sqlite';
const marker = 'P2C-GPT-SOURCING-DISCOVERY-V1';
const json = v => JSON.stringify(v ?? null);

export function importP2c(dbPathArg, input) {
  if (input.contract_version !== marker || input.producer_type !== 'assistant_model') throw new Error('Invalid P2C contract/provenance');
  const db = new DatabaseSync(dbPathArg); db.exec('PRAGMA foreign_keys=ON');
  const out = { sources: { created: 0, reused: 0 }, suppliers: { created: 0, reused: 0 }, staged_catalog_offers: { created: 0, reused: 0 }, staged_marketplace: { created: 0, reused: 0 }, canonical_supplier_offers: { created: 0, reused: 0 }, staged_ids: [] };
  try {
    db.exec('BEGIN IMMEDIATE'); const sourceIds = new Map(); const supplierIds = new Map();
    for (const c of input.supplier_candidates ?? []) {
      const sourceMatches = db.prepare('SELECT id FROM source WHERE source_type=? AND name=? AND source_url=?').all(c.source_type, c.name, c.supplier_url);
      if (sourceMatches.length > 1) throw new Error(`Ambiguous source: ${c.candidate_key}`);
      let sid;
      if (sourceMatches.length) { sid = Number(sourceMatches[0].id); out.sources.reused++; }
      else { sid = Number(db.prepare('INSERT INTO source(source_type,name,source_url,geography,observed_on,verification_status,evidence_strength,notes) VALUES (?,?,?,?,?,?,?,?)').run(c.source_type,c.name,c.supplier_url,c.geography,input.observed_on,c.verification_status,c.evidence_strength,`${marker} | candidate=${c.candidate_key} | capability_claims=${json(c.capability_claims)} | source claims remain unverified facts.`).lastInsertRowid); out.sources.created++; }
      sourceIds.set(c.candidate_key, sid);
      const sm = db.prepare('SELECT id FROM supplier WHERE supplier_name=? AND supplier_url=?').all(c.name,c.supplier_url);
      if (sm.length > 1) throw new Error(`Ambiguous supplier: ${c.candidate_key}`);
      let spid;
      if (sm.length) { spid = Number(sm[0].id); out.suppliers.reused++; }
      else { spid = Number(db.prepare('INSERT INTO supplier(source_id,supplier_name,geography,supplier_url,verification_status,notes) VALUES (?,?,?,?,?,?)').run(sid,c.name,c.geography,c.supplier_url,c.verification_status,`${marker} | candidate=${c.candidate_key} | capability_claims=${json(c.capability_claims)} | no MOQ/stock/shipping/quality inferred.`).lastInsertRowid); out.suppliers.created++; }
      supplierIds.set(c.candidate_key, spid);
    }
    let batch = db.prepare('SELECT id FROM import_batch WHERE source_description=?').get(`${marker} | observed_on=${input.observed_on}`);
    let batchId = batch ? Number(batch.id) : Number(db.prepare('INSERT INTO import_batch(source_file,source_format,source_description,imported_by,batch_status) VALUES (?,?,?,?,?)').run(inputPath,'other',`${marker} | observed_on=${input.observed_on}`,input.producer_id,'ready_for_review').lastInsertRowid);
    const existing = key => db.prepare('SELECT id FROM staged_record WHERE import_batch_id=? AND raw_record_json=?').get(batchId, json(key));
    const addStage = (raw, warning, marketplace=false, sourceRow=0) => {
      const found = existing(raw); if (found) { marketplace ? out.staged_marketplace.reused++ : out.staged_catalog_offers.reused++; out.staged_ids.push(Number(found.id)); return { id: Number(found.id), created: false }; }
      const id = Number(db.prepare('INSERT INTO staged_record(import_batch_id,source_sheet,source_row,raw_record_json,target_entity,validation_status,warning_summary) VALUES (?,?,?,?,?,?,?)').run(batchId,'p2c-gpt-sourcing-discovery',sourceRow,json(raw),'supplier_offer','review_required',warning).lastInsertRowid);
      marketplace ? out.staged_marketplace.created++ : out.staged_catalog_offers.created++; out.staged_ids.push(id); return { id, created: true };
    };
    for (const [index, offer] of (input.catalog_offer_claims ?? []).entries()) {
      const stage = addStage(offer, 'Public catalog claim staged; exact canonical material/component identity is not established. Seller label, VAT basis and unit require review.', false, index + 1);
      if (stage.created) for (const [field, value] of Object.entries(offer)) db.prepare('INSERT INTO staged_field(staged_record_id,source_column,raw_value,normalized_value,target_entity,target_field,field_status,warning_or_error) VALUES (?,?,?,?,?,?,?,?)').run(stage.id, field, typeof value === 'string' ? value : json(value), typeof value === 'string' ? value : json(value), 'supplier_offer', field, 'review_required', 'GPT source claim; no fuzzy canonical promotion.');
    }
    for (const [index, block] of (input.marketplace_discovery_only ?? []).entries()) addStage(block, 'Marketplace discovery only; no canonical supplier or offer identity permitted.', true, 1000 + index);
    db.exec('COMMIT'); return out;
  } catch (e) { try { db.exec('ROLLBACK'); } catch {} throw e; } finally { db.close(); }
}

if (process.argv[1]?.endsWith('import-p2c-sourcing-discovery.mjs')) console.log(JSON.stringify(importP2c(dbPath, JSON.parse(fs.readFileSync(inputPath,'utf8'))), null, 2));
