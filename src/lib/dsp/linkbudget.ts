/**
 * Link-budget building blocks: path-loss models, thermal noise, received power,
 * and a log-normal shadowing fade margin. Proakis & Salehi §7.7 (Link Budget)
 * and §10.1.1 (shadowing).
 */

const C_LIGHT = 299792458; // speed of light, m/s

/** Free-space (Friis) path loss in dB: L = 20·log10(4π d f / c). Proakis §7.7. */
export function freeSpacePathLossDb(freqHz: number, distM: number): number {
  return 20 * Math.log10((4 * Math.PI * distM * freqHz) / C_LIGHT);
}

/**
 * Log-distance path loss: FSPL(d0) + 10·n·log10(d/d0), with path-loss exponent n
 * and reference distance d0 (m). n = 2 reduces to free space. Proakis §7.7.
 */
export function logDistancePathLossDb(
  freqHz: number,
  distM: number,
  n: number,
  d0M: number,
): number {
  return freeSpacePathLossDb(freqHz, d0M) + 10 * n * Math.log10(distM / d0M);
}

/**
 * Okumura–Hata urban path loss (dB), small/medium-city correction. Valid for
 * roughly 150–1500 MHz, base height 30–200 m, mobile height 1–10 m, d 1–20 km.
 * Proakis §10.1.1 (empirical path-loss models).
 */
export function hataUrbanPathLossDb(
  freqMHz: number,
  distKm: number,
  hBaseM: number,
  hMobileM: number,
): number {
  const logf = Math.log10(freqMHz);
  const aHm = (1.1 * logf - 0.7) * hMobileM - (1.56 * logf - 0.8);
  return (
    69.55 +
    26.16 * logf -
    13.82 * Math.log10(hBaseM) -
    aHm +
    (44.9 - 6.55 * Math.log10(hBaseM)) * Math.log10(distKm)
  );
}
