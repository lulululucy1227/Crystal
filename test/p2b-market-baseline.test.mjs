import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { importP2b } from '../scripts/import-p2b-europe-market-baseline.mjs';

test('P2B market baseline is transactional and idempotent', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p2b-'));
  const dbPath = path.join(dir, 'copy.sqlite'); fs.copyFileSync('backups/p2b-europe-market-baseline-20260830-133127.sqlite', dbPath);
  const input = JSON.parse(fs.readFileSync('inputs/p2b-gpt-europe-market-baseline-20260830.json', 'utf8'));
  const before = new DatabaseSync(dbPath);
  const immutable = Object.fromEntries(['material','material_variant','component','supplier','supplier_offer','image_visual_observation','design_reference','image_asset','market_evidence','market_assessment'].map(t => [t, Number(before.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n)])); before.close();
  const first = importP2b(dbPath, input); assert.deepEqual(first.sources.created, 8); assert.deepEqual(first.market_evidence.created, 12); assert.deepEqual(first.market_assessment.created, 1);
  const second = importP2b(dbPath, input); assert.deepEqual(second.sources.reused, 8); assert.deepEqual(second.market_evidence.reused, 12); assert.deepEqual(second.market_assessment.reused, 1);
  const db = new DatabaseSync(dbPath); for (const [t, n] of Object.entries(immutable)) { if (t === 'market_evidence' || t === 'market_assessment') continue; assert.equal(Number(db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n), n, t); } assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok'); assert.equal(db.prepare('SELECT COUNT(*) n FROM market_evidence').get().n, immutable.market_evidence + 12); assert.equal(db.prepare('SELECT COUNT(*) n FROM market_assessment').get().n, immutable.market_assessment + 1); db.close(); fs.rmSync(dir, { recursive: true, force: true });
});
