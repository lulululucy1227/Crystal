import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PHASE = 'P2A-NEW-REFERENCE-CRETACEOUS-COAST-FRAGMENTS';
const CONCEPT = '白垩纪的海岸碎片';
const SOURCE_NAME = `P2A intake | ${CONCEPT}`;
const MARKER = `${PHASE} | user_supplied_concept_name=${CONCEPT}`;
const EXPECTED_FILES = [
  ['IMG_7812.PNG', '1G3vgzk5As10zXs3pPfXdc-oA3dG5iiAk', 1, 'overall'],
  ['IMG_7813.PNG', '1laJm9mwscENnZ6agSLcvUitzsJyUfO_P', 2, 'detail'],
  ['IMG_7814.PNG', '1QH29N5T9k_AKmK36x_ytiEQ4gEyEKt3i', 3, 'overall']
];

function fail(message) { throw new Error(`Cretaceous Coast Fragments intake preflight failed: ${message}`); }
function nonblank(value) { return typeof value === 'string' && value.trim().length > 0; }
function same(value, expected) { return value === expected; }

function load(path) {
  const input = JSON.parse(readFileSync(path, 'utf8'));
  for (const [field, expected] of Object.entries({ protocol_version: 'AGENT-HANDOFF-V1', phase: PHASE, producer_type: 'assistant_model', producer_id: 'gpt-5.6-sol', analysis_version: 'p2a-vision-v1', user_supplied_concept_name: CONCEPT })) if (input?.[field] !== expected) fail(`${field} is not exact`);
  if (input.concept_name_semantics !== 'user_supplied_design_concept_only_not_a_geological_age_or_material_fact') fail('concept name boundary is not exact');
  if (!Array.isArray(input.assets) || input.assets.length !== 3) fail('input must contain exactly three assets');
  const ids = new Set();
  for (const [index, asset] of input.assets.entries()) {
    const expected = EXPECTED_FILES[index];
    if (!expected || asset?.filename !== expected[0] || asset.provider !== 'google_drive' || asset.provider_file_id !== expected[1] || asset.display_order !== expected[2] || asset.image_role !== expected[3]) fail(`asset ${index} is not the exact authorized source image`);
    if (ids.has(asset.provider_file_id)) fail(`duplicate provider_file_id ${asset.provider_file_id}`); ids.add(asset.provider_file_id);
    if (!/^[0-9a-f]{64}$/.test(asset.source_content_sha256 ?? '')) fail(`${asset.filename} SHA-256 must be 64 lowercase hex`);
    if (asset.mime_type !== 'image/png' || !Number.isInteger(asset.width_px) || !Number.isInteger(asset.height_px) || !Number.isInteger(asset.byte_size) || asset.width_px <= 0 || asset.height_px <= 0 || asset.byte_size <= 0) fail(`${asset.filename} deterministic metadata is invalid`);
  }
  return input;
}

function integrity(db) {
  if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') fail('integrity_check is not ok');
  if (db.prepare('PRAGMA foreign_key_check').all().length) fail('foreign_key_check has violations');
}

function baseline(db) {
  const values = {
    observations: Number(db.prepare('SELECT COUNT(*) n FROM image_visual_observation').get().n),
    assertions: Number(db.prepare('SELECT COUNT(*) n FROM design_reference_synthesis_assertion').get().n),
    sources: Number(db.prepare('SELECT COUNT(*) n FROM design_reference_synthesis_source').get().n),
    material: Number(db.prepare('SELECT COUNT(*) n FROM material').get().n),
    supplier: Number(db.prepare('SELECT COUNT(*) n FROM supplier').get().n),
    market: Number(db.prepare('SELECT COUNT(*) n FROM market_evidence').get().n)
  };
  if (values.observations < 67 || !([0].includes(values.assertions) || values.assertions >= 19) || !([0].includes(values.sources) || values.sources >= 37)) fail(`unexpected canonical baseline ${JSON.stringify(values)}`);
  integrity(db); return values;
}

function exactAsset(current, asset) {
  return current.provider === asset.provider && current.provider_file_id === asset.provider_file_id && current.original_filename === asset.filename && current.image_hash === asset.source_content_sha256 && current.mime_type === asset.mime_type && same(current.width_px, asset.width_px) && same(current.height_px, asset.height_px) && same(current.byte_size, asset.byte_size) && current.asset_status === 'available';
}

function preflight(db, input) {
  const before = baseline(db); const assets = [];
  for (const asset of input.assets) {
    const found = db.prepare('SELECT id,provider,provider_file_id,original_filename,image_hash,mime_type,width_px,height_px,byte_size,asset_status FROM image_asset WHERE provider=? AND provider_file_id=?').all(asset.provider, asset.provider_file_id);
    if (found.length > 1) fail(`${asset.filename} provider identity is ambiguous`);
    if (found.length && !exactAsset(found[0], asset)) fail(`${asset.filename} provider identity conflicts with canonical provenance`);
    assets.push({ input: asset, current: found[0] ?? null });
  }
  const existingIds = assets.filter(row => row.current).map(row => row.current.id);
  let exactReference = null;
  if (existingIds.length === 3) {
    const placeholders = existingIds.map(() => '?').join(',');
    const refs = db.prepare(`SELECT d.id,d.reference_key,d.notes FROM design_reference d JOIN design_reference_image i ON i.design_reference_id=d.id GROUP BY d.id HAVING COUNT(*)=3 AND SUM(CASE WHEN i.image_asset_id IN (${placeholders}) THEN 1 ELSE 0 END)=3`).all(...existingIds);
    if (refs.length > 1) fail('more than one reference represents the exact three provider identities');
    exactReference = refs[0] ?? null;
    const linked = db.prepare(`SELECT DISTINCT design_reference_id FROM design_reference_image WHERE image_asset_id IN (${placeholders})`).all(...existingIds);
    if (linked.length && !exactReference) fail('pre-existing image assets have an ambiguous reference mapping');
    if (exactReference && !String(exactReference.notes ?? '').includes(MARKER)) fail('exact image grouping has no matching intake provenance marker');
  } else if (existingIds.length) {
    const placeholders = existingIds.map(() => '?').join(',');
    if (db.prepare(`SELECT COUNT(*) n FROM design_reference_image WHERE image_asset_id IN (${placeholders})`).get(...existingIds).n) fail('partial pre-existing image set is already linked to a reference');
  }
  const source = db.prepare('SELECT id,notes FROM source WHERE name=?').all(SOURCE_NAME);
  if (source.length > 1 || (source.length === 1 && !String(source[0].notes ?? '').includes(MARKER))) fail('intake source identity conflicts');
  if (exactReference) {
    const links = db.prepare('SELECT i.image_asset_id,i.display_order,i.image_role FROM design_reference_image i WHERE i.design_reference_id=? ORDER BY i.display_order').all(exactReference.id);
    for (const [index, row] of links.entries()) if (row.image_asset_id !== existingIds[index] || row.display_order !== input.assets[index].display_order || row.image_role !== input.assets[index].image_role) fail('exact reference link order or role conflicts');
  }
  return { before, assets, exactReference, source: source[0] ?? null };
}

export function importCretaceousCoastFragments(dbPath, inputPath) {
  const input = load(inputPath); const db = new DatabaseSync(dbPath); db.exec('PRAGMA foreign_keys=ON');
  try {
    const plan = preflight(db, input); let referencesCreated = 0; let referencesReused = 0; let assetsCreated = 0; let assetsReused = 0; let linksCreated = 0; let linksReused = 0;
    db.exec('BEGIN IMMEDIATE');
    let source = plan.source;
    if (!source) source = { id: Number(db.prepare('INSERT INTO source(source_type,name,verification_status,evidence_strength,notes) VALUES (?,?,?,?,?)').run('user_upload', SOURCE_NAME, 'unverified', 'low', `${MARKER} | user supplied three uploaded source images; seller/source claims deferred and not promoted to material facts.`).lastInsertRowid) };
    let reference = plan.exactReference;
    if (!reference) {
      const notes = `${MARKER} | Stored as a user-supplied design concept/name only; not geological age/provenance or a material fact.`;
      const id = Number(db.prepare("INSERT INTO design_reference(reference_type,source_id,record_status,evidence_status,notes) VALUES ('uploaded_image',?,'real','user_supplied',?)").run(source.id, notes).lastInsertRowid);
      reference = db.prepare('SELECT id,reference_key,notes FROM design_reference WHERE id=?').get(id); referencesCreated += 1;
    } else referencesReused += 1;
    for (const row of plan.assets) {
      let asset = row.current;
      if (!asset) {
        const a = row.input; const id = Number(db.prepare('INSERT INTO image_asset(provider,provider_file_id,original_filename,mime_type,width_px,height_px,byte_size,image_hash,asset_status,notes) VALUES (?,?,?,?,?,?,?,?,?,?)').run(a.provider, a.provider_file_id, a.filename, a.mime_type, a.width_px, a.height_px, a.byte_size, a.source_content_sha256, 'available', `${MARKER} | verified GPT-supplied source-byte metadata; no local bytes retained for pHash.`).lastInsertRowid);
        asset = db.prepare('SELECT id,provider,provider_file_id,original_filename,image_hash,mime_type,width_px,height_px,byte_size,asset_status FROM image_asset WHERE id=?').get(id); assetsCreated += 1;
      } else assetsReused += 1;
      if (!exactAsset(asset, row.input)) fail(`${row.input.filename} changed during intake`);
      const link = db.prepare('SELECT id,display_order,image_role FROM design_reference_image WHERE design_reference_id=? AND image_asset_id=?').all(reference.id, asset.id);
      if (link.length > 1 || (link.length && (link[0].display_order !== row.input.display_order || link[0].image_role !== row.input.image_role))) fail(`${row.input.filename} link conflicts during intake`);
      if (link.length) linksReused += 1;
      else { db.prepare('INSERT INTO design_reference_image(design_reference_id,image_asset_id,display_order,image_role,notes) VALUES (?,?,?,?,?)').run(reference.id, asset.id, row.input.display_order, row.input.image_role, `${MARKER} | authorized image order and role.`); linksCreated += 1; }
    }
    db.exec('COMMIT'); integrity(db);
    const check = preflight(db, input);
    const phash = Number(db.prepare(`SELECT COUNT(*) n FROM image_perceptual_hash WHERE image_asset_id IN (${input.assets.map(() => '?').join(',')})`).get(...check.assets.map(row => row.current.id)).n);
    if (JSON.stringify(check.before) !== JSON.stringify(plan.before)) fail('forbidden baseline changed during intake');
    return { references_created: referencesCreated, references_reused: referencesReused, reference_key: check.exactReference.reference_key, assets_created: assetsCreated, assets_reused: assetsReused, links_created: linksCreated, links_reused: linksReused, sha_match: check.assets.length, phash: { created: 0, reused: phash, deferred: 3 - phash } };
  } catch (error) { try { db.exec('ROLLBACK'); } catch {} throw error; } finally { db.close(); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) console.log(JSON.stringify(importCretaceousCoastFragments(resolve(process.argv[2] ?? join(root, 'data', 'crystal-design.sqlite')), resolve(process.argv[3] ?? join(root, 'inputs', 'p2a-new-reference-cretaceous-coast-fragments.json'))), null, 2));
