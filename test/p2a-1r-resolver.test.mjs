import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { initialize } from '../scripts/crystal-db.mjs';

const root = resolve(process.cwd());
const python = join(root, 'work', 'p2a-runtime', 'Scripts', 'python.exe');
const resolver = join(root, 'scripts', 'resolve-p2a-pilot.py');
const files = [
  ['IMG_7633.PNG','1qS7NQNzDumzUY4AkUkG-yNZZMOJP4aAn'],['IMG_7634.PNG','15J4Ez8epFIP9eUrnLRCL_is9aIwo1_18'],
  ['IMG_7668.PNG','13g7OoySHNNqRTxDbM7C0KMQlPY4my7mr'],['IMG_7669.PNG','1ZzYQA4n6qr8k0WIR2yERh73dB2rf0EeQ'],
  ['IMG_7717.PNG','1g6yv6Us99R2cZo0LnkREVy1Ay06v2y21'],['IMG_7718.PNG','17LJ0d7HrM8q1_tZ90Tawg_d9ls0wpFcn'],['IMG_7719.PNG','1hHNYxMLEigF5LWeRR2cr9jn4mpHfvmuC'],
  ['IMG_7746.PNG','18MJC1bptZd2zkKmQuqyrz__8dS66IUqB'],['IMG_7747.PNG','1eM8jLX-2TBR_H-capyHhZwyhqcWKQVqY'],['IMG_7748.PNG','1GKxvYZThWTXNpkHEIoEzXlgiL1C6K5jQ'],
];
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC','base64');
const SHA = 'c'.repeat(64);

function run(db, dir) { return spawnSync(python, [resolver, db, dir], { encoding: 'utf8' }); }
function withFixture(fn) {
  const dir = mkdtempSync(join(root, 'test', '.tmp-p2a-1r-')); const dbPath = join(dir, 'test.sqlite'); const pilot = join(dir, 'pilot');
  try {
    initialize(dbPath); const db = new DatabaseSync(dbPath);
    const ref = db.prepare('SELECT id FROM design_reference ORDER BY id LIMIT 1').get().id;
    for (const [name, providerFileId] of files) {
      const id = db.prepare('INSERT INTO image_asset(provider,provider_file_id,original_filename) VALUES (?,?,?)').run('google_drive', providerFileId, `not-identity-${name}`).lastInsertRowid;
      db.prepare("INSERT INTO design_reference_image(design_reference_id,image_asset_id,display_order,image_role) VALUES (?,? ,?,'unknown')").run(ref,id,Number(id)+1000);
    }
    db.close();
    mkdirSync(pilot);
    for (const [name] of files) writeFileSync(join(pilot,name),png);
    fn({dir, dbPath, pilot});
  } finally { try { rmSync(dir,{recursive:true,force:true,maxRetries:5,retryDelay:200}); } catch {} }
}

test('P2A-1R resolver guards the exact manifest before writes', { skip: !existsSync(python) }, () => withFixture(({dbPath,pilot}) => {
  unlinkSync(join(pilot,files[0][0]));
  const result = run(dbPath,pilot); assert.equal(result.status,2);
  const db = new DatabaseSync(dbPath); assert.equal(db.prepare('SELECT COUNT(*) n FROM image_perceptual_hash').get().n,0); assert.equal(db.prepare('SELECT COUNT(*) n FROM image_asset WHERE image_hash IS NOT NULL').get().n,0); db.close();
}));

test('P2A-1R resolver rejects unexpected or malformed files before writes', { skip: !existsSync(python) }, () => withFixture(({dbPath,pilot}) => {
  writeFileSync(join(pilot,'unexpected.PNG'),png); assert.equal(run(dbPath,pilot).status,2);
  unlinkSync(join(pilot,'unexpected.PNG')); writeFileSync(join(pilot,files[0][0]),Buffer.from('not an image'));
  assert.equal(run(dbPath,pilot).status,2);
  const db = new DatabaseSync(dbPath); assert.equal(db.prepare('SELECT COUNT(*) n FROM image_perceptual_hash').get().n,0); db.close();
}));

test('P2A-1R resolver is deterministic, idempotent, and never merges semantic data', { skip: !existsSync(python) }, () => withFixture(({dbPath,pilot}) => {
  const before = new DatabaseSync(dbPath);
  const semantic = Object.fromEntries(['design_reference','design_reference_image','preference_evidence','design_assessment','design_pattern','design_principle','material','market_evidence','supplier'].map(t=>[t,before.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n])); before.close();
  const first = run(dbPath,pilot); assert.equal(first.status,0,first.stderr); const firstJson = JSON.parse(first.stdout); assert.equal(firstJson.created.perceptual_hashes,10); assert.equal(firstJson.created.updated_assets,10); assert.equal(firstJson.exact_duplicate_candidates.length,45);
  const second = run(dbPath,pilot); assert.equal(second.status,0,second.stderr); const secondJson=JSON.parse(second.stdout); assert.equal(secondJson.created.perceptual_hashes,0); assert.equal(secondJson.created.updated_assets,0); assert.equal(secondJson.reused_perceptual_hashes,10);
  assert.deepEqual(secondJson.resolved.map(x=>[x.mime_type,x.width_px,x.height_px,x.byte_size,x.sha256,x.phash]), firstJson.resolved.map(x=>[x.mime_type,x.width_px,x.height_px,x.byte_size,x.sha256,x.phash]));
  const after = new DatabaseSync(dbPath); assert.equal(after.prepare('SELECT COUNT(*) n FROM image_asset').get().n,10); assert.equal(after.prepare('SELECT COUNT(*) n FROM image_perceptual_hash').get().n,10); assert.equal(after.prepare("SELECT COUNT(*) n FROM image_asset WHERE asset_status='available' AND image_hash IS NOT NULL").get().n,10);
  for(const [table,n] of Object.entries(semantic)) assert.equal(after.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n,n,table); after.close();
}));

test('P2A-1R does not overwrite changed content or reuse stale pHash', { skip: !existsSync(python) }, () => withFixture(({dbPath,pilot}) => {
  const db=new DatabaseSync(dbPath); const asset=db.prepare('SELECT id FROM image_asset WHERE provider_file_id=?').get(files[0][1]).id;
  db.prepare("UPDATE image_asset SET image_hash=? WHERE id=?").run(SHA,asset); db.prepare("INSERT INTO image_perceptual_hash(image_asset_id,algorithm,algorithm_version,hash_value,source_content_sha256) VALUES (?, 'phash','old-version','0000000000000000',?)").run(asset,SHA); db.close();
  const result=run(dbPath,pilot); assert.equal(result.status,2); const check=new DatabaseSync(dbPath); assert.equal(check.prepare('SELECT image_hash FROM image_asset WHERE id=?').get(asset).image_hash,SHA); assert.equal(check.prepare('SELECT COUNT(*) n FROM image_perceptual_hash WHERE image_asset_id=?').get(asset).n,1); check.close();
}));
