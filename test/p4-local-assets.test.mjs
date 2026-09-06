import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import sharp from 'sharp';
import { processLocalAssets } from '../tools/process-local-assets.mjs';
import { assertSafeLocalPath, loadLocalAssetManifest, resolveLocalAssetPath, resolveMaterialAsset } from '../workbench/local-asset-manifest.mjs';

// Tiny synthetic raster only: no vendor photos or repository exports are read.
function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}
function syntheticPng({ opaque = false } = {}) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(8, 0); header.writeUInt32BE(6, 4); header[8] = 8; header[9] = 6;
  const raw = Buffer.alloc(6 * 33);
  for (let y = 0; y < 6; y++) for (let x = 0; x < 8; x++) {
    const at = y * 33 + 1 + x * 4;
    raw[at] = 24; raw[at + 1] = 90; raw[at + 2] = 160;
    raw[at + 3] = opaque || (x >= 3 && x < 5 && y >= 1 && y < 5) ? 255 : 0;
  }
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function fixture(t) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'crystal-p4-assets-'));
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(rootDir, 'inputs/local-assets'), { recursive: true });
  return rootDir;
}
const record = (extra = {}) => ({ material_id: 'explicit-material', spec_id: 'explicit-8', file: 'sample.png', source_type: 'source_photo', source_locator: 'user-supplied-fixture', ...extra });

test('normalizes genuine PNG alpha bounds, preserves color and records real source hash privately', async (t) => {
  const rootDir = fixture(t); const source = syntheticPng();
  fs.writeFileSync(path.join(rootDir, 'inputs/local-assets/sample.png'), source);
  const manifest = await processLocalAssets({ rootDir, records: [record()], size: 32 });
  const asset = manifest.assets[0];
  assert.equal(asset.material_id, 'explicit-material');
  assert.equal(asset.source_sha256, createHash('sha256').update(source).digest('hex'));
  assert.equal(asset.publication_status, 'local_only');
  assert.equal(asset.representation_class, 'source_cutout');
  assert.equal(asset.needs_mask, false);
  assert.equal(asset.status, 'ready');
  assert.equal(asset.source_locator, 'user-supplied-fixture');
  const output = fs.readFileSync(resolveLocalAssetPath({ rootDir, file: asset.file }));
  assert.equal(output.readUInt32BE(16), 32); assert.equal(output.readUInt32BE(20), 32);
  const pixels = await sharp(output).ensureAlpha().raw().toBuffer();
  const occupied = [];
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const at = (y * 32 + x) * 4;
    if (pixels[at + 3]) { occupied.push([x, y]); assert.deepEqual([...pixels.subarray(at, at + 3)], [24, 90, 160]); }
  }
  assert.equal(Math.min(...occupied.map(p => p[0])), 9);
  assert.equal(Math.max(...occupied.map(p => p[0])), 21);
  assert.equal(Math.min(...occupied.map(p => p[1])), 3);
  assert.equal(Math.max(...occupied.map(p => p[1])), 28);
  assert.deepEqual(loadLocalAssetManifest({ rootDir }), manifest);
  const replay = await processLocalAssets({ rootDir, records: [record()], size: 32 });
  assert.deepEqual(replay, manifest);
  assert.equal(fs.readdirSync(path.join(rootDir, 'workbench/assets/local')).length, 1);
});

test('opaque and unsupported sources stay pending without fabricated cutouts or false SHA values', async (t) => {
  const rootDir = fixture(t);
  fs.writeFileSync(path.join(rootDir, 'inputs/local-assets/sample.png'), syntheticPng({ opaque: true }));
  fs.writeFileSync(path.join(rootDir, 'inputs/local-assets/sample.webp'), 'not a decoder-supported image');
  const manifest = await processLocalAssets({ rootDir, records: [record(), record({ spec_id: 'other', file: 'sample.webp' })], size: 32 });
  for (const asset of manifest.assets) {
    assert.equal(asset.status, 'pending'); assert.equal(asset.needs_mask, true);
    assert.equal(asset.representation_class, 'fallback'); assert.equal(asset.file, null);
    assert.match(asset.source_sha256, /^[a-f0-9]{64}$/);
  }
  assert.equal(manifest.assets[0].reason, 'OPAQUE_SOURCE_NEEDS_MASK');
  assert.equal(fs.readdirSync(path.join(rootDir, 'workbench/assets/local')).length, 0);
});

test('processor refuses missing material identity, source traversal and symlink input', async (t) => {
  const rootDir = fixture(t);
  fs.writeFileSync(path.join(rootDir, 'inputs/local-assets/sample.png'), syntheticPng());
  await assert.rejects(processLocalAssets({ rootDir, records: [record({ material_id: '' })] }), /material_id/);
  await assert.rejects(processLocalAssets({ rootDir, records: [record({ file: '../secret.png' })] }), /path/i);
  await assert.rejects(processLocalAssets({ rootDir, records: [record({ file: 'C:\\secret.png' })] }), /path/i);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'crystal-p4-outside-'));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.writeFileSync(path.join(outside, 'source.png'), syntheticPng());
  fs.symlinkSync(outside, path.join(rootDir, 'inputs/local-assets/linked'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(processLocalAssets({ rootDir, records: [record({ file: 'linked/source.png' })] }), /symlink|path/i);
});

test('local resolver rejects traversal, encoded traversal, absolute paths and symlinked asset directory', (t) => {
  const rootDir = fixture(t);
  const local = path.join(rootDir, 'workbench/assets/local'); fs.mkdirSync(local, { recursive: true });
  fs.writeFileSync(path.join(local, 'safe.png'), syntheticPng());
  assert.equal(resolveLocalAssetPath({ rootDir, file: 'safe.png' }), path.join(local, 'safe.png'));
  for (const file of ['../safe.png', '%2e%2e%2fsafe.png', 'nested/safe.png', 'C:\\safe.png', '/safe.png', 'safe.png:secret', 'safe.png?x']) assert.equal(resolveLocalAssetPath({ rootDir, file }), null);
  fs.renameSync(local, `${local}-original`);
  fs.symlinkSync(`${local}-original`, local, process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal(resolveLocalAssetPath({ rootDir, file: 'safe.png' }), null);
});

test('rights-aware selection prefers local source, refuses unlicensed tracked sources and preserves fallback', () => {
  const identity = { material_id: 'm', spec_id: 's' };
  const local = { ...identity, status: 'ready', needs_mask: false, representation_class: 'source_cutout', publication_status: 'local_only', file: 'local.png' };
  const generated = { ...identity, representation_class: 'generated_from_evidence', url: '/generated.png' };
  const tracked = { ...identity, representation_class: 'source_cutout', publication_status: 'public_allowed', rights_status: 'owned', url: '/public.png' };
  const options = { materialId: 'm', specId: 's', generatedAssets: [generated], fallback: { url: '/fallback.svg', representation_class: 'fallback' } };
  assert.equal(resolveMaterialAsset({ ...options, localAssets: [local], trackedAssets: [tracked] }).url, '/assets/local/local.png');
  assert.equal(resolveMaterialAsset({ ...options, trackedAssets: [tracked] }).url, '/public.png');
  assert.equal(resolveMaterialAsset({ ...options, trackedAssets: [{ ...tracked, rights_status: 'unknown' }] }).url, '/generated.png');
  assert.equal(resolveMaterialAsset({ ...options, localAssets: [{ ...local, rights_status: 'prohibited' }] }).url, '/generated.png');
  assert.equal(resolveMaterialAsset({ ...options, localAssets: [{ ...local, needs_mask: true }] }).url, '/generated.png');
  assert.equal(resolveMaterialAsset({ ...options, generatedAssets: [] }).url, '/fallback.svg');
});

test('publication claim alone cannot promote unknown source rights to public assets', async (t) => {
  const rootDir = fixture(t);
  fs.writeFileSync(path.join(rootDir, 'inputs/local-assets/sample.png'), syntheticPng());
  const manifest = await processLocalAssets({ rootDir, records: [record({ publication_status: 'public_allowed' })], size: 32 });
  assert.equal(manifest.assets[0].publication_status, 'local_only');
});

test('source class priority survives every manifest ordering and preserves legacy provenance', () => {
  const classes = ['source_cutout', 'source_neutral_optimized', 'source_derived', 'generated_from_evidence'];
  const assets = classes.map(representation_class => ({ material_id: 'm', spec_id: 's', representation_class, status: 'ready', file: `${representation_class}.png` }));
  const permutations = rows => rows.length ? rows.flatMap((row, i) => permutations(rows.filter((_, j) => j !== i)).map(rest => [row, ...rest])) : [[]];
  for (let rank = 0; rank < classes.length; rank++) {
    for (const localAssets of permutations(assets.slice(rank))) {
      const before = structuredClone(localAssets);
      const chosen = resolveMaterialAsset({ materialId: 'm', specId: 's', localAssets });
      assert.equal(chosen.representation_class, classes[rank]);
      assert.equal(chosen.url, `/assets/local/${classes[rank]}.png`);
      assert.deepEqual(localAssets, before, 'selection must not mutate the manifest');
    }
  }
});

test('class priority outranks storage origin while public rights and exact identity remain required', () => {
  const asset = (representation_class, extra = {}) => ({ material_id: 'm', spec_id: 's', representation_class, status: 'ready', file: `${representation_class}.png`, ...extra });
  const options = { materialId: 'm', specId: 's', localAssets: [asset('source_derived')], trackedAssets: [asset('source_cutout', { publication_status: 'public_allowed', rights_status: 'owned', url: '/public-cutout.png' })] };
  assert.equal(resolveMaterialAsset(options).url, '/public-cutout.png');
  for (const rejected of [{ rights_status: 'unknown' }, { publication_status: 'local_only' }, { needs_mask: true }, { status: 'pending' }, { rights_status: 'prohibited' }, { material_id: 'other' }, { spec_id: 'other' }]) {
    assert.equal(resolveMaterialAsset({ ...options, trackedAssets: options.trackedAssets.map(a => ({ ...a, ...rejected })) }).representation_class, 'source_derived');
  }
  for (const rejected of [{ needs_mask: true }, { status: 'pending' }, { rights_status: 'prohibited' }, { material_id: 'other' }, { spec_id: 'other' }, { file: '../unsafe.png' }]) {
    assert.equal(resolveMaterialAsset({ materialId: 'm', specId: 's', localAssets: [asset('source_cutout', rejected), asset('source_neutral_optimized')] }).representation_class, 'source_neutral_optimized');
  }
});

test('generated source retains its provenance and remains below real source selection', async (t) => {
  const rootDir = fixture(t);
  fs.writeFileSync(path.join(rootDir, 'inputs/local-assets/sample.png'), syntheticPng());
  const manifest = await processLocalAssets({ rootDir, records: [record({ source_type: 'generated_from_evidence' })], size: 32 });
  assert.equal(manifest.assets[0].representation_class, 'generated_from_evidence');
  const chosen = resolveMaterialAsset({ materialId: 'explicit-material', specId: 'explicit-8', localAssets: manifest.assets });
  assert.equal(chosen.representation_class, 'generated_from_evidence');
  assert.match(chosen.url, /^\/assets\/local\//);
  await assert.rejects(processLocalAssets({ rootDir, records: [record({ source_type: 'invented-class' })] }), /source_type/);
});

test('unsafe Windows path spellings and symlinked destination cannot write outside local roots', async (t) => {
  const rootDir = fixture(t);
  fs.writeFileSync(path.join(rootDir, 'inputs/local-assets/sample.png'), syntheticPng());
  for (const file of ['.. /secret.png', 'folder./secret.png', 'NUL', 'sample.png:secret', undefined]) {
    await assert.rejects(processLocalAssets({ rootDir, records: [record({ file })] }), /path|file/i);
    assert.throws(() => assertSafeLocalPath(rootDir, file), /path/i);
  }
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'crystal-p4-destination-'));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.mkdirSync(path.join(rootDir, 'workbench/assets'), { recursive: true });
  fs.symlinkSync(outside, path.join(rootDir, 'workbench/assets/local'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(processLocalAssets({ rootDir, records: [record()] }), /symlink|path/i);
  assert.deepEqual(fs.readdirSync(outside), []);
});

test('manifest reader fails closed on symlinked state and malformed records', (t) => {
  const rootDir = fixture(t);
  fs.mkdirSync(path.join(rootDir, 'workbench/state'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'workbench/state/local-asset-manifest.json'), JSON.stringify({ version: 1, assets: [null] }));
  const result = loadLocalAssetManifest({ rootDir });
  assert.deepEqual(result.assets, []); assert.match(result.error, /manifest/i);
  fs.renameSync(path.join(rootDir, 'workbench/state'), path.join(rootDir, 'workbench/state-original'));
  fs.symlinkSync(path.join(rootDir, 'workbench/state-original'), path.join(rootDir, 'workbench/state'), process.platform === 'win32' ? 'junction' : 'dir');
  const linked = loadLocalAssetManifest({ rootDir });
  assert.deepEqual(linked.assets, []); assert.match(linked.error, /symlink|path/i);
});

test('transparent WebP and interlaced PNG become source cutouts with identical centered dimensions', async (t) => {
  const rootDir = fixture(t);
  const source = syntheticPng();
  fs.writeFileSync(path.join(rootDir, 'inputs/local-assets/sample.webp'), await sharp(source).webp({ lossless: true }).toBuffer());
  fs.writeFileSync(path.join(rootDir, 'inputs/local-assets/interlaced.png'), await sharp(source).png({ progressive: true }).toBuffer());
  const manifest = await processLocalAssets({ rootDir, records: [record({ file: 'sample.webp' }), record({ file: 'interlaced.png', spec_id: 'interlaced' })], size: 32 });
  for (const asset of manifest.assets) {
    assert.equal(asset.status, 'ready'); assert.equal(asset.needs_mask, false);
    assert.equal(asset.representation_class, 'source_cutout');
    assert.deepEqual(asset.source_bounds, { left: 3, top: 1, width: 2, height: 4 });
    const output = await sharp(resolveLocalAssetPath({ rootDir, file: asset.file })).metadata();
    assert.equal(output.width, 32); assert.equal(output.height, 32); assert.equal(output.hasAlpha, true);
  }
});

test('genuine opaque JPEG and WebP are decoded but remain needs_mask instead of unsupported or false cutouts', async (t) => {
  const rootDir = fixture(t);
  const source = syntheticPng({ opaque: true });
  fs.writeFileSync(path.join(rootDir, 'inputs/local-assets/sample.jpg'), await sharp(source).jpeg().toBuffer());
  fs.writeFileSync(path.join(rootDir, 'inputs/local-assets/sample.webp'), await sharp(source).webp().toBuffer());
  const manifest = await processLocalAssets({ rootDir, records: [record({ file: 'sample.jpg' }), record({ file: 'sample.webp', spec_id: 'opaque-webp' })], size: 32 });
  for (const asset of manifest.assets) {
    assert.equal(asset.reason, 'OPAQUE_SOURCE_NEEDS_MASK');
    assert.equal(asset.status, 'pending'); assert.equal(asset.file, null); assert.equal(asset.needs_mask, true);
  }
});
