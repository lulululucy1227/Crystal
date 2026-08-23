import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { initialize, validate } from '../scripts/crystal-db.mjs';
import { importP1cR1 } from '../scripts/import-p1c-r1-references.mjs';
import { importP1cKnowledge } from '../scripts/import-p1c-knowledge.mjs';

const ids = ['H01','H05','H06','H07','H08','H09','H10','H11','H12','H14','H15','H16','H17','H18','H19'];
const patterns = { H05:['Narrative Focal Object'], H06:['Transparent Structural Element'], H07:['Wood as Structural Texture'], H08:['Framed Mineral','Orbital Structure'], H09:['Hero Mineral'], H10:['Focal Assembly','Framed Mineral','Shape as Focal','Geometric Vocabulary'], H11:['Micro Accent'], H14:['Geological Composition'], H15:['Accessory Language','Framed Mineral'], H16:['Controlled Maximalism','Secondary Line'], H17:['Reusable Design Grammar'], H18:['Natural One-of-One','Hero Mineral','Geological Composition'], H19:['Hero Mineral','Framed Mineral','Focal Assembly'] };
const themes = { H01:[{theme:'Forest',relevance:'strong'},{theme:'Mountain',relevance:'moderate'}], H06:[{theme:'Ocean',relevance:'strong'},{theme:'Glacier',relevance:'strong'}], H07:[{theme:'Forest',relevance:'primary'}], H08:[{theme:'Glacier',relevance:'strong'},{theme:'Starlight',relevance:'strong'}] };
function seeds() { return ids.map(key => ({ reference_key:key, image_files:[`${key}-1.png`,`${key}-2.png`], record_status:'real', evidence_status:'user_supplied', user_preference:{sentiment:'like',summary:`User wording ${key}`}, ...(key === 'H06' ? {} : {assistant_assessment:{summary:`Assessment ${key}`}}), ...(patterns[key] ? {design_patterns:patterns[key]} : {}), ...(themes[key] ? {theme_links:themes[key]} : {}) })); }
function withDb(fn) { const dir=mkdtempSync(join(process.cwd(),'test','.tmp-crystal-p1cr1-')); const path=join(dir,'test.sqlite'); const seedPath=join(dir,'seeds.json'); writeFileSync(seedPath,JSON.stringify(seeds())); try { initialize(path); fn(path,seedPath); } finally { try { rmSync(dir,{recursive:true,force:true,maxRetries:5,retryDelay:200}); } catch {} } }

test('P1C-R1 imports the controlled historical batch without inference or duplicate records', () => withDb((path, seedPath) => {
  importP1cKnowledge(path, join(process.cwd(), 'data', 'p1c-knowledge-seeds.jsonl'));
  const before=new DatabaseSync(path); const materialCount=before.prepare('SELECT COUNT(*) AS n FROM material').get().n; const marketCount=before.prepare('SELECT COUNT(*) AS n FROM market_evidence').get().n; before.close();
  const first=importP1cR1(path,seedPath); assert.equal(first.referencesCreated,15); assert.equal(first.preferencesCreated,15); assert.equal(first.assessmentsCreated,14); assert.equal(first.materialWrites,0); assert.equal(first.marketEvidenceCreated,0); assert.equal(first.fakeLocalPaths,0); assert.equal(first.semanticRemappings,3);
  const second=importP1cR1(path,seedPath); assert.equal(second.referencesCreated,0); assert.equal(second.referencesReused,15); assert.equal(second.preferencesCreated,0); assert.equal(second.assessmentsCreated,0); assert.equal(second.patternLinksCreated,0); assert.equal(second.themeLinksCreated,0);
  const db=new DatabaseSync(path);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM design_reference d JOIN source s ON s.id=d.source_id WHERE s.name LIKE 'P1C-R1 historical reference seed | H%' ").get().n,15);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM design_reference WHERE local_image_path IS NOT NULL AND notes LIKE 'P1C-R1%' ").get().n,0);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM design_reference WHERE source_url IS NOT NULL AND notes LIKE 'P1C-R1%' ").get().n,0);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM design_reference WHERE reference_key IN ('H01','H05')").get().n,0);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM design_reference_theme t JOIN design_reference d ON d.id=t.design_reference_id JOIN source s ON s.id=d.source_id WHERE s.name='P1C-R1 historical reference seed | H01'").get().n,2);
  assert.equal(db.prepare("SELECT relevance AS value FROM design_reference_theme t JOIN design_reference d ON d.id=t.design_reference_id JOIN source s ON s.id=d.source_id WHERE s.name='P1C-R1 historical reference seed | H07'").get().value,'strong');
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM design_pattern WHERE name IN ('Accessory Language','Natural One-of-One','Reusable Design Grammar')").get().n,0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM material').get().n,materialCount); assert.equal(db.prepare('SELECT COUNT(*) AS n FROM market_evidence').get().n,marketCount);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM source WHERE name LIKE 'P1C-R1 historical reference seed | H02'").get().n,0);
  db.close(); assert.deepEqual(validate(path),[]);
}));
