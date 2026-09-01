import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { importP3rInboxBraceletReferences } from '../scripts/import-p3r-inbox-bracelet-reference-ingestion.mjs';

const root = process.cwd();
const inputPath = join(root, 'inputs', 'p3r-gpt-inbox-bracelet-analysis-20260901.json');
const driveIds = [
  '1A9sWRUlPQwtP809XFEHrZWFYeWfExXjG', '1cuqE6ySWH6QbSl98jB-wUq-WYuGJ8swm', '1XX-jKALrg_x6-t2dqebaco4g8tKBJAC4',
  '14jZra_4Q9xQie-YUyub6CIqmYVXEKB8C', '1uVIeX_pmm9pKZ99ZfHqXD6nisI1g0QDu', '14h8IZAzM9b7fNuEEHcJ2_aPM9eziB1Jz', '1YYTUgobyPatkcCCINuAfw1xO3mktu5HG'
];

function fixture() {
  const dir = mkdtempSync(join(root, 'test', '.tmp-p3r-')); const dbPath = join(dir, 'fixture.sqlite');
  copyFileSync(join(root, 'data', 'crystal-design.sqlite'), dbPath);
  const db = new DatabaseSync(dbPath); db.exec('PRAGMA foreign_keys=ON');
  const assetRows = db.prepare(`SELECT id FROM image_asset WHERE provider='google_drive' AND provider_file_id IN (${driveIds.map(() => '?').join(',')})`).all(...driveIds);
  const referenceRows = db.prepare("SELECT id FROM design_reference WHERE notes LIKE 'P3R-INBOX-BRACELET-REFERENCE-INGESTION%'").all();
  for (const row of referenceRows) db.prepare('DELETE FROM design_reference WHERE id=?').run(row.id);
  for (const row of assetRows) db.prepare('DELETE FROM image_asset WHERE id=?').run(row.id);
  db.close();
  return { dir, dbPath, close() { rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } };
}

test('P3R preserves two 3+4 view groups, holds unresolved assets without invented SHA, and replays without duplicates', () => {
  const f = fixture();
  try {
    const first = importP3rInboxBraceletReferences(f.dbPath, inputPath);
    assert.deepEqual({ references: first.references_created, assets: first.assets_created, links: first.links_created, observations: first.observations_created, syntheses: first.syntheses_created }, { references: 2, assets: 7, links: 7, observations: 0, syntheses: 0 });
    assert.equal(first.intake_blockers.length, 7);
    assert.equal(first.themes_created, 3);
    assert.equal(first.patterns_created, 12);
    const db = new DatabaseSync(f.dbPath); db.exec('PRAGMA foreign_keys=ON');
    const groups = db.prepare("SELECT r.reference_key, COUNT(ri.id) asset_count FROM design_reference r JOIN design_reference_image ri ON ri.design_reference_id=r.id WHERE r.notes LIKE 'P3R-INBOX-BRACELET-REFERENCE-INGESTION%' GROUP BY r.id ORDER BY r.id").all();
    assert.deepEqual(groups.map(row => row.asset_count).sort((a,b) => a-b), [3, 4]);
    assert.equal(db.prepare(`SELECT COUNT(*) n FROM image_asset WHERE provider='google_drive' AND provider_file_id IN (${driveIds.map(() => '?').join(',')}) AND asset_status='unresolved' AND image_hash IS NULL`).get(...driveIds).n, 7);
    assert.equal(db.prepare(`SELECT COUNT(*) n FROM image_visual_observation o JOIN image_asset a ON a.id=o.image_asset_id WHERE a.provider_file_id IN (${driveIds.map(() => '?').join(',')})`).get(...driveIds).n, 0);
    assert.equal(db.prepare(`SELECT COUNT(*) n FROM preference_evidence p JOIN design_reference r ON r.id=p.design_reference_id WHERE r.notes LIKE 'P3R-INBOX-BRACELET-REFERENCE-INGESTION%'`).get().n, 0);
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok'); assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []); db.close();
    const replay = importP3rInboxBraceletReferences(f.dbPath, inputPath);
    assert.deepEqual({ references: replay.references_created, assets: replay.assets_created, links: replay.links_created, themes: replay.themes_created, patterns: replay.patterns_created }, { references: 0, assets: 0, links: 0, themes: 0, patterns: 0 });
  } finally { f.close(); }
});
