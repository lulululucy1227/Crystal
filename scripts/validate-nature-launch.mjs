import { readFileSync } from 'node:fs';

const file = 'outputs/designs/nature-launch-v1.json';
const pack = JSON.parse(readFileSync(file, 'utf8'));
const requiredThemes = ['Mountain','Ocean','Forest','Sunrise','Starlight','Glacier'];
const errors = [];
if (pack.designs.length !== 18) errors.push(`expected 18 designs, got ${pack.designs.length}`);
for (const theme of requiredThemes) {
  const designs = pack.designs.filter(d => d.theme === theme);
  if (designs.length !== 3) errors.push(`${theme} has ${designs.length} designs`);
  const fingerprints = new Set(designs.map(d => [d.structure_signature.archetype,d.structure_signature.symmetry,d.structure_signature.focal_strategy,d.structure_signature.bead_rhythm,d.structure_signature.metal_level,d.structure_signature.negative_space].join('|')));
  if (fingerprints.size !== 3) errors.push(`${theme} has duplicate structure fingerprints`);
}
for (const d of pack.designs) {
  const positions = d.beads.map(b => b.position);
  if (!positions.every((p, i) => p === i + 1)) errors.push(`${d.design_id} has non-continuous positions`);
  const total = d.beads.reduce((sum, b) => sum + b.size_mm, 0);
  if (total !== 165) errors.push(`${d.design_id} has ${total}mm, expected 165mm`);
  if (d.target_wrist_cm !== 16) errors.push(`${d.design_id} target wrist is not 16cm`);
  const actual = new Map();
  for (const b of d.beads) actual.set(`${b.material_id}|${b.spec_id}`, (actual.get(`${b.material_id}|${b.spec_id}`) ?? 0) + 1);
  for (const b of d.expected_bom) if (actual.get(`${b.material_id}|${b.spec_id}`) !== b.quantity) errors.push(`${d.design_id} BOM mismatch for ${b.spec_id}`);
  if (d.beads.some(b => b.source_status !== 'PROPOSED')) errors.push(`${d.design_id} has an unexpected material status`);
  if (!d.material_change_proposals.length) errors.push(`${d.design_id} lacks a change proposal`);
}
if (errors.length) throw new Error(errors.join('\n'));
console.log(JSON.stringify({status:'PASS',design_count:pack.designs.length,themes:requiredThemes,checks:['continuous positions','165mm fit estimate','BOM aggregation','PROPOSED status','theme structure fingerprints']}, null, 2));
