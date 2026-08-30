import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { importHistoricalEarlyCStructured } from '../scripts/import-p2a-historical-early-c-structured.mjs';

const root = process.cwd();
const input = join(root, 'inputs', 'p2a-gpt-historical-early-c-structured-completion-20260830.json');
const semantic = join(root, 'inputs', 'p2a-gpt-historical-early-c-analysis-and-regroup-plan.json');

test('early-C structured completion materializes exact observations and synthesis once, then replays', () => {
  const dir = mkdtempSync(join(root, 'test', '.tmp-early-c-structured-')); const dbPath = join(dir, 'fixture.sqlite');
  copyFileSync(join(root, 'data', 'crystal-design.sqlite'), dbPath);
  try {
    const beforeDb = new DatabaseSync(dbPath); const beforeObs = Number(beforeDb.prepare('SELECT COUNT(*) n FROM image_visual_observation').get().n); const beforeAssertions = Number(beforeDb.prepare('SELECT COUNT(*) n FROM design_reference_synthesis_assertion').get().n); const beforeSources = Number(beforeDb.prepare('SELECT COUNT(*) n FROM design_reference_synthesis_source').get().n); beforeDb.close();
    const first = importHistoricalEarlyCStructured(dbPath, semantic, input);
    assert.equal(first.created_observations + first.reused_observations, 98); assert.equal(first.created_assertions + first.reused_assertions, 18); assert.equal(first.created_sources + first.reused_sources, 98);
    assert.equal(first.assets_covered, 34);
    const db = new DatabaseSync(dbPath); db.exec('PRAGMA foreign_keys=ON');
    assert.equal(db.prepare('SELECT COUNT(*) n FROM image_visual_observation').get().n, beforeObs + first.created_observations);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM design_reference_synthesis_assertion').get().n, beforeAssertions + first.created_assertions);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM design_reference_synthesis_source').get().n, beforeSources + first.created_sources);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM image_visual_observation WHERE observation_type='alternate_view_same_reference'").get().n, 16);
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok'); assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []); db.close();
    const replay = importHistoricalEarlyCStructured(dbPath, semantic, input);
    assert.deepEqual([replay.created_observations, replay.created_assertions, replay.created_sources], [0, 0, 0]);
    assert.deepEqual([replay.reused_observations, replay.reused_assertions, replay.reused_sources], [98, 18, 98]);
  } finally { try { rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {} }
});
