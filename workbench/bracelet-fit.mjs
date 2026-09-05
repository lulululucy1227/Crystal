// Along-string geometry is a screening estimate, never a physical wear guarantee.
export function fitEstimate({ wristCm, instances = [], allowanceMm = 5 } = {}) {
  const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
  const targetMm = positive(wristCm) && typeof allowanceMm === 'number' && Number.isFinite(allowanceMm) && allowanceMm >= 0
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
  const deltaMm = targetMm === null ? null : round(usedMm - targetMm);
  const status = targetMm === null || missingSizeCount || !Array.isArray(instances) ? 'unknown'
    : deltaMm < -5 ? 'underfilled' : deltaMm > 5 ? 'overflow' : 'fit';
  return { targetMm, usedMm, deltaMm, status, confidence: 'approximate', missingSizeCount };
}
