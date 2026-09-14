import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { resolveGeneratedBead, generatedBeadMaterials } from '../workbench/generated-bead-assets.mjs';

test('approved bead names resolve to exact illustration identities, never similar mineral names', () => {
  const expected = [
    ['Clear Quartz', '白水晶', 'clear-quartz'], ['Aquamarine', '海蓝宝', 'aquamarine'],
    ['Labradorite', '拉长石', 'labradorite'], ['White Phantom Quartz', '白幽灵', 'white-phantom-quartz'],
    ['Tahitian Pearl', '大溪地珍珠', 'tahitian-pearl'], ['Amethyst', '紫水晶', 'amethyst'],
    ['Moonstone', '月光石', 'moonstone'],
  ];
  for (const [en, zh, key] of expected) {
    const bead = resolveGeneratedBead(en);
    assert.equal(bead.displayNameZh, zh);
    assert.equal(bead.imageUrl, `/assets/catalog/generated/translucent-v1/${key}.png`);
    assert.equal(bead.provenanceClass, 'generated_from_evidence');
    assert.equal(resolveGeneratedBead(zh).assetKey, bead.assetKey);
  }
  for (const unknown of ['Rainbow Moonstone', '彩虹月光石', 'Clear Quartz AAA', '', null, '../aquamarine']) {
    assert.equal(resolveGeneratedBead(unknown), undefined);
  }
  assert.equal(generatedBeadMaterials.length, 7);
});

test('one placed bead cannot mutate the shared image lookup of later beads', () => {
  const first = resolveGeneratedBead('Aquamarine');
  first.imageUrl = '/wrong.png';
  first.subjectBounds = { left: 99, top: 99, width: 1, height: 1 };
  const next = resolveGeneratedBead('Aquamarine');
  assert.notEqual(next.imageUrl, first.imageUrl);
  assert.notDeepEqual(next.subjectBounds, first.subjectBounds);
  assert.equal(next.identityStatus, 'illustrative_not_verified');
  assert.equal(next.sizeStatus, 'planning_size_not_verified');
});

test('every shipping illustration is a provenance-embedded real-alpha PNG matching its runtime bounds', async () => {
  const base = new URL('../workbench/assets/catalog/generated/translucent-v1/', import.meta.url);
  const manifest = JSON.parse(await fs.readFile(new URL('manifest.json', base), 'utf8'));
  assert.equal(manifest.entries.length, 7);
  assert.equal(manifest.source_photo, false);
  for (const item of generatedBeadMaterials) {
    const descriptor = resolveGeneratedBead(item.name);
    const recorded = manifest.entries.find(e => e.file === `${item.key}.png`);
    assert.ok(recorded);
    const bytes = await fs.readFile(new URL(recorded.file, base));
    assert.ok(bytes.includes(Buffer.from('impeccable:prompt')));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), recorded.sha256);
    const {data, info} = await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(info.channels, 4);
    assert.equal(crypto.createHash('sha256').update(data).digest('hex'), recorded.pixelSha256);
    const {left, top, width, height} = recorded.subjectBounds;
    assert.deepEqual(descriptor.subjectBounds, {left, top, width, height});
    let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
    for (let y=0; y<info.height; y++) for (let x=0; x<info.width; x++) {
      const alpha = data[(y*info.width+x)*4+3];
      if (x<40 || y<40 || x>=info.width-40 || y>=info.height-40) assert.equal(alpha, 0);
      if (alpha) { minX=Math.min(minX,x); minY=Math.min(minY,y); maxX=Math.max(maxX,x); maxY=Math.max(maxY,y); }
    }
    assert.deepEqual({left:minX,top:minY,width:maxX-minX+1,height:maxY-minY+1}, descriptor.subjectBounds);
  }
});
