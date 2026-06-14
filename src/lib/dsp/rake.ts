/**
 * RAKE receiver: resolve a multipath power-delay profile into fingers and
 * MRC-combine them into diversity. Proakis & Salehi §10.1.5.
 */
import type { Tap } from '@/lib/dsp/fading';
import { mrcBerAntipodal } from '@/lib/dsp/diversity';

/**
 * Group a power-delay profile into resolvable fingers: paths within one chip
 * duration of a finger's start are unresolvable and merge into it; a path a full
 * chip later starts a new finger. Returns the fingers' powers normalized to sum 1.
 * Proakis §10.1.5.
 */
export function resolvableFingers(taps: Tap[], chipDurationS: number): number[] {
  const sorted = [...taps].sort((a, b) => a.delay - b.delay);
  const fingers: number[] = [];
  let fingerStart = 0;
  for (const tp of sorted) {
    if (fingers.length === 0 || tp.delay - fingerStart >= chipDurationS) {
      fingers.push(tp.power);
      fingerStart = tp.delay;
    } else {
      fingers[fingers.length - 1] += tp.power;
    }
  }
  const total = fingers.reduce((s, p) => s + p, 0);
  return total > 0 ? fingers.map((p) => p / total) : fingers;
}

/**
 * RAKE BER (antipodal) for L equal-strength fingers MRC-combined. The total
 * average SNR γ̄_b is split across the fingers (γ̄_b/L each); MRC restores the
 * array gain with diversity order L. L = 1 reduces to flat Rayleigh. Reuses the
 * MRC closed form; equal-strength-finger idealization. Proakis §10.1.5.
 */
export function rakeBerAntipodal(ebN0Db: number, L: number): number {
  const perFingerDb = ebN0Db - 10 * Math.log10(L);
  return mrcBerAntipodal(perFingerDb, L);
}
