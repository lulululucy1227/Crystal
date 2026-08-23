import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { initialize, validate } from '../scripts/crystal-db.mjs';
import { importP1cKnowledge } from '../scripts/import-p1c-knowledge.mjs';

const seeds = join(process.cwd(), 'data', 'p1c-knowledge-seeds.jsonl');
function withDb(fn) { const dir = mkdtempSync(join(process.cwd(), 'test', '.tmp-crystal-p1c-')); const path = join(dir, 'test.sqlite'); try { initialize(path); fn(path); } finally { try { rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {} } }

test('P1C imports only explicit non-reference knowledge and is idempotent', () => withDb(path => {
  const before = new DatabaseSync(path);
  const counts = Object.fromEntries(['design_reference','design_assessment','market_evidence','material','component','supplier','supplier_offer'].map(table => [table, before.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n])); before.close();
  assert.deepEqual(importP1cKnowledge(path, seeds), { preferencesCreated: 9, preferencesReused: 0, patternsCreated: 18, patternsReused: 1, principlesCreated: 1, principlesReused: 0, referencesCreated: 0, assessmentsCreated: 0, marketEvidenceCreated: 0, materialWrites: 0 });
  assert.deepEqual(importP1cKnowledge(path, seeds), { preferencesCreated: 0, preferencesReused: 9, patternsCreated: 0, patternsReused: 19, principlesCreated: 0, principlesReused: 1, referencesCreated: 0, assessmentsCreated: 0, marketEvidenceCreated: 0, materialWrites: 0 });
  const db = new DatabaseSync(path);
  for (const [table, count] of Object.entries(counts)) assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, count);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM preference_evidence WHERE source_context LIKE 'P1C knowledge seed | %'").get().n, 9);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM preference_evidence WHERE source_context LIKE '%record_status=real%evidence_status=user_supplied%' ").get().n, 9);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM design_pattern WHERE name='Framed Mineral'").get().n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM design_reference_theme').get().n, 0);
  db.close(); assert.deepEqual(validate(path), []);
}));
