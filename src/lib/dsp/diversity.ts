/**
 * Error performance of binary modulation on a frequency-nonselective Rayleigh
 * fading channel, and improvement through diversity (MRC).
 * Proakis & Salehi §10.1.3–§10.1.4.
 */
import { qfunc } from '@/lib/dsp/math';

/** dB → linear power ratio. */
function lin(db: number): number {
  return 10 ** (db / 10);
}

/** AWGN antipodal (BPSK) bit-error probability: P_b = Q(sqrt(2 γ_b)). */
export function awgnBerAntipodal(gammaBdB: number): number {
  return qfunc(Math.sqrt(2 * lin(gammaBdB)));
}

/**
 * Rayleigh-fading antipodal bit-error probability averaged over the fading:
 * P_b = ½[1 − √(γ̄_b/(1+γ̄_b))]. Proakis Eq. (10.1.24).
 */
export function rayleighBerAntipodal(gammaBarBdB: number): number {
  const g = lin(gammaBarBdB);
  return 0.5 * (1 - Math.sqrt(g / (1 + g)));
}

/**
 * Rayleigh-fading orthogonal (BFSK) bit-error probability:
 * P_b = ½[1 − √(γ̄_b/(2+γ̄_b))]. Proakis Eq. (10.1.29).
 */
export function rayleighBerOrthogonal(gammaBarBdB: number): number {
  const g = lin(gammaBarBdB);
  return 0.5 * (1 - Math.sqrt(g / (2 + g)));
}

/** Binomial coefficient C(n, k) for small non-negative integers. */
function binom(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let c = 1;
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1);
  return c;
}

/**
 * Antipodal bit-error probability with L-branch maximal-ratio combining (MRC)
 * over independent Rayleigh-fading branches, each with average SNR/bit γ̄_c:
 *   P_b = [½(1−μ)]^L Σ_{k=0}^{L−1} C(L−1+k, k) [½(1+μ)]^k,  μ = √(γ̄_c/(1+γ̄_c)).
 * Reduces to rayleighBerAntipodal at L = 1. Proakis §10.1.4 (Eq. 10.1.34–10.1.36).
 */
export function mrcBerAntipodal(gammaBarCdB: number, L: number): number {
  const g = lin(gammaBarCdB);
  const mu = Math.sqrt(g / (1 + g));
  const a = 0.5 * (1 - mu);
  const b = 0.5 * (1 + mu);
  let sum = 0;
  for (let k = 0; k < L; k++) sum += binom(L - 1 + k, k) * b ** k;
  return a ** L * sum;
}
