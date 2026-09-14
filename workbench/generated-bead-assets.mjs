// User-approved illustrations. These are not source photographs or verified material identities.
const entries = [
  ['clear-quartz', 'Clear Quartz', '白水晶', 'crystals'],
  ['aquamarine', 'Aquamarine', '海蓝宝', 'crystals'],
  ['labradorite', 'Labradorite', '拉长石', 'crystals'],
  ['white-phantom-quartz', 'White Phantom Quartz', '白幽灵', 'crystals'],
  ['tahitian-pearl', 'Tahitian Pearl', '大溪地珍珠', 'pearls'],
  ['amethyst', 'Amethyst', '紫水晶', 'crystals'],
  ['moonstone', 'Moonstone', '月光石', 'crystals'],
];
const bounds = {
  'clear-quartz': [48,52,672,664], aquamarine: [49,48,670,672], labradorite: [48,48,672,671],
  'white-phantom-quartz': [50,48,668,672], 'tahitian-pearl': [48,49,672,669],
  amethyst: [48,53,672,661], moonstone: [48,48,672,671],
};

export const generatedBeadMaterials = Object.freeze(entries.map(([key, en, zh, category]) => Object.freeze({
  key, name: en, displayNameEn: en, displayNameZh: zh, category,
})));

export function resolveGeneratedBead(name) {
  const entry = generatedBeadMaterials.find(item => name === item.name || name === item.displayNameZh);
  if (!entry) return undefined;
  const [left, top, width, height] = bounds[entry.key];
  return {
    imageUrl: `/assets/catalog/generated/translucent-v1/${entry.key}.png`,
    assetRef: `generated:translucent-v1:${entry.key}`,
    assetKey: `translucent-v1-${entry.key}`,
    displayNameZh: entry.displayNameZh,
    displayNameEn: entry.displayNameEn,
    provenanceClass: 'generated_from_evidence',
    identityStatus: 'illustrative_not_verified',
    sizeStatus: 'planning_size_not_verified',
    subjectBounds: {left, top, width, height},
  };
}
