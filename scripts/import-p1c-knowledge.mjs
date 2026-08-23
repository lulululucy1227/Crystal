import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

const RECORD_STATUSES = new Set(['real', 'demo', 'test_fixture', 'synthetic']);
const EVIDENCE_STATUSES = new Set(['source_confirmed', 'user_supplied', 'assistant_observed', 'external_unverified', 'unknown']);
const PREFERENCE_TYPES = new Set(['explicit_like', 'explicit_dislike', 'explicit_constraint', 'explicit_priority']);
const COMMON = new Set(['seed_key', 'record_type', 'record_status', 'evidence_status', 'notes']);
const PRINCIPLE_TYPES = new Set(['composition', 'material', 'color', 'hardware', 'rhythm', 'visual_identity', 'commercial_design', 'general']);
const PRINCIPLE_LIFECYCLES = new Set(['candidate', 'active', 'deprecated']);
const AUTHOR_TYPES = new Set(['assistant_synthesis', 'user_explicit', 'joint_project_decision']);
const CONFIDENCES = new Set(['low', 'medium', 'high']);
const FIELDS = {
  user_preference: new Set([...COMMON, 'evidence_type', 'title', 'preference_features']),
  design_pattern: new Set([...COMMON, 'name', 'pattern_family', 'description']),
  assistant_design_principle: new Set([...COMMON, 'principle_key', 'name', 'statement', 'rationale', 'principle_type', 'status', 'confidence', 'author_type']),
};

function parseJsonl(filePath) {
  return readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
    let value; try { value = JSON.parse(line); } catch { throw new Error(`Invalid JSONL at line ${index + 1}.`); }
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Record ${index + 1} must be an object.`);
    const allowed = FIELDS[value.record_type];
    if (!allowed) throw new Error(`Unsupported record_type at line ${index + 1}: ${value.record_type}`);
    for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`Unknown key at line ${index + 1}: ${key}`);
    for (const key of ['seed_key', 'record_type', 'record_status', 'evidence_status']) if (!value[key]) throw new Error(`Missing ${key} at line ${index + 1}.`);
    if (!RECORD_STATUSES.has(value.record_status) || !EVIDENCE_STATUSES.has(value.evidence_status)) throw new Error(`Unsupported status at line ${index + 1}.`);
    if (value.record_type === 'user_preference' && (!PREFERENCE_TYPES.has(value.evidence_type) || !value.title || !Array.isArray(value.preference_features))) throw new Error(`Invalid preference seed at line ${index + 1}.`);
    if (value.record_type === 'design_pattern' && (!value.name || !value.pattern_family || !value.description)) throw new Error(`Invalid pattern seed at line ${index + 1}.`);
    if (value.record_type === 'assistant_design_principle' && (!value.principle_key || !value.name || !value.statement || !PRINCIPLE_TYPES.has(value.principle_type) || !PRINCIPLE_LIFECYCLES.has(value.status) || !CONFIDENCES.has(value.confidence) || !AUTHOR_TYPES.has(value.author_type))) throw new Error(`Invalid design-principle seed at line ${index + 1}.`);
    return value;
  });
}

function provenance(seed) {
  return `P1C knowledge seed | seed_key=${seed.seed_key} | record_status=${seed.record_status} | evidence_status=${seed.evidence_status}`;
}

export function importP1cKnowledge(dbPath, jsonlPath) {
  const seeds = parseJsonl(jsonlPath); const seen = new Set();
  for (const seed of seeds) { if (seen.has(seed.seed_key)) throw new Error(`Duplicate seed_key: ${seed.seed_key}`); seen.add(seed.seed_key); }
  const db = new DatabaseSync(dbPath); db.exec('PRAGMA foreign_keys = ON;');
  const result = { preferencesCreated: 0, preferencesReused: 0, patternsCreated: 0, patternsReused: 0, principlesCreated: 0, principlesReused: 0, referencesCreated: 0, assessmentsCreated: 0, marketEvidenceCreated: 0, materialWrites: 0 };
  try {
    db.exec('BEGIN');
    for (const seed of seeds) {
      if (seed.record_type === 'user_preference') {
        const context = provenance(seed);
        const existing = db.prepare('SELECT id FROM preference_evidence WHERE source_context=?').get(context);
        if (existing) { result.preferencesReused += 1; continue; }
        db.prepare('INSERT INTO preference_evidence(evidence_type,statement,rationale,source_context) VALUES (?,?,?,?)')
          .run(seed.evidence_type, seed.title, JSON.stringify({ preference_features: seed.preference_features, notes: seed.notes ?? null }), context);
        result.preferencesCreated += 1;
      } else if (seed.record_type === 'design_pattern') {
        const existing = db.prepare('SELECT id FROM design_pattern WHERE name=?').get(seed.name);
        if (existing) { result.patternsReused += 1; continue; }
        // Description is the verbatim seed label when no narrative definition was supplied.
        db.prepare('INSERT INTO design_pattern(name,pattern_family,description,applicability_notes) VALUES (?,?,?,?)')
          .run(seed.name, seed.pattern_family, seed.description, `P1C seed_key=${seed.seed_key}; ${seed.notes ?? 'No additional definition supplied.'}`);
        result.patternsCreated += 1;
      } else {
        const existing = db.prepare('SELECT id FROM design_principle WHERE principle_key=?').get(seed.principle_key);
        if (existing) { result.principlesReused += 1; continue; }
        db.prepare('INSERT INTO design_principle(principle_key,name,statement,rationale,principle_type,status,confidence,author_type,notes) VALUES (?,?,?,?,?,?,?,?,?)')
          .run(seed.principle_key, seed.name, seed.statement, seed.rationale, seed.principle_type, seed.status, seed.confidence, seed.author_type,
            `${provenance(seed)}${seed.notes ? ` | ${seed.notes}` : ''}`);
        result.principlesCreated += 1;
      }
    }
    db.exec('COMMIT');
  } catch (error) { try { db.exec('ROLLBACK'); } catch {} throw error; } finally { db.close(); }
  return result;
}

if (process.argv[1]?.endsWith('import-p1c-knowledge.mjs')) {
  if (process.argv.length !== 4) throw new Error('Usage: import-p1c-knowledge.mjs DATABASE.sqlite SEEDS.jsonl');
  console.log(JSON.stringify(importP1cKnowledge(process.argv[2], process.argv[3])));
}
