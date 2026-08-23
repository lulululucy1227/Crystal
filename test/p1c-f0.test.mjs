import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { initialize, validate } from '../scripts/crystal-db.mjs';

function withDb(fn) {
  const dir = mkdtempSync(join(process.cwd(), 'test', '.tmp-crystal-p1cf0-'));
  const path = join(dir, 'test.sqlite');
  try { initialize(path); fn(path); } finally { try { rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {} }
}

test('P1C-F0 supports structured patterns, multiple themes, and evidence identity', () => withDb(path => {
  const db = new DatabaseSync(path);
  const reference = db.prepare("SELECT id, reference_key, record_status, evidence_status FROM design_reference WHERE local_image_path='references/example-ocean.jpg'").get();
  assert.match(reference.reference_key, /^REF-\d{6}$/);
  assert.equal(reference.record_status, 'synthetic');
  assert.equal(reference.evidence_status, 'unknown');
  const pattern = db.prepare("SELECT id FROM design_pattern WHERE name='Framed Mineral'").get().id;
  const secondPattern = db.prepare('INSERT INTO design_pattern(name,pattern_family,description) VALUES (?,?,?)').run('P1C pattern fixture','fixture','Test-only pattern.').lastInsertRowid;
  db.prepare('INSERT INTO design_reference_pattern(design_reference_id,design_pattern_id,relevance) VALUES (?,?,?)').run(reference.id, pattern, 'strong');
  db.prepare('INSERT INTO design_reference_pattern(design_reference_id,design_pattern_id,relevance) VALUES (?,?,?)').run(reference.id, secondPattern, 'moderate');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM design_reference_pattern WHERE design_reference_id=?').get(reference.id).n, 2);
  assert.throws(() => db.prepare('INSERT INTO design_reference_pattern(design_reference_id,design_pattern_id) VALUES (?,?)').run(reference.id, pattern));
  db.prepare('INSERT INTO design_reference_theme(design_reference_id,theme,relevance) VALUES (?,?,?)').run(reference.id, 'Ocean', 'strong');
  db.prepare('INSERT INTO design_reference_theme(design_reference_id,theme,relevance) VALUES (?,?,?)').run(reference.id, 'Glacier', 'moderate');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM design_reference_theme WHERE design_reference_id=?').get(reference.id).n, 2);
  assert.throws(() => db.prepare('INSERT INTO design_reference_theme(design_reference_id,theme) VALUES (?,?)').run(reference.id, 'Unassigned'));
  const ref2 = db.prepare("INSERT INTO design_reference(reference_type,record_status,evidence_status,source_url,source_url_normalized,image_hash) VALUES (?,?,?,?,?,?)")
    .run('other','test_fixture','assistant_observed','https://example.test/a?utm=x','https://example.test/a','hash-fixture').lastInsertRowid;
  const ref3 = db.prepare("INSERT INTO design_reference(reference_type,record_status,evidence_status,source_url,source_url_normalized,image_hash) VALUES (?,?,?,?,?,?)")
    .run('other','demo','user_supplied','https://example.test/a?utm=y','https://example.test/a','hash-fixture').lastInsertRowid;
  db.prepare('INSERT INTO design_reference_pattern(design_reference_id,design_pattern_id,relevance) VALUES (?,?,?)').run(ref2, pattern, 'low');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM design_reference_pattern WHERE design_pattern_id=?').get(pattern).n, 2);
  assert.match(db.prepare('SELECT reference_key FROM design_reference WHERE id=?').get(ref2).reference_key, /^REF-\d{6}$/);
  assert.equal(db.prepare('SELECT record_status FROM design_reference WHERE id=?').get(ref2).record_status, 'test_fixture');
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM design_reference_duplicate_candidate WHERE duplicate_level='hard_image_hash'").get().n, 1);
  db.prepare("INSERT INTO design_reference(reference_type,record_status,evidence_status,source_url,source_url_normalized) VALUES ('other','synthetic','unknown','https://example.test/a?source=z','https://example.test/a')").run();
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM design_reference_duplicate_candidate WHERE duplicate_level='strong_normalized_url'").get().n, 2);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM preference_evidence').get().n, 1); // Evidence status never creates preference evidence.
  assert.doesNotThrow(() => db.prepare("INSERT INTO design_reference(reference_type,record_status,evidence_status,source_url) VALUES ('other','synthetic','unknown','https://example.test/a?utm=z')").run());
  const stableKey = db.prepare('SELECT reference_key FROM design_reference WHERE id=?').get(ref3).reference_key;
  assert.throws(() => db.prepare('INSERT INTO design_reference(reference_type,reference_key) VALUES (?,?)').run('other', stableKey));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM design_reference WHERE source_url IS NULL').get().n, 1); // Existing local-only reference stays valid.
  db.close(); assert.deepEqual(validate(path), []);
}));

test('004 applies cleanly after the 001-003 migration state', () => {
  const dir = mkdtempSync(join(process.cwd(), 'test', '.tmp-crystal-p1cf0-migration-')); const path = join(dir, 'existing.sqlite');
  try {
    const db = new DatabaseSync(path);
    for (const file of ['001_initial.sql','002_p1a_staging.sql','003_p1a_field_audit.sql']) db.exec(readFileSync(join(process.cwd(), 'migrations', file), 'utf8'));
    db.prepare('INSERT INTO schema_migration(version) VALUES (?)').run('001_initial');
    db.prepare('INSERT INTO schema_migration(version) VALUES (?)').run('002_p1a_staging');
    db.prepare('INSERT INTO schema_migration(version) VALUES (?)').run('003_p1a_field_audit'); db.close();
    initialize(path);
    const migrated = new DatabaseSync(path);
    assert.equal(migrated.prepare("SELECT COUNT(*) AS n FROM schema_migration WHERE version='004_p1c_reference_relationships'").get().n, 1);
    assert.equal(migrated.prepare("SELECT COUNT(*) AS n FROM pragma_table_info('design_reference') WHERE name IN ('reference_key','record_status','evidence_status','source_url_normalized','image_hash')").get().n, 5);
    migrated.close();
  } finally { try { rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {} }
});
