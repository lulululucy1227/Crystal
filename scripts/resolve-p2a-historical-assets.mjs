import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED = {
  'ASSET-000041': ['IMG_7712.PNG', 'REF-000017'],
  'ASSET-000042': ['IMG_7713.PNG', 'REF-000017'],
  'ASSET-000043': ['IMG_7714.PNG', 'REF-000018'],
  'ASSET-000044': ['IMG_7715.PNG', 'REF-000018'],
  'ASSET-000045': ['IMG_7716.PNG', 'REF-000018']
};

function fail(message) { throw new Error(`B01 asset-resolution preflight failed: ${message}`); }
function isBlank(value) { return value == null || (typeof value === 'string' && !value.trim()); }
function same(value, expected) { return value === expected; }

function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')); }

function validateManifest(manifest, vision) {
  if (manifest?.protocol_version !== 'P2A-HISTORICAL-ASSET-RESOLUTION-V1') fail('protocol_version is invalid');
  if (manifest.phase !== 'P2A-HISTORICAL-UPGRADE-B01-ASSET-RESOLUTION') fail('phase is invalid');
  if (!manifest.producer || isBlank(manifest.producer.type) || isBlank(manifest.producer.id) || isBlank(manifest.verification_method)) fail('manifest producer/verification metadata is blank');
  if (!Array.isArray(manifest.assets) || manifest.assets.length !== 5) fail('manifest must contain exactly five assets');
  const keys = new Set(); const visionByKey = new Map((vision?.assets ?? []).map(asset => [asset.asset_key, asset]));
  for (const asset of manifest.assets) {
    const expected = EXPECTED[asset?.asset_key];
    if (!expected || keys.has(asset.asset_key)) fail(`unexpected or duplicate asset_key ${JSON.stringify(asset?.asset_key)}`);
    keys.add(asset.asset_key);
    if (asset.filename !== expected[0] || asset.reference_key !== expected[1]) fail(`${asset.asset_key} filename/reference mismatch`);
    if (asset.provider !== 'google_drive' || isBlank(asset.provider_file_id)) fail(`${asset.asset_key} provider identity is invalid`);
    if (!/^[0-9a-f]{64}$/.test(asset.sha256 ?? '')) fail(`${asset.asset_key} SHA-256 must be 64 lowercase hex chars`);
    if (asset.mime_type !== 'image/png' || asset.detected_format !== 'PNG' || !Number.isInteger(asset.width_px) || !Number.isInteger(asset.height_px) || !Number.isInteger(asset.byte_size) || asset.width_px <= 0 || asset.height_px <= 0 || asset.byte_size <= 0) fail(`${asset.asset_key} deterministic metadata is invalid`);
    const visionAsset = visionByKey.get(asset.asset_key);
    if (!visionAsset || visionAsset.reference_key !== asset.reference_key || visionAsset.provider !== asset.provider || visionAsset.provider_file_id !== asset.provider_file_id || visionAsset.source_content_sha256 !== asset.sha256) fail(`${asset.asset_key} does not match the authored vision input source identity`);
  }
  if (keys.size !== Object.keys(EXPECTED).length) fail('manifest asset set is incomplete');
}

function checkInvariants(db) {
  const fp = db.prepare('SELECT COUNT(*) count,MIN(id) min_id,MAX(id) max_id,SUM(id) id_sum,SUM(length(observed_value)) value_sum FROM image_visual_observation').get();
  if (Number(fp.count) !== 45 || Number(fp.min_id) !== 1 || Number(fp.max_id) !== 45 || Number(fp.id_sum) !== 1035 || Number(fp.value_sum) !== 5479) fail(`pilot observation fingerprint mismatch: ${JSON.stringify(fp)}`);
  if (Number(db.prepare('SELECT COUNT(*) n FROM design_reference_synthesis_assertion').get().n) !== 19) fail('synthesis assertion count is not 19');
  if (Number(db.prepare('SELECT COUNT(*) n FROM design_reference_synthesis_source').get().n) !== 37) fail('synthesis source count is not 37');
  if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') fail('integrity_check is not ok');
  if (db.prepare('PRAGMA foreign_key_check').all().length) fail('foreign_key_check has violations');
}

function preflight(db, manifest) {
  checkInvariants(db); const resolved = [];
  for (const asset of manifest.assets) {
    const matches = db.prepare('SELECT id,asset_key,provider,provider_file_id,image_hash,asset_status,mime_type,width_px,height_px,byte_size FROM image_asset WHERE asset_key=?').all(asset.asset_key);
    if (matches.length !== 1) fail(`${asset.asset_key} resolved ${matches.length} times`);
    const current = matches[0];
    if (current.provider !== 'google_drive') fail(`${asset.asset_key} canonical provider is not google_drive`);
    if (current.provider_file_id !== asset.provider_file_id) fail(`${asset.asset_key} provider_file_id conflicts`);
    const links = db.prepare('SELECT d.reference_key FROM design_reference_image dri JOIN design_reference d ON d.id=dri.design_reference_id WHERE dri.image_asset_id=? ORDER BY d.reference_key').all(current.id).map(row => row.reference_key);
    if (links.length !== 1 || links[0] !== asset.reference_key) fail(`${asset.asset_key} reference linkage conflicts`);
    if (!isBlank(current.image_hash) && current.image_hash.toLowerCase() !== asset.sha256) fail(`CONTENT_CHANGED / CONFLICT_BLOCKED: ${asset.asset_key} SHA differs`);
    for (const field of ['mime_type', 'width_px', 'height_px', 'byte_size']) if (current[field] != null && !same(current[field], asset[field])) fail(`${asset.asset_key} existing ${field} conflicts`);
    if (!['unresolved', 'available'].includes(current.asset_status)) fail(`${asset.asset_key} asset_status is not resolvable`);
    if (Number(db.prepare('SELECT COUNT(*) n FROM image_visual_observation WHERE image_asset_id=?').get(current.id).n) !== 0) fail(`${asset.asset_key} already has image observations`);
    resolved.push({ asset, current, links, phash_count: Number(db.prepare('SELECT COUNT(*) n FROM image_perceptual_hash WHERE image_asset_id=?').get(current.id).n) });
  }
  return resolved;
}

export function resolveHistoricalAssets(dbPath, manifestPath, visionPath = join(root, 'inputs', 'p2a-historical-upgrade-b01-vision-observations.json'), { dryRun = false } = {}) {
  const manifest = readJson(manifestPath); const vision = readJson(visionPath); validateManifest(manifest, vision);
  const db = new DatabaseSync(dbPath); db.exec('PRAGMA foreign_keys=ON');
  try {
    const rows = preflight(db, manifest);
    if (dryRun) return { dry_run: true, requested: rows.length, updated_assets: 0, reused_assets: 0, phash: { created: 0, reused: rows.reduce((n, row) => n + row.phash_count, 0), deferred: rows.filter(row => row.phash_count === 0).length } };
    let updated = 0; let reused = 0;
    db.exec('BEGIN IMMEDIATE');
    for (const row of rows) {
      const current = db.prepare('SELECT image_hash,asset_status,mime_type,width_px,height_px,byte_size FROM image_asset WHERE id=?').get(row.current.id);
      if (!isBlank(current.image_hash) && current.image_hash.toLowerCase() !== row.asset.sha256) fail(`CONTENT_CHANGED / CONFLICT_BLOCKED during commit: ${row.asset.asset_key}`);
      for (const field of ['mime_type', 'width_px', 'height_px', 'byte_size']) if (current[field] != null && current[field] !== row.asset[field]) fail(`${row.asset.asset_key} ${field} changed during commit`);
      const needsUpdate = isBlank(current.image_hash) || current.mime_type == null || current.width_px == null || current.height_px == null || current.byte_size == null || current.asset_status === 'unresolved';
      if (needsUpdate) {
        db.prepare(`UPDATE image_asset SET image_hash=COALESCE(image_hash,?), mime_type=COALESCE(mime_type,?), width_px=COALESCE(width_px,?), height_px=COALESCE(height_px,?), byte_size=COALESCE(byte_size,?), asset_status=CASE WHEN asset_status='unresolved' THEN 'available' ELSE asset_status END WHERE id=?`).run(row.asset.sha256, row.asset.mime_type, row.asset.width_px, row.asset.height_px, row.asset.byte_size, row.current.id);
        updated += 1;
      } else reused += 1;
    }
    db.exec('COMMIT'); checkInvariants(db);
    const ready = preflight(db, manifest);
    return { dry_run: false, requested: rows.length, updated_assets: updated, reused_assets: reused, phash: { created: 0, reused: ready.reduce((n, row) => n + row.phash_count, 0), deferred: ready.filter(row => row.phash_count === 0).length }, resolved: ready.map(row => ({ asset_key: row.asset.asset_key, image_hash: row.current.image_hash ?? row.asset.sha256, asset_status: db.prepare('SELECT asset_status FROM image_asset WHERE id=?').get(row.current.id).asset_status })) };
  } catch (error) { try { db.exec('ROLLBACK'); } catch {} throw error; } finally { db.close(); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = process.argv.slice(2); const dryRun = args.includes('--dry-run'); const paths = args.filter(value => value !== '--dry-run');
  console.log(JSON.stringify(resolveHistoricalAssets(resolve(paths[0] ?? join(root, 'data', 'crystal-design.sqlite')), resolve(paths[1] ?? join(root, 'inputs', 'p2a-historical-upgrade-b01-asset-resolution-manifest.json')), resolve(paths[2] ?? join(root, 'inputs', 'p2a-historical-upgrade-b01-vision-observations.json')), { dryRun }), null, 2));
}
