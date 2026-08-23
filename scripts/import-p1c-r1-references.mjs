import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

const EXPECTED = new Set(['H01','H05','H06','H07','H08','H09','H10','H11','H12','H14','H15','H16','H17','H18','H19']);
const THEMES = new Set(['Mountain','Ocean','Forest','Sunrise','Starlight','Glacier']);
const RELEVANCE = new Set(['low','moderate','strong']);
const SEMANTIC_NOT_PATTERNS = new Set(['Accessory Language','Natural One-of-One','Reusable Design Grammar']);

function loadSeeds(path) {
  const rows = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(rows) || rows.length !== EXPECTED.size) throw new Error('P1C-R1 requires exactly the approved 15-reference batch.');
  const seen = new Set();
  for (const row of rows) {
    if (!EXPECTED.has(row.reference_key) || seen.has(row.reference_key)) throw new Error(`Invalid or duplicate P1C-R1 seed key: ${row.reference_key}`);
    seen.add(row.reference_key);
    if (row.record_status !== 'real' || row.evidence_status !== 'user_supplied' || !Array.isArray(row.image_files) || !row.user_preference?.summary) throw new Error(`Incomplete P1C-R1 seed: ${row.reference_key}`);
    for (const link of row.theme_links ?? []) if (!THEMES.has(link.theme)) throw new Error(`Unsupported theme in ${row.reference_key}: ${link.theme}`);
  }
  return rows;
}

function sourceName(key) { return `P1C-R1 historical reference seed | ${key}`; }
function provenance(row) { return `P1C-R1 | external_seed_key=${row.reference_key} | historical_backfill | record_status=real | evidence_status=user_supplied`; }

export function importP1cR1(dbPath, seedPath) {
  const rows = loadSeeds(seedPath); const db = new DatabaseSync(dbPath); db.exec('PRAGMA foreign_keys = ON;');
  const out = { referencesCreated: 0, referencesReused: 0, preferencesCreated: 0, assessmentsCreated: 0, patternLinksCreated: 0, themeLinksCreated: 0, patternsCreated: 0, patternsReused: 0, semanticRemappings: 0, materialWrites: 0, marketEvidenceCreated: 0, fakeLocalPaths: 0 };
  try {
    db.exec('BEGIN');
    for (const row of rows) {
      let source = db.prepare('SELECT id FROM source WHERE name=?').get(sourceName(row.reference_key));
      if (!source) {
        const id = db.prepare('INSERT INTO source(source_type,name,verification_status,evidence_strength,notes) VALUES (?,?,?,?,?)')
          .run('user_upload', sourceName(row.reference_key), 'unverified', 'low', `${provenance(row)} | image_files=${JSON.stringify(row.image_files)}`).lastInsertRowid;
        source = { id };
      }
      let reference = db.prepare('SELECT id,reference_key FROM design_reference WHERE source_id=?').get(source.id);
      if (!reference) {
        const notes = `${provenance(row)} | image_files=${JSON.stringify(row.image_files)} | No local path, URL, or image hash was supplied.`;
        const id = db.prepare('INSERT INTO design_reference(reference_type,source_id,record_status,evidence_status,notes) VALUES (?,?,?,?,?)')
          .run('uploaded_image', source.id, 'real', 'user_supplied', notes).lastInsertRowid;
        reference = db.prepare('SELECT id,reference_key FROM design_reference WHERE id=?').get(id); out.referencesCreated += 1;
      } else out.referencesReused += 1;
      const preferenceContext = `${provenance(row)} | user_preference`;
      if (!db.prepare('SELECT id FROM preference_evidence WHERE design_reference_id=? AND source_context=?').get(reference.id, preferenceContext)) {
        db.prepare('INSERT INTO preference_evidence(design_reference_id,evidence_type,statement,source_context) VALUES (?,?,?,?)')
          .run(reference.id, row.user_preference.sentiment === 'like' ? 'explicit_like' : 'explicit_dislike', row.user_preference.summary, preferenceContext);
        out.preferencesCreated += 1;
      }
      const nonPatterns = (row.design_patterns ?? []).filter(name => SEMANTIC_NOT_PATTERNS.has(name));
      if (row.assistant_assessment?.summary && !db.prepare('SELECT id FROM design_assessment WHERE design_reference_id=?').get(reference.id)) {
        db.prepare('INSERT INTO design_assessment(design_reference_id,reusable_patterns,assistant_assessment) VALUES (?,?,?)')
          .run(reference.id, nonPatterns.length ? `Conceptual terms retained as assessment notes: ${nonPatterns.join('; ')}` : null, row.assistant_assessment.summary);
        out.assessmentsCreated += 1;
      }
      for (const name of row.design_patterns ?? []) {
        if (SEMANTIC_NOT_PATTERNS.has(name)) { out.semanticRemappings += 1; continue; }
        const pattern = db.prepare('SELECT id FROM design_pattern WHERE name=?').get(name);
        if (!pattern) throw new Error(`Supplied pattern lacks a canonical P1C seed: ${name}`);
        const result = db.prepare('INSERT OR IGNORE INTO design_reference_pattern(design_reference_id,design_pattern_id,relevance,notes) VALUES (?,?,?,?)')
          .run(reference.id, pattern.id, 'strong', `${provenance(row)} | explicitly supplied pattern name`);
        if (result.changes) out.patternLinksCreated += 1; else out.patternsReused += 1;
      }
      for (const link of row.theme_links ?? []) {
        const mapped = link.relevance === 'primary' ? 'strong' : link.relevance;
        if (!RELEVANCE.has(mapped)) throw new Error(`Unsupported theme relevance in ${row.reference_key}: ${link.relevance}`);
        const result = db.prepare('INSERT OR IGNORE INTO design_reference_theme(design_reference_id,theme,relevance,notes) VALUES (?,?,?,?)')
          .run(reference.id, link.theme, mapped, link.relevance === mapped ? `${provenance(row)} | explicitly supplied` : `${provenance(row)} | source relevance=${link.relevance}; mapped to strong by current controlled vocabulary`);
        if (result.changes) out.themeLinksCreated += 1;
      }
    }
    db.exec('COMMIT');
  } catch (error) { try { db.exec('ROLLBACK'); } catch {} throw error; } finally { db.close(); }
  return out;
}

if (process.argv[1]?.endsWith('import-p1c-r1-references.mjs')) {
  if (process.argv.length !== 4) throw new Error('Usage: import-p1c-r1-references.mjs DATABASE.sqlite SEEDS.json');
  console.log(JSON.stringify(importP1cR1(process.argv[2], process.argv[3])));
}
