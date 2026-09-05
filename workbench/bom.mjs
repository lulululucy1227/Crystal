const field = (row, camel, snake, fallback = '') => row?.[camel] ?? row?.[snake] ?? fallback;
const keyFor = row => JSON.stringify([field(row, 'materialId', 'material_id'), field(row, 'specId', 'spec_id'), field(row, 'sourceStatus', 'source_status', 'UNRESOLVED')]);
const quantityFor = row => row?.quantity === undefined ? 1 : row.quantity;

export function aggregateBom(instances = []) {
  const rows = new Map();
  for (const item of Array.isArray(instances) ? instances : []) {
    const key = keyFor(item);
    const quantity = quantityFor(item);
    if (!Number.isInteger(quantity) || quantity < 1) throw new TypeError('BOM quantity must be a positive integer');
    if (!rows.has(key)) rows.set(key, {
      materialId: field(item, 'materialId', 'material_id'),
      specId: field(item, 'specId', 'spec_id'),
      displayNameZh: field(item, 'displayNameZh', 'display_name_zh', item?.materialName || ''),
      displayNameEn: field(item, 'displayNameEn', 'display_name_en'),
      sizeMm: field(item, 'sizeMm', 'size_mm', null),
      form: item?.form || '',
      sourceStatus: field(item, 'sourceStatus', 'source_status', 'UNRESOLVED'),
      mappingStatus: field(item, 'mappingStatus', 'mapping_status', 'NOT_CHECKED'),
      quantity: 0,
    });
    const row = rows.get(key);
    row.quantity += quantity;
    const mapping = field(item, 'mappingStatus', 'mapping_status', 'NOT_CHECKED');
    if (row.mappingStatus !== mapping) row.mappingStatus = 'MIXED';
  }
  return [...rows.values()];
}

export function compareExpectedBom(actual, expected) {
  const differences = [];
  if (!Array.isArray(actual) || !Array.isArray(expected)) return { match: false, differences: ['expected_bom and actual BOM must be arrays'] };
  const index = (rows, label) => {
    const result = new Map();
    for (const row of rows) {
      const key = keyFor(row);
      if (!row || !field(row, 'materialId', 'material_id') || !field(row, 'specId', 'spec_id') || !Number.isInteger(row.quantity) || row.quantity < 1) {
        differences.push(`${label}: invalid identity/quantity ${key}`);
      }
      if (!['APPROVED', 'PROPOSED', 'UNRESOLVED'].includes(field(row, 'sourceStatus', 'source_status'))) differences.push(`${label}: invalid or missing source_status ${key}`);
      if (result.has(key)) differences.push(`${label}: duplicate BOM row ${key}`);
      result.set(key, (result.get(key) || 0) + (Number.isInteger(row?.quantity) ? row.quantity : 0));
    }
    return result;
  };
  const a = index(actual, 'actual'), e = index(expected, 'expected_bom');
  for (const key of new Set([...a.keys(), ...e.keys()])) {
    if (a.get(key) !== e.get(key)) differences.push(`BOM ${key}: actual ${a.get(key) ?? 0}, expected ${e.get(key) ?? 0}`);
  }
  return { match: differences.length === 0, differences };
}

// This is an explicit price-data interface, not a price discovery or inference mechanism.
export function knownCostSummary(instances = []) {
  const totals = {};
  let unknownQuantity = 0;
  let knownQuantity = 0;
  for (const item of instances) {
    const quantity = Number.isInteger(quantityFor(item)) && quantityFor(item) > 0 ? quantityFor(item) : 1;
    const cost = item?.unitCost ?? item?.unit_cost;
    if (!cost || typeof cost.amount !== 'number' || !Number.isFinite(cost.amount) || cost.amount < 0
      || !/^[A-Z]{3}$/.test(cost.currency || '') || typeof cost.source !== 'string' || !cost.source.trim()) {
      unknownQuantity += quantity;
      continue;
    }
    totals[cost.currency] = (totals[cost.currency] || 0) + cost.amount * quantity;
    knownQuantity += quantity;
  }
  for (const currency of Object.keys(totals)) totals[currency] = Math.round(totals[currency] * 1e6) / 1e6;
  return { totals, knownQuantity, unknownQuantity, complete: unknownQuantity === 0 && knownQuantity > 0,
    display: Object.entries(totals).map(([currency, amount]) => `${currency} ${amount.toFixed(2)}`).join(' + ') || '—' };
}
