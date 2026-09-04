const trayAllowanceMm = 5;

export function addToSelection(items, source) {
  const existing = items.find((item) => item.name === source.name);
  if (existing) return items.map((item) => item.name === source.name ? { ...item, quantity: (Number(item.quantity) || 1) + 1 } : item);
  return [...items, { ...source, quantity: 1 }];
}

export function createTrayPlan({ wristCm = 17, beadMm = 8, items = [] }) {
  const wrist = Number(wristCm) || 17;
  const bead = Number(beadMm) || 8;
  const targetMm = wrist * 10 + trayAllowanceMm;
  const capacity = Math.max(1, Math.round(targetMm / bead));
  const planned = items.reduce((total, item) => total + Math.max(0, Number(item.quantity) || 0), 0);
  return { wristCm: wrist, beadMm: bead, targetMm, capacity, planned, remaining: capacity - planned, overflow: Math.max(0, planned - capacity) };
}

export function createBalancedLayout({ capacity, items = [] }) {
  const slots = Array(Math.max(0, Number(capacity) || 0)).fill(null);
  const remaining = items.map((item) => ({ name: item.name, count: Math.max(0, Number(item.quantity) || 0) })).filter((item) => item.name && item.count);
  const sequence = [];
  while (remaining.some((item) => item.count > 0) && sequence.length < slots.length) {
    for (const item of remaining) {
      if (item.count > 0 && sequence.length < slots.length) { sequence.push(item.name); item.count -= 1; }
    }
  }
  for (const [index, name] of sequence.entries()) {
    const preferred = Math.floor(((index + 0.5) / sequence.length) * slots.length);
    let target = preferred;
    while (slots[target] !== null) target = (target + 1) % slots.length;
    slots[target] = name;
  }
  return slots;
}

export function placeMaterialAtSlot({ layout = [], slotIndex, materialName, allowedQuantity }) {
  const next = [...layout];
  const index = Number(slotIndex);
  if (!materialName || !Number.isInteger(index) || index < 0 || index >= next.length || next[index] !== null) return next;
  const used = next.filter((name) => name === materialName).length;
  if (used >= Math.max(0, Number(allowedQuantity) || 0)) return next;
  next[index] = materialName;
  return next;
}
