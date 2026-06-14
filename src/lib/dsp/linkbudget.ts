/**
 * Link-budget building blocks: path-loss models, thermal noise, received power,
 * and a log-normal shadowing fade margin. Proakis & Salehi §7.7 (Link Budget)
 * and §10.1.1 (shadowing).
 */

import { qfuncInv } from '@/lib/dsp/math';

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

const BOLTZMANN = 1.380649e-23; // Boltzmann constant, J/K

/** Thermal noise power in dBm over bandwidth B (Hz) at temperature T (K): N = kTB. */
export function thermalNoiseDbm(bandwidthHz: number, tempK: number): number {
  return 10 * Math.log10(BOLTZMANN * tempK * bandwidthHz * 1000); // W → mW
}

/** Receiver noise floor (dBm): thermal noise plus the noise figure. */
export function noiseFloorDbm(bandwidthHz: number, tempK: number, noiseFigureDb: number): number {
  return thermalNoiseDbm(bandwidthHz, tempK) + noiseFigureDb;
}

/** Received power (dBm) = Tx power + Tx/Rx antenna gains − path loss − other losses. */
export function receivedPowerDbm(
  txDbm: number,
  txGainDbi: number,
  rxGainDbi: number,
  pathLossDb: number,
  otherLossDb: number,
): number {
  return txDbm + txGainDbi + rxGainDbi - pathLossDb - otherLossDb;
}

/**
 * Log-normal shadowing fade margin (dB) for a target outage probability:
 *   P_out = Q(M / σ)  ⇒  M = σ · Q⁻¹(P_out).
 * σ = 0 (no shadowing) gives 0 margin. Proakis §10.1.1 / §7.7.
 */
export function fadeMarginDb(shadowSigmaDb: number, targetOutage: number): number {
  if (shadowSigmaDb <= 0) return 0;
  return shadowSigmaDb * qfuncInv(targetOutage);
}
