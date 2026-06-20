/**
 * Synchronization of spread-spectrum systems: code acquisition (coarse, serial
 * search) and code tracking (fine, delay-locked loop).
 * Proakis & Salehi §15.6 "Synchronization of Spread-Spectrum Systems", p.849.
 *
 * Acquisition slides the local PN replica past the incoming code one cell at a
 * time and looks for the correlation peak; once found, a delay-locked loop (DLL)
 * with an early–late gate keeps the replica aligned to within a fraction of a chip.
 */

import { pnAutocorrelation } from '@/lib/dsp/spread';

/**
 * Serial-search correlation profile vs code-phase offset: the periodic
 * autocorrelation of the PN code, peaking at N (zero offset) and ≈ −1 elsewhere.
 * The acquisition circuit declares "found" when a cell exceeds a threshold.
 */
export function searchProfile(pn: number[]): number[] {
  return pnAutocorrelation(pn);
}

/**
 * Mean acquisition time of a single-dwell serial search, in units of cells:
 *   T̄_acq = (2 − P_d)(1 + K·P_fa) · q / (2 P_d),
 * with q = N cells to test, P_d the detection probability, P_fa the false-alarm
 * probability, and K the false-alarm penalty (in dwell units). Grows with the
 * code length N and with poorer P_d. Proakis §15.6.
 */
export function meanAcqTimeCells(N: number, pd: number, pfa: number, dwell: number): number {
  const K = Math.max(1, dwell);
  return ((2 - pd) * (1 + K * pfa) * N) / (2 * pd);
}

/** Unit-triangle chip autocorrelation R(τ) = max(0, 1 − |τ|) (τ in chips). */
function triAutocorr(tau: number): number {
  return Math.max(0, 1 - Math.abs(tau));
}

/**
 * Early–late DLL discriminator S-curve vs timing error τ (chips), with early/late
 * gate spacing `delta` (chips):
 *   S(τ) = R(τ + δ/2) − R(τ − δ/2).
 * S(0) = 0 with a negative (restoring) slope, so the loop drives the timing error
 * back toward zero. Proakis §15.6.
 */
export function dllSCurve(errorChips: number[], delta: number): number[] {
  const h = delta / 2;
  return errorChips.map((tau) => triAutocorr(tau + h) - triAutocorr(tau - h));
}
