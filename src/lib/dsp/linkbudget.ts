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

// ─────────────────────────────────────────────────────────────────────────────
// Analog-system transmission losses & noise — Proakis & Salehi §6.4
// (Reuses BOLTZMANN and freeSpacePathLossDb above.)
// ─────────────────────────────────────────────────────────────────────────────

/** Standard reference temperature T₀ = 290 K (Proakis §6.4.2). */
export const T0 = 290;

/** §6.4.1 — one-sided thermal-noise PSD N₀ = kT (W/Hz). */
export function noiseFloorN0(tempK: number): number {
  return BOLTZMANN * tempK;
}

/** §6.4.1 — available thermal noise power P_n = kTB (W). */
export function thermalNoisePower(tempK: number, bandwidthHz: number): number {
  return BOLTZMANN * tempK * bandwidthHz;
}

/** §6.4.2 — effective noise temperature Tₑ = T₀(F − 1) (K), F linear. */
export function noiseFigureToTemp(F: number, t0 = T0): number {
  return t0 * (F - 1);
}

/** §6.4.2 — noise figure F = 1 + Tₑ/T₀ (linear), from effective temperature. */
export function tempToNoiseFigure(Te: number, t0 = T0): number {
  return 1 + Te / t0;
}

export interface FriisStage {
  gainDb: number;
  noiseFigureDb: number;
}
export interface FriisResult {
  F: number; // linear total noise figure
  fDb: number; // dB
  Te: number; // equivalent effective temperature (K)
}

/** §6.4.2 — Friis cascade: F = F₁ + (F₂−1)/G₁ + (F₃−1)/(G₁G₂) + … */
export function friisCascade(stages: FriisStage[], t0 = T0): FriisResult {
  let F = 0;
  let gainProd = 1;
  for (let i = 0; i < stages.length; i++) {
    const Fi = 10 ** (stages[i].noiseFigureDb / 10);
    F += i === 0 ? Fi : (Fi - 1) / gainProd;
    gainProd *= 10 ** (stages[i].gainDb / 10);
  }
  return { F, fDb: 10 * Math.log10(F), Te: noiseFigureToTemp(F, t0) };
}

/** §6.4.3 — wireline loss L_dB = (dB/km)·km. */
export function cableLossDb(distanceKm: number, dbPerKm: number): number {
  return distanceKm * dbPerKm;
}

export interface RepeaterParams {
  ptDbW: number; // transmit power (dBW)
  perSegLossDb: number; // loss per segment L (dB)
  faDb: number; // repeater noise figure F_a (dB)
  tempK: number; // reference temperature for N₀
  bandwidthHz: number; // noise-equivalent bandwidth B
  segments: number; // K
}

/** §6.4.4 — output SNR (dB) for K equal repeater segments:
 *  (S/N)_o = P_T / (K · L · F_a · N₀ · B). */
export function repeaterChainSnrDb(p: RepeaterParams): number {
  const n0bDbW = 10 * Math.log10(noiseFloorN0(p.tempK) * p.bandwidthHz);
  return p.ptDbW - 10 * Math.log10(p.segments) - p.perSegLossDb - p.faDb - n0bDbW;
}
