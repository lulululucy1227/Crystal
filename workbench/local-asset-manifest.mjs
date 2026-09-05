import fs from 'node:fs';
import path from 'node:path';

const PUBLIC_RIGHTS = new Set(['owned', 'licensed_for_publication', 'public_domain']);
const SOURCE_CLASSES = new Set(['source_cutout', 'source_derived']);
const SAFE_FILE = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*\.(?:png|webp)$/;

// Refuse junctions/symlinks anywhere below the caller's explicit repository root.
// Check existing parents too, including for paths that will be created later.
export function assertSafeLocalPath(rootDir, relativePath, { mustExist = false } = {}) {
  if (typeof relativePath !== 'string' || !relativePath || /[\\:%\u0000-\u001f<>"|?*]/.test(relativePath) || path.posix.isAbsolute(relativePath) || relativePath.split('/').some(p => !p || /[. ]$/.test(p) || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(p))) throw new Error('Unsafe local asset path');
  const root = path.resolve(rootDir);
  if (!fs.existsSync(root) || fs.lstatSync(root).isSymbolicLink()) throw new Error('Unsafe local asset root path');
  let target = root;
  for (const part of relativePath.split('/')) {
    target = path.join(target, part);
    if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) throw new Error('Symlink local asset path is forbidden');
    // lstat also catches dangling links that existsSync treats as absent.
    try { if (fs.lstatSync(target).isSymbolicLink()) throw new Error('Symlink local asset path is forbidden'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (mustExist && !fs.existsSync(target)) throw new Error('Local asset path does not exist');
  return target;
}

export function loadLocalAssetManifest({ rootDir }) {
  try {
    const file = assertSafeLocalPath(rootDir, 'workbench/state/local-asset-manifest.json');
    if (!fs.existsSync(file)) return { version: 1, assets: [] };
    if (fs.statSync(file).size > 8 * 1024 * 1024) throw new Error('Local asset manifest too large');
    const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (manifest?.version !== 1 || !Array.isArray(manifest.assets) || manifest.assets.some(asset => !asset || typeof asset !== 'object' || typeof asset.material_id !== 'string' || !asset.material_id || typeof asset.spec_id !== 'string' || !asset.spec_id)) throw new Error('Invalid local asset manifest');
    return manifest;
  } catch (error) {
    return { version: 1, assets: [], error: error.message };
  }
}

export function resolveLocalAssetPath({ rootDir, file }) {
  if (typeof file !== 'string' || !SAFE_FILE.test(file) || file.includes('..')) return null;
  try {
    const resolved = assertSafeLocalPath(rootDir, `workbench/assets/local/${file}`, { mustExist: true });
    return fs.statSync(resolved).isFile() ? resolved : null;
  } catch { return null; }
}

export function resolveMaterialAsset({ materialId, specId, localAssets = [], trackedAssets = [], generatedAssets = [], fallback = null }) {
  const matches = asset => asset && asset.material_id === materialId && asset.spec_id === specId && asset.rights_status !== 'prohibited';
  const ready = asset => matches(asset) && !asset.needs_mask && (!asset.status || asset.status === 'ready');
  const local = localAssets.find(asset => ready(asset) && SOURCE_CLASSES.has(asset.representation_class) && typeof asset.file === 'string' && SAFE_FILE.test(asset.file) && !asset.file.includes('..'));
  if (local) return { ...local, url: `/assets/local/${encodeURIComponent(local.file)}` };
  const tracked = trackedAssets.find(asset => ready(asset) && SOURCE_CLASSES.has(asset.representation_class) && asset.publication_status === 'public_allowed' && PUBLIC_RIGHTS.has(asset.rights_status));
  if (tracked) return tracked;
  const localGenerated = localAssets.find(asset => ready(asset) && asset.representation_class === 'generated_from_evidence' && typeof asset.file === 'string' && SAFE_FILE.test(asset.file) && !asset.file.includes('..'));
  if (localGenerated) return { ...localGenerated, url: `/assets/local/${encodeURIComponent(localGenerated.file)}` };
  return generatedAssets.find(asset => ready(asset) && asset.representation_class === 'generated_from_evidence') || fallback;
}

export function publicationStatus(record) {
  return record.publication_status === 'public_allowed' && PUBLIC_RIGHTS.has(record.rights_status) ? 'public_allowed' : 'local_only';
}
