/**
 * Peak-to-Average Power Ratio (PAR/PAPR) of OFDM signals.
 * Proakis & Salehi §11.5 "Peak-to-Average Power Ratio in OFDM Systems", p.631.
 *
 * An OFDM symbol is a sum of K independent subcarriers; when many subcarriers add
 * coherently the envelope can peak far above its average, stressing the power
 * amplifier. PAPR = max|x(t)|² / E[|x(t)|²]. We oversample the symbol so the
 * continuous-time peak is not missed by the critically sampled grid.
 */

import type { Complex } from '@/lib/dsp/fft';
import { makeRng } from '@/lib/dsp/random';

/**
 * Oversampled OFDM envelope |x(t)| from N subcarrier symbols, computed by a
 * direct IDFT on an `over`×-denser time grid (length N·over). Direct evaluation
 * avoids any radix-2 size constraint on N or `over`.
 *   x(t_m) = (1/N) Σ_k X[k] exp(j2π k m / (N·over)),  m = 0 … N·over−1.
 */
export function oversampledOfdmEnvelope(symbols: Complex[], over = 4): number[] {
  const N = symbols.length;
  const M = N * over;
  const env = new Array<number>(M);
  for (let m = 0; m < M; m++) {
    let re = 0;
    let im = 0;
    for (let k = 0; k < N; k++) {
      const ang = (2 * Math.PI * k * m) / M;
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      // X[k]·e^{jang}
      re += symbols[k].re * c - symbols[k].im * s;
      im += symbols[k].re * s + symbols[k].im * c;
    }
    env[m] = Math.hypot(re, im) / N;
  }
  return env;
}

/** PAPR in dB of an OFDM symbol: 10·log10(max|x|² / mean|x|²). */
export function paprDb(symbols: Complex[], over = 4): number {
  const env = oversampledOfdmEnvelope(symbols, over);
  return paprDbFromEnvelope(env);
}

/** PAPR in dB directly from an envelope (magnitude) array. */
export function paprDbFromEnvelope(env: number[]): number {
  let peak = 0;
  let sum = 0;
  for (const a of env) {
    const p = a * a;
    if (p > peak) peak = p;
    sum += p;
  }
  const mean = sum / env.length;
  if (mean <= 0) return 0;
  return 10 * Math.log10(peak / mean);
}

/**
 * Theoretical CCDF of the OFDM PAPR for N subcarriers (Nyquist-rate model):
 *   P(PAPR > γ) = 1 − (1 − e^{−γ})^N,  γ the linear threshold (here from dB).
 * Proakis §11.5.
 */
export function paprCcdfTheoretical(gammaDb: number, N: number): number {
  const gamma = 10 ** (gammaDb / 10);
  const p = 1 - (1 - Math.exp(-gamma)) ** N;
  return Math.min(1, Math.max(0, p));
}

/** One random QPSK symbol vector of length N, entries (±1 ± j)/√2. */
function randomQpsk(N: number, rng: () => number): Complex[] {
  const s = new Array<Complex>(N);
  const a = 1 / Math.SQRT2;
  for (let k = 0; k < N; k++) {
    s[k] = { re: rng() < 0.5 ? -a : a, im: rng() < 0.5 ? -a : a };
  }
  return s;
}

/**
 * Empirical CCDF of OFDM PAPR over `trials` random QPSK symbols, swept from
 * 0…13 dB. Returns the fraction of symbols whose PAPR exceeds each threshold.
 * Deterministic for a fixed seed.
 */
export function paprCcdfEmpirical(
  N: number,
  trials: number,
  seed: number,
  over = 4,
): { gammaDb: number; ccdf: number }[] {
  const rng = makeRng(seed);
  const paprs = new Array<number>(trials);
  for (let t = 0; t < trials; t++) paprs[t] = paprDb(randomQpsk(N, rng), over);
  const out: { gammaDb: number; ccdf: number }[] = [];
  for (let g = 0; g <= 13; g += 0.5) {
    let cnt = 0;
    for (const p of paprs) if (p > g) cnt++;
    out.push({ gammaDb: g, ccdf: cnt / trials });
  }
  return out;
}

/**
 * Hard-clip the envelope to a level set by the clip ratio (dB above RMS):
 *   A = √(E[|x|²]) · 10^{clipRatioDb/20}.
 * Returns the clipped envelope, the resulting EVM (RMS clip error / RMS signal),
 * and the post-clip PAPR. Lower clipRatioDb ⇒ harder clipping ⇒ lower PAPR but
 * higher EVM (in-band distortion / spectral regrowth). Proakis §11.5.
 */
export function clipEnvelope(
  env: number[],
  clipRatioDb: number,
): { clipped: number[]; evm: number; paprDb: number } {
  let sumSq = 0;
  for (const a of env) sumSq += a * a;
  const rms = Math.sqrt(sumSq / env.length);
  const A = rms * 10 ** (clipRatioDb / 20);
  const clipped = env.map((a) => Math.min(a, A));
  let errSq = 0;
  for (let i = 0; i < env.length; i++) {
    const e = clipped[i] - env[i];
    errSq += e * e;
  }
  const evm = rms > 0 ? Math.sqrt(errSq / env.length) / rms : 0;
  return { clipped, evm, paprDb: paprDbFromEnvelope(clipped) };
}
