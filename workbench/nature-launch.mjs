import { THEMES, STRUCTURE_FIELDS, structureFingerprint } from './design-package.mjs';

export function buildLaunchBoard(packageValidation = {}) {
  const designs = Array.isArray(packageValidation.designs) ? packageValidation.designs : [];
  return THEMES.map(theme => ({ theme, cards: designs.filter(design => design?.theme === theme).map(design => ({
    designId: design.design_id, zhName: design.zh_name, enName: design.en_name,
    archetype: design.structure_signature?.archetype || '',
    coreMaterials: [...new Set((design.beads || []).map(bead => bead.display_name_zh || bead.display_name_en || bead.material_id))],
    wristCm: design.target_wrist_cm,
    materialStatus: structuredClone(design.validation?.material_mapping || { approved: 0, proposed: 0, unresolved: 0 }),
    validationStatus: design.validation?.status || 'NOT_RUN',
    duplicateStructureWarning: design.validation?.duplicate_structure_warning || false,
    warnings: [...(design.validation?.warnings || [])],
    beads: structuredClone(design.beads || []),
    browserPreview: design.validation?.browser_preview || null,
    fixture: packageValidation.fixture === true,
  })) }));
}

export function differenceMatrix(designs = []) {
  const normalized = value => String(value || '').trim().toLowerCase();
  const materialSet = design => new Set((design.beads || []).map(bead => bead.material_id).filter(Boolean));
  const rows = [];
  for (let i = 0; i < designs.length; i += 1) for (let j = i + 1; j < designs.length; j += 1) {
    const a = designs[i], b = designs[j];
    const aMaterials = materialSet(a), bMaterials = materialSet(b);
    const union = new Set([...aMaterials, ...bMaterials]);
    const intersection = [...aMaterials].filter(id => bMaterials.has(id)).length;
    rows.push({
      designA: a.design_id, designB: b.design_id, sameTheme: a.theme === b.theme,
      duplicateStructure: structureFingerprint(a) === structureFingerprint(b),
      structuralDifferences: STRUCTURE_FIELDS.filter(key => normalized(a.structure_signature?.[key]) !== normalized(b.structure_signature?.[key])),
      materialOverlap: union.size ? intersection / union.size : null,
    });
  }
  return rows;
}
