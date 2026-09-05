import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { assertSafeLocalPath, loadLocalAssetManifest, publicationStatus } from '../workbench/local-asset-manifest.mjs';
import { normalizeTransparentPng } from './png-normalize.mjs';

/**
 * Explicit local input only; never identifies minerals or downloads source images.
 * CLI: node tools/process-local-assets.mjs inputs/local-assets/approved.json [size]
 * JSON: {"records":[{"material_id":"...","spec_id":"...","file":"photo.png",
 *   "source_type":"source_photo","rights_status":"unknown",
 *   "publication_status":"local_only","source_locator":"optional"}]}
 * file is relative to inputs/local-assets. Only use records approved for processing.
 * No reliable background remover is installed: opaque/unsupported sources remain
 * pending with needs_mask=true. Sharp decodes PNG/JPEG/WebP, including existing
 * transparent PNG/WebP; JPEG without a supplied cutout remains needs_mask.
 */
export async function processLocalAssets({ rootDir = process.cwd(), records, size = 256 }) {
  if (!Array.isArray(records)) throw new Error('Explicit approved records array required');
  if (!Number.isInteger(size) || size < 16 || size > 2048) throw new Error('Canvas size must be an integer from 16 to 2048');
  const prepared = records.map(record => {
    for (const key of ['material_id', 'spec_id']) if (typeof record?.[key] !== 'string' || !record[key].trim()) throw new Error(`Explicit ${key} required; material identity is never inferred`);
    if (record.source_type && !['source_photo', 'source_cutout', 'source_derived', 'generated_from_evidence'].includes(record.source_type)) throw new Error('Unsupported source_type; explicit truthful provenance required');
    if (typeof record.file !== 'string' || !record.file) throw new Error('Explicit source file path required');
    const file = assertSafeLocalPath(rootDir, `inputs/local-assets/${record.file}`, { mustExist: true });
    if (!fs.statSync(file).isFile() || fs.statSync(file).size > 64 * 1024 * 1024) throw new Error('Unsupported source file or size limit');
    return { record, file };
  });
  const outputDir = assertSafeLocalPath(rootDir, 'workbench/assets/local');
  const manifestFile = assertSafeLocalPath(rootDir, 'workbench/state/local-asset-manifest.json');
  const existing = loadLocalAssetManifest({ rootDir });
  if (existing.error) throw new Error(existing.error);
  fs.mkdirSync(outputDir, { recursive: true }); fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
  const assets = [...existing.assets];
  for (const { record, file } of prepared) {
    const source = fs.readFileSync(file), sourceSha = createHash('sha256').update(source).digest('hex');
    const result = {
      material_id: record.material_id, spec_id: record.spec_id, source_type: record.source_type || 'source_photo',
      source_sha256: sourceSha, source_file: record.file,
      ...(typeof record.source_locator === 'string' ? { source_locator: record.source_locator } : {}),
      rights_status: record.rights_status || 'unknown', publication_status: publicationStatus(record),
      processing_method: 'none_pending_mask_or_decoder', representation_class: 'fallback',
      needs_mask: true, status: 'pending', file: null,
    };
    try {
      if (record.rights_status === 'prohibited') throw new Error('SOURCE_USE_PROHIBITED');
      const normalized = await normalizeTransparentPng(source, size);
      const outputSha = createHash('sha256').update(normalized.bytes).digest('hex');
      const filename = `${sourceSha}-${size}-${outputSha.slice(0, 12)}.png`;
      const target = assertSafeLocalPath(rootDir, `workbench/assets/local/${filename}`);
      if (fs.existsSync(target)) {
        if (!fs.readFileSync(target).equals(normalized.bytes)) throw new Error('OUTPUT_CONTENT_CONFLICT');
      } else fs.writeFileSync(target, normalized.bytes, { flag: 'wx' });
      Object.assign(result, {
        processing_method: 'sharp_existing_alpha_bounds_square_nearest_neighbor_v2',
        representation_class: record.source_type === 'generated_from_evidence' ? 'generated_from_evidence' : record.source_type === 'source_derived' ? 'source_derived' : 'source_cutout',
        needs_mask: false, status: 'ready', file: filename, output_sha256: outputSha,
        canvas_size: size, source_width: normalized.sourceWidth, source_height: normalized.sourceHeight, source_format: normalized.sourceFormat,
        source_bounds: normalized.sourceBounds,
      });
    } catch (error) { result.reason = error.message; }
    const index = assets.findIndex(asset => asset.material_id === result.material_id && asset.spec_id === result.spec_id && asset.source_file === result.source_file);
    if (index < 0) assets.push(result); else assets[index] = result;
  }
  const manifest = { version: 1, assets };
  const temporary = assertSafeLocalPath(rootDir, `workbench/state/.local-asset-manifest-${randomUUID()}.tmp`);
  fs.writeFileSync(temporary, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
  fs.renameSync(temporary, manifestFile);
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const inputFile = process.argv[2];
    if (!inputFile) throw new Error('Usage: node tools/process-local-assets.mjs inputs/local-assets/approved.json [size]');
    const file = assertSafeLocalPath(process.cwd(), inputFile.replaceAll('\\', '/'), { mustExist: true });
    const input = JSON.parse(fs.readFileSync(file, 'utf8'));
    const manifest = await processLocalAssets({ records: input.records, size: process.argv[3] ? Number(process.argv[3]) : 256 });
    console.log(JSON.stringify({ ready: manifest.assets.filter(a => a.status === 'ready').length, pending: manifest.assets.filter(a => a.status !== 'ready').length, manifest: 'workbench/state/local-asset-manifest.json' }));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
