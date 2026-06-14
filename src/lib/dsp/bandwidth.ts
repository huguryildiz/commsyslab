/**
 * Bandwidth measures on a magnitude spectrum (Proakis & Salehi §2.7).
 * "Bandwidth" depends on its definition; we expose null-to-null and 3-dB.
 */

export interface Bandwidth {
  fLo: number;
  fHi: number;
  W: number;
}

/** Frequency-bin index of the spectral peak. */
function peakIndex(mag: number[]): number {
  let k = 0;
  for (let i = 1; i < mag.length; i++) if (mag[i] > mag[k]) k = i;
  return k;
}

/** Null-to-null: widen left/right from the peak to the first near-zero crossings. */
export function nullToNullBandwidth(freq: number[], mag: number[]): Bandwidth {
  const p = peakIndex(mag);
  const thresh = mag[p] * 1e-3;
  let lo = p;
  while (lo > 0 && mag[lo] > thresh) lo--;
  let hi = p;
  while (hi < mag.length - 1 && mag[hi] > thresh) hi++;
  const fLo = freq[lo];
  const fHi = freq[hi];
  return { fLo, fHi, W: fHi - fLo };
}

/** Half-power (−3 dB): crossings at 1/√2 of the peak around the peak. */
export function halfPowerBandwidth(freq: number[], mag: number[]): Bandwidth {
  const p = peakIndex(mag);
  const level = mag[p] / Math.SQRT2;
  let lo = p;
  while (lo > 0 && mag[lo] >= level) lo--;
  let hi = p;
  while (hi < mag.length - 1 && mag[hi] >= level) hi++;
  const fLo = freq[lo];
  const fHi = freq[hi];
  return { fLo, fHi, W: fHi - fLo };
}
