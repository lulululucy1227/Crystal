import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DEFAULT_DB = resolve(ROOT, 'data', 'crystal-design.sqlite');
const PHASE = 'P2A-HISTORICAL-CANONICAL-REGROUP-CORRECTION';
const MARKER = `P2A-HISTORICAL-CANONICAL-REGROUP-CORRECTION`;

const SPLITS = [
  { from: 'REF-000003', survivor: 'EARLY-C01', children: [['EARLY-C01', 'IMG_7654.PNG', true], ['EARLY-C02', 'IMG_7655.PNG', false], ['EARLY-C03', 'IMG_7656.PNG', false]] },
  { from: 'REF-000004', survivor: 'EARLY-C05', children: [['EARLY-C04', 'IMG_7661.PNG', false], ['EARLY-C05', 'IMG_7662.PNG', true], ['EARLY-C06', 'IMG_7663.PNG', false], ['EARLY-C07', 'IMG_7664.PNG', false]] }
];

const MOVES = [
  ['IMG_7678.PNG', 'REF-000008', 'REF-000009'],
  ['IMG_7688.PNG', 'REF-000011', 'REF-000012'],
  ['IMG_7690.PNG', 'REF-000012', 'REF-000013'],
  ['IMG_7696.PNG', 'REF-000014', 'REF-000015'],
  ['IMG_7698.PNG', 'REF-000015', 'REF-000016']
];

function open(path) {
  const db = new DatabaseSync(resolve(path));
  db.exec('PRAGMA foreign_keys = ON');
  return db;
}

function refByKey(db, key) {
  const row = db.prepare('SELECT * FROM design_reference WHERE reference_key=?').get(key);
  if (!row) throw new Error(`Required reference is missing: ${key}`);
  return row;
}

function assetLink(db, filename) {
  const row = db.prepare(`SELECT a.id AS asset_id, a.original_filename, ri.id AS link_id, ri.design_reference_id, r.reference_key
    FROM image_asset a JOIN design_reference_image ri ON ri.image_asset_id=a.id JOIN design_reference r ON r.id=ri.design_reference_id
    WHERE a.original_filename=?`).get(filename);
  if (!row) throw new Error(`Required asset link is missing: ${filename}`);
  return row;
}

function appendNote(note, addition) {
  return [note, addition].filter(Boolean).join('\n');
}

function cloneReference(db, source, group, filename) {
  const notes = appendNote(source.notes, `${MARKER} | regroup_child=${group} | derived_from=${source.reference_key} | asset=${filename}`);
  const id = Number(db.prepare(`INSERT INTO design_reference
    (reference_type,source_id,local_image_path,source_url,brand_or_designer,reference_date,relevance_score,notes,record_status,evidence_status,source_url_normalized,image_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      source.reference_type, source.source_id, source.local_image_path, source.source_url, source.brand_or_designer,
      source.reference_date, source.relevance_score, notes, source.record_status, source.evidence_status,
      source.source_url_normalized, source.image_hash
    ).lastInsertRowid);
  return db.prepare('SELECT * FROM design_reference WHERE id=?').get(id);
}

function updateSurvivor(db, source, group, filename, quarantine = null) {
  const additions = [`${MARKER} | regroup_child=${group} | asset=${filename}`];
  if (quarantine) additions.push(`${MARKER} | legacy_reference_level_relations_quarantined=${quarantine} | no propagation to split children; review_required`);
  db.prepare('UPDATE design_reference SET notes=? WHERE id=?').run(appendNote(source.notes, additions.join('\n')), source.id);
  return db.prepare('SELECT * FROM design_reference WHERE id=?').get(source.id);
}

function alreadyApplied(db) {
  const groups = db.prepare(`SELECT COUNT(*) AS n FROM design_reference WHERE notes LIKE ?`).get(`%${MARKER} | regroup_child=EARLY-C%`).n;
  return Number(groups) === 7 && MOVES.every(([filename,,to]) => assetLink(db, filename).reference_key === to);
}

export function applyHistoricalCanonicalRegroup(path = DEFAULT_DB) {
  const db = open(path);
  try {
    if (alreadyApplied(db)) return { phase: PHASE, status: 'already_applied', assetMoves: MOVES.map(([filename, from, to]) => ({ filename, from, to })) };
    const plan = { splits: [], assetMoves: MOVES.map(([filename, from, to]) => ({ filename, from, to })), quarantinedRelations: [
      { referenceKey: 'REF-000003', identities: ['preference_evidence:12', 'design_assessment:3', 'design_reference_pattern:1'] },
      { referenceKey: 'REF-000004', identities: ['preference_evidence:13', 'design_reference_theme:3', 'design_reference_theme:4'] }
    ] };
    db.exec('BEGIN IMMEDIATE');
    try {
      for (const split of SPLITS) {
        const source = refByKey(db, split.from);
        const sourceLinks = split.children.map(([, filename]) => assetLink(db, filename));
        for (const link of sourceLinks) if (link.design_reference_id !== source.id) throw new Error(`${link.original_filename} is not linked to ${split.from}`);
        const quarantine = split.from === 'REF-000003'
          ? 'preference_evidence:12,design_assessment:3,design_reference_pattern:1'
          : 'preference_evidence:13,design_reference_theme:3,design_reference_theme:4';
        const childResult = [];
        for (const [group, filename, survives] of split.children) {
          const link = assetLink(db, filename);
          const target = survives ? updateSurvivor(db, source, group, filename, quarantine) : cloneReference(db, source, group, filename);
          db.prepare('UPDATE design_reference_image SET design_reference_id=?, display_order=0 WHERE id=?').run(target.id, link.link_id);
          childResult.push({ group, filename, referenceKey: target.reference_key, survivingReference: Boolean(survives) });
        }
        plan.splits.push({ from: split.from, children: childResult });
      }
      for (const [filename, from, to] of MOVES) {
        const link = assetLink(db, filename);
        if (link.reference_key !== from) throw new Error(`${filename} expected at ${from}, found ${link.reference_key}`);
        const target = refByKey(db, to);
        const next = Number(db.prepare('SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order FROM design_reference_image WHERE design_reference_id=?').get(target.id).next_order);
        db.prepare('UPDATE design_reference_image SET design_reference_id=?, display_order=? WHERE id=?').run(target.id, next, link.link_id);
      }
      const integrity = db.prepare('PRAGMA integrity_check').get().integrity_check;
      const foreignKeys = db.prepare('PRAGMA foreign_key_check').all();
      if (integrity !== 'ok' || foreignKeys.length) throw new Error(`Integrity verification failed: ${integrity}; foreign keys=${foreignKeys.length}`);
      db.exec('COMMIT');
      return { phase: PHASE, status: 'applied', ...plan };
    } catch (error) {
      try { db.exec('ROLLBACK'); } catch {}
      throw error;
    }
  } finally { db.close(); }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = applyHistoricalCanonicalRegroup(process.argv[2] ?? DEFAULT_DB);
  console.log(JSON.stringify(result, null, 2));
}
