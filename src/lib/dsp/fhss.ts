/**
 * Frequency-Hopped Spread Spectrum. The carrier hops over many slots; the
 * processing gain is the number of slots. Slow FH is vulnerable to partial-band
 * jamming, where a worst-case adversary forces an error probability that decays
 * only inversely with E_b/N_J. Proakis & Salehi §10.3.6, §10.3.4.
 */
import { makeRng } from '@/lib/dsp/random';

/** linear E_b/N_J from dB. */
function lin(db: number): number {
  return 10 ** (db / 10);
}

/** Processing gain in dB, G_p = 10·log10(W/R) with W/R = number of hop slots. */
export function processingGainDb(nHopChannels: number): number {
  return 10 * Math.log10(Math.max(nHopChannels, 1));
}

/**
 * Noncoherent BFSK BER under partial-band jamming over a fraction β of the band:
 * P_e(β) = (β/2)·exp(−β·γ_b/2), γ_b = E_b/N_J. β=1 is the full-band case.
 * Proakis §10.3.4.
 */
export function partialBandBerBfsk(ebN0JDb: number, beta: number): number {
  const g = lin(ebN0JDb);
  return (beta / 2) * Math.exp((-beta * g) / 2);
}

/** Full-band noncoherent BFSK (β=1): ½·exp(−γ_b/2). */
export function fullBandBerBfsk(ebN0JDb: number): number {
  return partialBandBerBfsk(ebN0JDb, 1);
}

/** Worst-case jamming fraction β* = min(1, 2/γ_b) that maximizes P_e(β). */
export function worstCaseBeta(ebN0JDb: number): number {
  const g = lin(ebN0JDb);
  return Math.min(1, 2 / g);
}

/**
 * Worst-case partial-band BER: P_e = e^{−1}/γ_b for γ_b ≥ 2 (where β*<1), else
 * the full-band β=1 value. The inverse-law tail is the classic SS jamming result.
 * Proakis §10.3.4.
 */
export function worstCaseBerBfsk(ebN0JDb: number): number {
  const g = lin(ebN0JDb);
  return g >= 2 ? Math.exp(-1) / g : fullBandBerBfsk(ebN0JDb);
}

/**
 * Seeded random hop pattern: a frequency-slot index in [0, nHopChannels) for
 * each of nHops hops. Deterministic for a fixed seed (for the time-frequency plot).
 */
export function hopPattern(nHopChannels: number, nHops: number, seed: number): number[] {
  const rng = makeRng(seed);
  const out = new Array<number>(nHops);
  for (let i = 0; i < nHops; i++) {
    out[i] = Math.min(nHopChannels - 1, Math.floor(rng() * nHopChannels));
  }
  return out;
}
