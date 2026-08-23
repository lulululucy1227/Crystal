import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

function loadManifest(path) {
  const rows = JSON.parse(readFileSync(path, 'utf8')).map(row => ({ ...row, assets: row.assets?.map(asset => Array.isArray(asset)
    ? { filename: asset[0], provider: 'google_drive', provider_file_id: asset[1] }
    : asset) }));
  if (!Array.isArray(rows) || rows.length !== 15) throw new Error('P1C-R1 image manifest must contain exactly 15 reference mappings.');
  const keys = new Set(); const identities = new Set();
  for (const row of rows) {
    if (!row.seed_id || !row.system_reference_key || !Array.isArray(row.assets) || keys.has(row.system_reference_key)) throw new Error('Invalid or duplicate reference mapping.');
    keys.add(row.system_reference_key);
    for (const asset of row.assets) {
      if (asset.provider !== 'google_drive' || !asset.filename || !asset.provider_file_id) throw new Error(`Incomplete Google Drive identity for ${row.seed_id}.`);
      const identity = `${asset.provider}:${asset.provider_file_id}`;
      if (identities.has(identity)) throw new Error(`Duplicate asset identity: ${identity}`);
      identities.add(identity);
    }
  }
  return rows;
}

export function backfillP1cR1ImageAssets(dbPath, manifestPath) {
  const rows = loadManifest(manifestPath); const db = new DatabaseSync(dbPath); db.exec('PRAGMA foreign_keys = ON;');
  const out = { assetsCreated: 0, assetsReused: 0, linksCreated: 0, linksReused: 0, fakePaths: 0, hashesCalculated: 0 };
  try {
    db.exec('BEGIN');
    for (const row of rows) {
      const reference = db.prepare("SELECT d.id,s.notes FROM design_reference d JOIN source s ON s.id=d.source_id WHERE d.reference_key=?").get(row.system_reference_key);
      if (!reference || !reference.notes.includes(`external_seed_key=${row.seed_id}`)) throw new Error(`Reference identity mismatch for ${row.seed_id}.`);
      for (const [displayOrder, supplied] of row.assets.entries()) {
        let asset = db.prepare('SELECT id,original_filename FROM image_asset WHERE provider=? AND provider_file_id=?').get(supplied.provider, supplied.provider_file_id);
        if (!asset) {
          const id = db.prepare('INSERT INTO image_asset(provider,provider_file_id,original_filename,asset_status,notes) VALUES (?,?,?,?,?)')
            .run(supplied.provider, supplied.provider_file_id, supplied.filename, 'unresolved', `P1C-R1 user-supplied manifest | seed_id=${row.seed_id} | provider identity supplied; Drive content not accessed or verified.`).lastInsertRowid;
          asset = db.prepare('SELECT id,original_filename FROM image_asset WHERE id=?').get(id); out.assetsCreated += 1;
        } else { if (asset.original_filename !== supplied.filename) throw new Error(`Provider identity filename conflict for ${row.seed_id}.`); out.assetsReused += 1; }
        const result = db.prepare('INSERT OR IGNORE INTO design_reference_image(design_reference_id,image_asset_id,display_order,image_role,notes) VALUES (?,?,?,?,?)')
          .run(reference.id, asset.id, displayOrder, 'unknown', `P1C-R1 manifest order=${displayOrder}; role not supplied.`);
        if (result.changes) out.linksCreated += 1; else out.linksReused += 1;
      }
    }
    db.exec('COMMIT');
  } catch (error) { try { db.exec('ROLLBACK'); } catch {} throw error; } finally { db.close(); }
  return out;
}

if (process.argv[1]?.endsWith('backfill-p1c-r1-image-assets.mjs')) {
  if (process.argv.length !== 4) throw new Error('Usage: backfill-p1c-r1-image-assets.mjs DATABASE.sqlite MANIFEST.json');
  console.log(JSON.stringify(backfillP1cR1ImageAssets(process.argv[2], process.argv[3])));
}
