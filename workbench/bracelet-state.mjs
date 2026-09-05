const trayAllowanceMm = 5;
let instanceSequence = 0;

const positiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const clone = (value) => JSON.parse(JSON.stringify(value));
const angleFor = (slotIndex, capacity) => ((Number(slotIndex) / Math.max(1, capacity)) * 360) - 90;
const targetFor = (wristCm) => (positiveNumber(wristCm, 17) * 10) + trayAllowanceMm;
const capacityFor = (targetMm, fallbackBeadMm) => Math.max(1, Math.round(targetMm / positiveNumber(fallbackBeadMm, 8)));
const nextInstanceId = () => `bead-${Date.now().toString(36)}-${(++instanceSequence).toString(36)}`;
const isStudio = (state) => state.layoutMode === 'loose' || state.layoutMode === 'bracelet';
const slug = (name) => String(name || 'material').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'material';

function loosePoint(x, y, index = 0) {
  const angle = index * 2.399963229728653;
  const radius = 0.12 + 0.24 * ((index % 9) / 8);
  let looseX = Number.isFinite(Number(x)) && x != null ? Number(x) : 0.5 + Math.cos(angle) * radius;
  let looseY = Number.isFinite(Number(y)) && y != null ? Number(y) : 0.5 + Math.sin(angle) * radius;
  const distance = Math.hypot(looseX - 0.5, looseY - 0.5);
  if (distance > 0.5) {
    looseX = 0.5 + (looseX - 0.5) * 0.5 / distance;
    looseY = 0.5 + (looseY - 0.5) * 0.5 / distance;
  }
  return { looseX, looseY };
}

function normalizeInstance(item, fallbackBeadMm, index) {
  // The authored contract remains in state.design. Runtime instances have one
  // authority for each field so edits cannot expose stale snake-case aliases.
  item = { ...item };
  const aliases = {
    instance_id: 'instanceId', material_id: 'materialId', spec_id: 'specId',
    display_name_zh: 'displayNameZh', display_name_en: 'displayNameEn',
    size_mm: 'sizeMm', source_status: 'sourceStatus', asset_ref: 'assetRef',
    provenance_class: 'provenanceClass', representation_class: 'provenanceClass',
    mapping_status: 'mappingStatus', unit_cost: 'unitCost', image_url: 'imageUrl',
  };
  for (const [alias, canonical] of Object.entries(aliases)) {
    if (item[canonical] == null && item[alias] != null) item[canonical] = item[alias];
    delete item[alias];
  }
  if (item.position != null && item.sourcePosition == null) item.sourcePosition = item.position;
  const materialName = item.materialName || item.displayNameEn || item.displayNameZh || item.materialId || 'Material';
  const sizeMm = positiveNumber(item.sizeMm, fallbackBeadMm);
  const materialId = item.materialId || `legacy-${slug(materialName)}`;
  return {
    ...item,
    instanceId: item.instanceId || nextInstanceId(),
    materialName,
    materialId,
    specId: item.specId || `${materialId}-${sizeMm}mm`,
    displayNameZh: item.displayNameZh || '',
    displayNameEn: item.displayNameEn || materialName,
    form: item.form || 'round',
    sizeMm,
    sourceStatus: item.sourceStatus == null ? 'PROPOSED' : ['APPROVED', 'PROPOSED', 'UNRESOLVED'].includes(item.sourceStatus) ? item.sourceStatus : 'UNRESOLVED',
    assetRef: item.assetRef || '',
    provenanceClass: item.provenanceClass || 'generated_from_evidence',
    slotIndex: Number.isInteger(item.slotIndex) ? item.slotIndex : index,
    ...loosePoint(item.looseX, item.looseY, index),
  };
}

function recalculate(state) {
  const wristCm = positiveNumber(state.wristCm, 17);
  const fallbackBeadMm = positiveNumber(state.fallbackBeadMm, 8);
  const targetCircumferenceMm = targetFor(wristCm);
  const capacity = capacityFor(targetCircumferenceMm, fallbackBeadMm);
  const normalized = (state.instances || []).map((item, index) => normalizeInstance(item, fallbackBeadMm, index));
  const totalSize = normalized.reduce((sum, item) => sum + item.sizeMm, 0);
  let cumulative = 0;
  const instances = normalized.map((item, index) => {
    const angle = state.layoutMode === 'bracelet'
      ? ((cumulative + item.sizeMm / 2) / Math.max(1, totalSize)) * 360 - 90
      : angleFor(item.slotIndex, capacity);
    cumulative += item.sizeMm;
    return { ...item, ...(item.position != null ? { position: index + 1 } : {}), slotIndex: isStudio(state) ? index : item.slotIndex, angle };
  });
  const usedCircumferenceMm = instances.reduce((sum, item) => sum + item.sizeMm, 0);
  return {
    ...state,
    wristCm,
    fallbackBeadMm,
    targetCircumferenceMm,
    capacity,
    instances,
    usedCircumferenceMm,
    remainingCircumferenceMm: targetCircumferenceMm - usedCircumferenceMm,
    overflowMm: Math.max(0, usedCircumferenceMm - targetCircumferenceMm),
  };
}

function legacyInstances(layout = [], items = [], fallbackBeadMm = 8) {
  const itemMap = new Map(items.map((item) => [item.name, item]));
  return layout.flatMap((materialName, slotIndex) => {
    if (!materialName) return [];
    const source = itemMap.get(materialName) || {};
    return [{
      instanceId: `legacy-${slotIndex}-${String(materialName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'material'}`,
      materialName,
      sizeMm: positiveNumber(source.sizeMm ?? source.beadMm, fallbackBeadMm),
      slotIndex,
      assetRef: source.assetRef || '',
      provenanceClass: source.provenanceClass || source.representation || 'generated_from_evidence',
    }];
  });
}

export function createBraceletState(input = {}) {
  const fallbackBeadMm = positiveNumber(input.fallbackBeadMm ?? input.beadMm, 8);
  const instances = Array.isArray(input.instances)
    ? input.instances.map((item) => ({ ...item }))
    : legacyInstances(input.layout, input.items, fallbackBeadMm);
  return recalculate({
    ...(input.layoutMode === 'loose' || input.layoutMode === 'bracelet' ? { layoutMode: input.layoutMode } : {}),
    ...(input.design && typeof input.design === 'object' ? { design: clone(input.design) } : {}),
    wristCm: positiveNumber(input.wristCm, 17),
    fallbackBeadMm,
    activeMaterialName: input.activeMaterialName || input.activeItemName || '',
    selectedInstanceId: input.selectedInstanceId || '',
    instances,
    unresolved: Array.isArray(input.unresolved) ? clone(input.unresolved) : [],
  });
}

export function selectMaterial(state, materialName) {
  return { ...state, activeMaterialName: materialName || '', selectedInstanceId: '' };
}

export function placeInstance(state, input = {}) {
  if (isStudio(state)) {
    if (!input.materialName && !input.materialId && !input.displayNameZh && !input.displayNameEn) return state;
    if (input.instanceId && state.instances.some((item) => item.instanceId === input.instanceId)) return state;
    const { type, targetIndex, ...fields } = input;
    const instance = normalizeInstance(fields, state.fallbackBeadMm, state.instances.length);
    return recalculate({ ...state, selectedInstanceId: instance.instanceId, instances: [...state.instances, instance] });
  }
  const slotIndex = Number(input.slotIndex);
  if (!input.materialName || !Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= state.capacity) return state;
  if (state.instances.length >= state.capacity) return state;
  let instances = state.instances;
  if (state.instances.some((item) => item.slotIndex === slotIndex)) {
    const occupied = new Set(state.instances.map((item) => item.slotIndex));
    let clockwiseDistance = 0;
    let counterClockwiseDistance = 0;
    for (let distance = 1; distance < state.capacity; distance += 1) {
      if (!clockwiseDistance && !occupied.has((slotIndex + distance) % state.capacity)) clockwiseDistance = distance;
      if (!counterClockwiseDistance && !occupied.has((slotIndex - distance + state.capacity) % state.capacity)) counterClockwiseDistance = distance;
      if (clockwiseDistance || counterClockwiseDistance) break;
    }
    const clockwise = clockwiseDistance && (!counterClockwiseDistance || clockwiseDistance <= counterClockwiseDistance);
    const distance = clockwise ? clockwiseDistance : counterClockwiseDistance;
    const moves = new Map();
    for (let step = distance; step >= 1; step -= 1) {
      const from = clockwise
        ? (slotIndex + step - 1) % state.capacity
        : (slotIndex - step + 1 + state.capacity) % state.capacity;
      const to = clockwise
        ? (slotIndex + step) % state.capacity
        : (slotIndex - step + state.capacity) % state.capacity;
      const occupant = state.instances.find((item) => item.slotIndex === from);
      if (occupant) moves.set(occupant.instanceId, to);
    }
    instances = state.instances.map((item) => moves.has(item.instanceId) ? { ...item, slotIndex: moves.get(item.instanceId) } : item);
  }
  const { type, ...fields } = input;
  const instance = {
    ...fields,
    instanceId: input.instanceId || nextInstanceId(),
    materialName: input.materialName,
    sizeMm: positiveNumber(input.sizeMm, state.fallbackBeadMm),
    slotIndex,
    angle: angleFor(slotIndex, state.capacity),
    assetRef: input.assetRef || '',
    provenanceClass: input.provenanceClass || 'generated_from_evidence',
  };
  return recalculate({ ...state, selectedInstanceId: instance.instanceId, instances: [...instances, instance] });
}

export function moveInstance(state, { instanceId, slotIndex, targetIndex, looseX, looseY } = {}) {
  const sourceIndex = state.instances.findIndex((item) => item.instanceId === instanceId);
  if (sourceIndex < 0) return state;
  if (state.layoutMode === 'loose') {
    if (!Number.isFinite(Number(looseX)) || !Number.isFinite(Number(looseY))) return state;
    const point = loosePoint(looseX, looseY);
    return recalculate({ ...state, selectedInstanceId: instanceId, instances: state.instances.map((item, index) => index === sourceIndex ? { ...item, ...point } : item) });
  }
  if (state.layoutMode === 'bracelet') {
    const target = Number(targetIndex ?? slotIndex);
    if (!Number.isInteger(target) || target < 0 || target >= state.instances.length || target === sourceIndex) return state;
    const instances = [...state.instances];
    instances.splice(target, 0, instances.splice(sourceIndex, 1)[0]);
    return recalculate({ ...state, selectedInstanceId: instanceId, instances });
  }
  const target = Number(slotIndex);
  const source = state.instances.find((item) => item.instanceId === instanceId);
  if (!source || !Number.isInteger(target) || target < 0 || target >= state.capacity || target === source.slotIndex) return state;
  const occupant = state.instances.find((item) => item.slotIndex === target);
  const instances = state.instances.map((item) => {
    if (item.instanceId === instanceId) return { ...item, slotIndex: target };
    if (occupant && item.instanceId === occupant.instanceId) return { ...item, slotIndex: source.slotIndex };
    return item;
  });
  return recalculate({ ...state, selectedInstanceId: instanceId, instances });
}

export function removeInstance(state, instanceId) {
  if (!state.instances.some((item) => item.instanceId === instanceId)) return state;
  return recalculate({
    ...state,
    selectedInstanceId: state.selectedInstanceId === instanceId ? '' : state.selectedInstanceId,
    instances: state.instances.filter((item) => item.instanceId !== instanceId),
  });
}

export function replaceInstance(state, input = {}) {
  const { instanceId, type, ...fields } = input;
  if ((!fields.materialName && !fields.materialId) || !state.instances.some((item) => item.instanceId === instanceId)) return state;
  return recalculate({
    ...state,
    instances: state.instances.map((item) => item.instanceId === instanceId ? {
      ...normalizeInstance({ ...fields, instanceId, ...(item.position != null ? { position: item.position, sourcePosition: item.sourcePosition } : {}), looseX: item.looseX, looseY: item.looseY, slotIndex: item.slotIndex }, state.fallbackBeadMm, item.slotIndex),
    } : item),
  });
}

export function setWristSize(state, wristCm) {
  if (isStudio(state)) return recalculate({ ...state, wristCm: positiveNumber(wristCm, state.wristCm) });
  const oldCapacity = state.capacity;
  const nextWristCm = positiveNumber(wristCm, state.wristCm);
  const nextCapacity = capacityFor(targetFor(nextWristCm), state.fallbackBeadMm);
  if (state.instances.length > nextCapacity) return state;
  const resized = recalculate({ ...state, wristCm: nextWristCm });
  const occupied = new Set();
  const instances = resized.instances.map((item) => {
    let slotIndex = Math.min(resized.capacity - 1, Math.round((item.slotIndex / Math.max(1, oldCapacity)) * resized.capacity));
    while (occupied.has(slotIndex) && occupied.size < resized.capacity) slotIndex = (slotIndex + 1) % resized.capacity;
    occupied.add(slotIndex);
    return { ...item, slotIndex };
  });
  return recalculate({ ...resized, instances });
}

export function setLayoutMode(state, mode) {
  if (!['loose', 'bracelet'].includes(mode) || mode === state.layoutMode) return state;
  return recalculate({ ...state, layoutMode: mode });
}

export function compactToBracelet(state) {
  return setLayoutMode(state, 'bracelet');
}

export function serializeBraceletState(state) {
  return clone({
    version: isStudio(state) ? 3 : 2,
    ...(isStudio(state) ? { layoutMode: state.layoutMode } : {}),
    ...(state.design ? { design: state.design } : {}),
    wristCm: state.wristCm,
    fallbackBeadMm: state.fallbackBeadMm,
    activeMaterialName: state.activeMaterialName,
    selectedInstanceId: state.selectedInstanceId,
    instances: state.instances,
    unresolved: state.unresolved,
  });
}

export function createHistory(initialState, limit = 50) {
  return { past: [], present: clone(initialState), future: [], limit: Math.max(1, Number(limit) || 50) };
}

function applyCommand(state, command = {}) {
  if (command.type === 'place') return placeInstance(state, command);
  if (command.type === 'move') return moveInstance(state, command);
  if (command.type === 'remove') return removeInstance(state, command.instanceId);
  if (command.type === 'replace') return replaceInstance(state, command);
  if (command.type === 'select-material') return selectMaterial(state, command.materialName);
  if (command.type === 'wrist') return setWristSize(state, command.wristCm);
  if (command.type === 'layout-mode') return setLayoutMode(state, command.layoutMode ?? command.mode);
  return state;
}

export function applyHistoryCommand(history, command) {
  const next = applyCommand(history.present, command);
  if (next === history.present) return history;
  return {
    ...history,
    past: [...history.past, clone(history.present)].slice(-history.limit),
    present: clone(next),
    future: [],
  };
}

export function commitHistoryState(history, nextState) {
  const current = serializeBraceletState(history.present);
  const next = serializeBraceletState(nextState);
  if (JSON.stringify(current) === JSON.stringify(next)) return history;
  return {
    ...history,
    past: [...history.past, clone(history.present)].slice(-history.limit),
    present: clone(nextState),
    future: [],
  };
}

export function undoHistory(history) {
  if (!history.past.length) return history;
  const previous = history.past.at(-1);
  return {
    ...history,
    past: history.past.slice(0, -1),
    present: clone(previous),
    future: [clone(history.present), ...history.future].slice(0, history.limit),
  };
}

export function redoHistory(history) {
  if (!history.future.length) return history;
  const next = history.future[0];
  return {
    ...history,
    past: [...history.past, clone(history.present)].slice(-history.limit),
    present: clone(next),
    future: history.future.slice(1),
  };
}
