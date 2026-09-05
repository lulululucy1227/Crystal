import { aggregateBom, compareExpectedBom } from './bom.mjs';
import { fitEstimate } from './bracelet-fit.mjs';

export const THEMES = Object.freeze(['Mountain', 'Ocean', 'Forest', 'Sunrise', 'Starlight', 'Glacier']);
export const SOURCE_STATUSES = new Set(['APPROVED', 'PROPOSED', 'UNRESOLVED']);
export const STRUCTURE_FIELDS = Object.freeze(['archetype', 'symmetry', 'focal_strategy', 'bead_rhythm', 'metal_level', 'negative_space', 'wear_language']);
const text = value => typeof value === 'string' && value.trim().length > 0;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
const identityKey = (material, spec) => JSON.stringify([material, spec]);
const meaningful = value => text(value) || (Array.isArray(value) && value.length > 0 && value.every(text))
  || (object(value) && Object.keys(value).length > 0);

function proposalMatches(proposal, design, bead) {
  if (!object(proposal)) return false;
  const designMatches = proposal.design_id === design.design_id || (Array.isArray(proposal.design_ids) && proposal.design_ids.includes(design.design_id));
  const themeMatches = proposal.theme === design.theme || (Array.isArray(proposal.themes) && proposal.themes.includes(design.theme));
  // Display names can link a design proposal, but never establish trusted procurement mapping.
  const materialMatches = proposal.material_id === bead.material_id || proposal.requested_material?.material_id === bead.material_id
    || [bead.material_id, bead.display_name_zh, bead.display_name_en].includes(proposal.requested_material);
  const specMatches = proposal.spec_id === bead.spec_id || proposal.requested_spec === bead.spec_id || proposal.requested_spec?.spec_id === bead.spec_id;
  return designMatches && themeMatches && materialMatches && specMatches
    && ['requested_material', 'requested_spec', 'why_needed', 'acceptable_substitute', 'impact_if_rejected', 'evidence_or_design_reason'].every(key => meaningful(proposal[key]));
}

export function structureFingerprint(design) {
  return STRUCTURE_FIELDS.map(key => String(design?.structure_signature?.[key] || '').trim().toLowerCase()).join('|');
}

// Maps contract fields without rewriting authored wording or approval statuses.
export function designToStateInput(design) {
  const source = structuredClone(design);
  return {
    designId: source.design_id, name: source.zh_name, theme: source.theme,
    wristCm: source.target_wrist_cm, layoutMode: 'bracelet', design: source,
    instances: (source.beads || []).map((bead, index) => ({
      ...bead,
      instanceId: bead.instance_id || `${source.design_id}:bead:${bead.position}`,
      materialId: bead.material_id, specId: bead.spec_id,
      materialName: bead.display_name_zh || bead.display_name_en || bead.material_id,
      displayNameZh: bead.display_name_zh || '', displayNameEn: bead.display_name_en || '',
      sizeMm: bead.size_mm, sourceStatus: bead.source_status,
      assetRef: bead.asset_ref || bead.assetRef || '',
      provenanceClass: bead.provenance_class || bead.provenanceClass || 'fallback',
      mappingStatus: source.validation?.instance_mapping?.[index]?.mapping_status || 'NOT_CHECKED',
      slotIndex: index,
    })),
  };
}

export function normalizeDesign(design) { return designToStateInput(design); }

export function validateDesignPackage(pkg, { approvedMappings, materialChangeProposals = [] } = {}) {
  const errors = [], warnings = [], designs = [];
  if (!object(pkg)) return { ok: false, errors: ['package must be an object'], warnings, designs };
  if (pkg.version !== 'CRYSTAL-NATURE-LAUNCH-V1') errors.push('version must be CRYSTAL-NATURE-LAUNCH-V1');
  if (pkg.status !== 'CANDIDATE') errors.push('status must be CANDIDATE');
  if (!Array.isArray(pkg.themes) || pkg.themes.length !== 6 || new Set(pkg.themes).size !== 6 || THEMES.some(theme => !pkg.themes.includes(theme))) errors.push('themes must cover exactly the six contract themes');
  if (!Array.isArray(pkg.designs)) return { ok: false, errors: [...errors, 'designs must be an array'], warnings, designs };
  if (pkg.designs.length !== 18) errors.push('designs must contain exactly 18 launch candidates');
  for (const theme of THEMES) if (pkg.designs.filter(design => design?.theme === theme).length < 3) errors.push(`${theme}: at least three designs required`);
  const mappingProvided = Array.isArray(approvedMappings);
  const mappingKeys = new Set((mappingProvided ? approvedMappings : []).filter(object).map(row => identityKey(row.material_id ?? row.materialId, row.spec_id ?? row.specId)));
  const ids = new Set();
  const fingerprints = new Map();
  for (const [index, input] of pkg.designs.entries()) {
    if (!object(input)) { errors.push(`design[${index}] must be an object`); continue; }
    const design = structuredClone(input), localErrors = [], localWarnings = [];
    const id = text(design.design_id) ? design.design_id : `design[${index}]`;
    for (const key of ['design_id', 'theme', 'zh_name', 'en_name', 'scene', 'construction']) if (!text(design[key])) localErrors.push(`${key} must be nonempty text`);
    if (ids.has(id)) localErrors.push('design_id must be unique');
    ids.add(id);
    if (!THEMES.includes(design.theme)) localErrors.push('theme is not a contract theme');
    if (!positive(design.target_wrist_cm)) localErrors.push('target_wrist_cm must be positive');
    for (const key of ['color_language', 'alternatives', 'sample_notes', 'procurement_questions', 'material_change_proposals']) if (!Array.isArray(design[key])) localErrors.push(`${key} must be an array`);
    for (const key of STRUCTURE_FIELDS) if (!text(design.structure_signature?.[key])) localErrors.push(`structure_signature.${key} must be nonempty text`);
    const beads = Array.isArray(design.beads) ? design.beads : [];
    if (!beads.length) localErrors.push('beads must be a nonempty array');
    const statuses = { approved: 0, proposed: 0, unresolved: 0, mapped: 0, unmapped: 0, not_checked: 0 };
    const instanceMapping = [];
    let validBomInputs = true;
    for (const [beadIndex, bead] of beads.entries()) {
      const label = `beads[${beadIndex}]`;
      if (!object(bead)) { localErrors.push(`${label} must be an object`); validBomInputs = false; continue; }
      if (bead.position !== beadIndex + 1) localErrors.push(`${label}.position must be continuous, unique and in sequence`);
      for (const key of ['material_id', 'spec_id', 'display_name_zh', 'display_name_en', 'form', 'role']) if (!text(bead[key])) localErrors.push(`${label}.${key} must be nonempty text`);
      if (!positive(bead.size_mm)) localErrors.push(`${label}.size_mm must be a positive number`);
      if (!Number.isInteger(bead.quantity) || bead.quantity < 1) { localErrors.push(`${label}.quantity must be a positive integer`); validBomInputs = false; }
      if (bead.quantity > 1 && !text(bead.quantity_note) && !text(bead.component_description)) localErrors.push(`${label}.quantity > 1 requires quantity_note or component_description`);
      if (!SOURCE_STATUSES.has(bead.source_status)) localErrors.push(`${label}.source_status must be APPROVED|PROPOSED|UNRESOLVED`);
      else statuses[bead.source_status.toLowerCase()] += 1;
      if (bead.source_status === 'PROPOSED') {
        const references = Array.isArray(design.material_change_proposals) ? design.material_change_proposals : [];
        const external = Array.isArray(materialChangeProposals) ? materialChangeProposals : [];
        const proposals = references.flatMap(reference => object(reference) ? [reference] : external.filter(proposal => proposal?.proposal_id === reference));
        if (!proposals.some(proposal => proposalMatches(proposal, design, bead))) localErrors.push(`${label}: PROPOSED material/spec requires a complete matching material_change_proposal`);
      }
      const mapped = mappingProvided && mappingKeys.has(identityKey(bead.material_id, bead.spec_id));
      const mappingStatus = !mappingProvided ? 'NOT_CHECKED' : mapped ? 'MAPPED' : 'UNMAPPED';
      statuses[mappingStatus.toLowerCase()] += 1;
      instanceMapping.push({ position: bead.position, material_id: bead.material_id, spec_id: bead.spec_id, source_status: bead.source_status, mapping_status: mappingStatus });
    }
    const actualBom = validBomInputs ? aggregateBom(beads) : [];
    const comparison = compareExpectedBom(actualBom, design.expected_bom);
    if (!comparison.match) localErrors.push(...comparison.differences);
    if (statuses.proposed) localWarnings.push(`${statuses.proposed} PROPOSED instances await procurement approval`);
    if (statuses.unresolved) localWarnings.push(`${statuses.unresolved} UNRESOLVED instances cannot be final approved materials`);
    if (statuses.not_checked) localWarnings.push('material/spec mapping NOT_CHECKED: no trusted Working Version mappings supplied');
    if (statuses.unmapped) localWarnings.push(`${statuses.unmapped} material/spec instances UNMAPPED to trusted Working Version`);
    const fit = fitEstimate({ wristCm: design.target_wrist_cm, instances: beads });
    if (fit.status !== 'fit') localWarnings.push(`fit estimate: ${fit.status}; not a physical wear guarantee`);
    const fingerprint = structureFingerprint(design);
    if (!fingerprints.has(fingerprint)) fingerprints.set(fingerprint, []);
    fingerprints.get(fingerprint).push(designs.length);
    design.validation = {
      status: localErrors.length ? 'FAIL' : localWarnings.length ? 'WARN' : 'PASS',
      errors: localErrors, warnings: localWarnings,
      fit_estimate: { target_mm: fit.targetMm, used_mm: fit.usedMm, delta_mm: fit.deltaMm, status: fit.status, confidence: fit.confidence },
      bom_match: comparison.match, actual_bom: actualBom, material_mapping: statuses, instance_mapping: instanceMapping,
      asset_fallback_count: null, asset_validation: 'NOT_RUN', duplicate_structure_warning: false, browser_preview: null, browser_validation: 'NOT_RUN',
    };
    designs.push(design);
  }
  for (const indices of fingerprints.values()) if (indices.length > 1) {
    for (const index of indices) {
      const validation = designs[index].validation;
      validation.duplicate_structure_warning = true;
      validation.warnings.push(`duplicate structure fingerprint: ${indices.filter(i => i !== index).map(i => designs[i].design_id).join(', ')}`);
      if (validation.status === 'PASS') validation.status = 'WARN';
    }
  }
  for (const design of designs) {
    errors.push(...design.validation.errors.map(message => `${design.design_id}: ${message}`));
    warnings.push(...design.validation.warnings.map(message => `${design.design_id}: ${message}`));
  }
  return { ok: errors.length === 0, errors, warnings, designs, fixture: pkg.fixture === true };
}
