import fs from 'node:fs';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const inputPath = process.argv[2] ?? 'inputs/p2b-gpt-europe-market-baseline-20260830.json';
const dbPath = process.argv[3] ?? 'data/crystal-design.sqlite';

const stable = value => JSON.stringify(value, Object.keys(value ?? {}).sort());
const eq = (a, b) => (a ?? null) === (b ?? null);
const hash = value => crypto.createHash('sha256').update(stable(value)).digest('hex');

export function importP2b(dbPathArg, input) {
  if (input.contract_version !== 'P2B-GPT-MARKET-EVIDENCE-V1') throw new Error('Unexpected P2B contract');
  if (input.producer_type !== 'assistant_model' || !input.producer_id) throw new Error('Invalid producer provenance');
  const db = new DatabaseSync(dbPathArg);
  const out = { sources: { created: 0, reused: 0 }, market_evidence: { created: 0, reused: 0 }, market_assessment: { created: 0, reused: 0 }, ids: { sources: [], evidence: [], assessment: [] } };
  try {
    db.exec('BEGIN IMMEDIATE');
    const sourceIds = new Map();
    for (const s of input.sources ?? []) {
      const matches = db.prepare('SELECT * FROM source WHERE source_type=? AND name=? AND (source_url IS ? OR source_url=?)').all(s.source_type, s.name, s.source_url ?? null, s.source_url ?? null);
      if (matches.length > 1) throw new Error(`Ambiguous source identity: ${s.source_key}`);
      let row = matches[0];
      const notes = s.source_claims?.length ? JSON.stringify({ source_key: s.source_key, source_claims: s.source_claims }) : JSON.stringify({ source_key: s.source_key });
      if (!row) {
        const id = db.prepare('INSERT INTO source(source_type,name,source_url,geography,observed_on,verification_status,evidence_strength,notes) VALUES (?,?,?,?,?,?,?,?)').run(s.source_type, s.name, s.source_url ?? null, s.geography ?? null, input.observed_on ?? null, s.verification_status, s.evidence_strength, notes).lastInsertRowid;
        row = { id: Number(id) }; out.sources.created++; out.ids.sources.push(Number(id));
      } else out.sources.reused++;
      sourceIds.set(s.source_key, Number(row.id));
    }
    for (const e of input.market_evidence ?? []) {
      const sourceId = sourceIds.get(e.source_key); if (!sourceId) throw new Error(`Unknown source_key: ${e.source_key}`);
      const params = [sourceId, e.brand ?? null, e.product_name ?? null, e.market ?? null, e.price_currency ?? null, e.price_minor ?? null, input.observed_on, e.claim, e.verification_status, e.evidence_strength, e.notes ?? null];
      const matches = db.prepare('SELECT id FROM market_evidence WHERE source_id=? AND brand IS ? AND product_name IS ? AND market IS ? AND price_currency IS ? AND price_minor IS ? AND observed_on=? AND claim=? AND verification_status=? AND evidence_strength=? AND notes IS ?').all(...params);
      if (matches.length > 1) throw new Error(`Duplicate market evidence identity: ${hash(e)}`);
      if (matches.length) { out.market_evidence.reused++; out.ids.evidence.push(Number(matches[0].id)); }
      else { const id = db.prepare('INSERT INTO market_evidence(source_id,brand,product_name,market,price_currency,price_minor,observed_on,claim,verification_status,evidence_strength,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(...params).lastInsertRowid; out.market_evidence.created++; out.ids.evidence.push(Number(id)); }
    }
    const a = input.assistant_market_assessment;
    if (!a) throw new Error('Missing assistant_market_assessment');
    const basis = `${a.basis_notes}\nImplications:\n${(a.implications ?? []).map(x => `- ${x}`).join('\n')}`;
    const ap = ['other', null, input.target_market, a.assessment_text, input.producer_id, basis, input.observed_on, a.confidence];
    const am = db.prepare('SELECT id FROM market_assessment WHERE subject_type=? AND subject_id IS ? AND target_market=? AND assessment_text=? AND analyst=? AND basis_notes=? AND assessment_date=? AND confidence=?').all(...ap);
    if (am.length > 1) throw new Error('Duplicate market assessment identity');
    if (am.length) { out.market_assessment.reused++; out.ids.assessment.push(Number(am[0].id)); }
    else { const id = db.prepare('INSERT INTO market_assessment(subject_type,subject_id,target_market,assessment_text,analyst,basis_notes,assessment_date,confidence) VALUES (?,?,?,?,?,?,?,?)').run(...ap).lastInsertRowid; out.market_assessment.created++; out.ids.assessment.push(Number(id)); }
    db.exec('COMMIT');
    return out;
  } catch (e) { try { db.exec('ROLLBACK'); } catch {} throw e; } finally { db.close(); }
}

if (process.argv[1]?.endsWith('import-p2b-europe-market-baseline.mjs')) {
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  console.log(JSON.stringify(importP2b(dbPath, input), null, 2));
}
