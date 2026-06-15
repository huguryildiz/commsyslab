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

/**
 * Occupied (fractional-energy) bandwidth: the band [fLo, fHi] holding the central
 * `fraction` of the total spectral energy, trimming (1−fraction)/2 from each tail
 * of the cumulative energy. Unlike a null-to-null threshold walk this is integral-
 * based, so it never jumps on deep/near-zero nulls and is invariant to a time shift
 * (which leaves |X(f)| unchanged). Proakis & Salehi §2.7 (essential bandwidth).
 */
export function occupiedBandwidth(freq: number[], mag: number[], fraction = 0.99): Bandwidth {
  const n = mag.length;
  if (n === 0) return { fLo: 0, fHi: 0, W: 0 };
  const total = mag.reduce((s, m) => s + m * m, 0);
  if (total <= 0) return { fLo: freq[0], fHi: freq[0], W: 0 };
  const tail = ((1 - fraction) / 2) * total;

  let cum = 0;
  let lo = 0;
  for (let i = 0; i < n; i++) {
    cum += mag[i] * mag[i];
    if (cum >= tail) { lo = i; break; }
  }
  cum = 0;
  let hi = n - 1;
  for (let i = n - 1; i >= 0; i--) {
    cum += mag[i] * mag[i];
    if (cum >= tail) { hi = i; break; }
  }
  if (hi < lo) hi = lo;
  return { fLo: freq[lo], fHi: freq[hi], W: freq[hi] - freq[lo] };
}

/**
 * Main-lobe null-to-null bandwidth: the width of the lobe straddling the spectral
 * peak, bounded on each side by the first spectral null. Robust for sinc-type
 * spectra whose side lobes never fall under a fixed absolute threshold — each bound
 * is the first local minimum that dips below 10 % of the peak (a true null), with a
 * 1 %-of-peak fallback for monotone shapes (e.g. Gaussian) that have no null.
 * Proakis & Salehi §2.7 (null-to-null transmission bandwidth).
 */
export function mainLobeBandwidth(freq: number[], mag: number[]): Bandwidth {
  const p = peakIndex(mag);
  const valley = 0.1 * mag[p];
  const floor = 0.01 * mag[p];
  const isNull = (i: number, step: number): boolean => {
    const prev = mag[i - step] ?? Infinity;
    const next = mag[i + step] ?? Infinity;
    return (mag[i] < valley && mag[i] <= prev && mag[i] <= next) || mag[i] < floor;
  };
  let hi = p;
  for (let i = p + 1; i < mag.length; i++) { hi = i; if (isNull(i, 1)) break; }
  let lo = p;
  for (let i = p - 1; i >= 0; i--) { lo = i; if (isNull(i, -1)) break; }
  return { fLo: freq[lo], fHi: freq[hi], W: freq[hi] - freq[lo] };
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
