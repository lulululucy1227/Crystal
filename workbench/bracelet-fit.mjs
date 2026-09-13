// Along-string geometry is a screening estimate, never a physical wear guarantee.
export function fitEstimate({ wristCm, instances = [], allowanceMm = 5, wrapCount } = {}) {
  const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
  const rows = Array.isArray(instances) ? instances : [];
  let targetMm = positive(wristCm) && typeof allowanceMm === 'number' && Number.isFinite(allowanceMm) && allowanceMm >= 0
    ? wristCm * 10 + allowanceMm : null;
  let usedMm = 0;
  let missingSizeCount = 0;
  for (const instance of Array.isArray(instances) ? instances : []) {
    const size = instance?.sizeMm ?? instance?.size_mm;
    if (positive(size)) usedMm += size;
    else missingSizeCount += 1;
  }
  const round = value => Math.round(value * 1e6) / 1e6;
  usedMm = round(usedMm);
  const wraps = [1, 2, 3].includes(wrapCount) ? wrapCount : 1;
  const innerTargetMm = targetMm === null ? null : targetMm * wraps;
  // With explicit wrap controls, distinguish the centerline from the inner edge.
  // Mean cross-string thickness is provisional when only along-string sizes exist.
  const meanThickness = rows.length ? rows.reduce((sum, i) => sum + (positive(i?.thicknessMm) ? i.thicknessMm : positive(i?.sizeMm ?? i?.size_mm) ? (i.sizeMm ?? i.size_mm) : 0), 0) / rows.length : 0;
  const innerCorrectionMm = Math.PI * meanThickness * wraps;
  if (wrapCount != null && targetMm !== null) targetMm = round(innerTargetMm + innerCorrectionMm);
  const deltaMm = targetMm === null ? null : round(usedMm - targetMm);
  const status = targetMm === null || missingSizeCount || !Array.isArray(instances) ? 'unknown'
    : deltaMm < -5 ? 'underfilled' : deltaMm > 5 ? 'overflow' : 'fit';
  return { targetMm, usedMm, deltaMm, status, confidence: 'approximate', missingSizeCount, wrapCount: wraps, innerTargetMm, estimatedInnerMm: round(Math.max(0, usedMm - innerCorrectionMm)), thicknessAssumed: rows.some(i => !positive(i?.thicknessMm)) };
}
