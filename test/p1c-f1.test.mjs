import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { initialize, validate } from '../scripts/crystal-db.mjs';
import { importP1cKnowledge } from '../scripts/import-p1c-knowledge.mjs';

const seeds = join(process.cwd(), 'data', 'p1c-knowledge-seeds.jsonl');
function withDb(fn) { const dir = mkdtempSync(join(process.cwd(), 'test', '.tmp-crystal-p1cf1-')); const path = join(dir, 'test.sqlite'); try { initialize(path); fn(path); } finally { try { rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {} } }

test('P1C-F1 stores Quiet Complexity as an independent project-level principle', () => withDb(path => {
  const before = new DatabaseSync(path);
  const refs = before.prepare('SELECT COUNT(*) AS n FROM design_reference').get().n;
  const preferences = before.prepare('SELECT COUNT(*) AS n FROM preference_evidence').get().n;
  const patterns = before.prepare('SELECT COUNT(*) AS n FROM design_pattern').get().n;
  const framedDescription = before.prepare("SELECT description FROM design_pattern WHERE name='Framed Mineral'").get().description;
  const markets = before.prepare('SELECT COUNT(*) AS n FROM market_evidence').get().n; before.close();
  importP1cKnowledge(path, seeds); importP1cKnowledge(path, seeds);
  const db = new DatabaseSync(path);
  const principle = db.prepare("SELECT * FROM design_principle WHERE principle_key='PRINCIPLE-QUIET-COMPLEXITY'").get();
  assert.equal(principle.name, 'Quiet Complexity'); assert.equal(principle.author_type, 'assistant_synthesis');
  assert.equal(principle.status, 'candidate'); assert.equal(principle.confidence, 'low');
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM design_principle WHERE principle_key='PRINCIPLE-QUIET-COMPLEXITY'").get().n, 1);
  assert.throws(() => db.prepare('INSERT INTO design_principle(principle_key,name,statement,principle_type,status,confidence,author_type) VALUES (?,?,?,?,?,?,?)').run(principle.principle_key,'Duplicate','x','general','candidate','low','assistant_synthesis'));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM design_reference').get().n, refs);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM preference_evidence').get().n, preferences + 9);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM design_pattern').get().n, patterns + 18);
  assert.equal(db.prepare("SELECT description FROM design_pattern WHERE name='Framed Mineral'").get().description, framedDescription);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM design_pattern WHERE name='Quiet Complexity'").get().n, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM market_evidence').get().n, markets);
  db.close(); assert.deepEqual(validate(path), []);
}));
