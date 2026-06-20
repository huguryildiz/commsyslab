// Noncoherent (square-law) FSK detection & error probability.
// Proakis & Salehi, Fundamentals of Communication Systems, §9.5.1–9.5.3.

import { ebN0Linear, n0FromEbN0Db, sigmaFromN0, gaussian } from './awgn';
import { makeRng } from '@/lib/sim/sources';

/** Binomial coefficient C(n, k) for small n (exact, integer arithmetic). */
function binom(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let c = 1;
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1);
  return Math.round(c);
}

/** Binary noncoherent FSK bit-error probability (Proakis §9.5.3 Eq. 9.5.41): ½ e^{-Eb/2N0}. */
export function noncoherentFskPb(ebN0Db: number): number {
  return 0.5 * Math.exp(-ebN0Linear(ebN0Db) / 2);
}

/**
 * M-ary noncoherent FSK symbol-error probability (Proakis §9.5.3 Eq. 9.5.40):
 *   P_M = Σ_{n=1}^{M-1} (-1)^{n+1} C(M-1, n) · 1/(n+1) · exp(-n·Es / ((n+1)·N0)),
 * with Es/N0 = log2(M)·Eb/N0. For M=2 this reduces to ½ e^{-Eb/2N0}.
 */
export function noncoherentFskPm(M: number, ebN0Db: number): number {
  const gEs = Math.log2(M) * ebN0Linear(ebN0Db); // Es/N0
  let sum = 0;
  for (let n = 1; n <= M - 1; n++) {
    const sign = n % 2 === 0 ? -1 : 1; // (-1)^{n+1}
    sum += (sign * binom(M - 1, n) * Math.exp((-n * gEs) / (n + 1))) / (n + 1);
  }
  return sum;
}

/** Bit-error probability for M-ary orthogonal FSK: P_b = (M/2)/(M-1) · P_M (Eq. 9.5.42). */
export function noncoherentFskBer(M: number, ebN0Db: number): number {
  if (M === 2) return noncoherentFskPb(ebN0Db);
  return (M / 2 / (M - 1)) * noncoherentFskPm(M, ebN0Db);
}

/** Square-law decision: pick the tone with the largest envelope yc² + ys² (Eq. 9.5.25). */
export function squareLawDecide(branches: { yc: number; ys: number }[]): number {
  let best = -1;
  let bestE = -Infinity;
  for (let k = 0; k < branches.length; k++) {
    const e = branches[k].yc * branches[k].yc + branches[k].ys * branches[k].ys;
    if (e > bestE) {
      bestE = e;
      best = k;
    }
  }
  return best;
}

export interface NoncohSimResult {
  symErrors: number;
  bitErrors: number;
  totalSymbols: number;
  totalBits: number;
  ser: number;
  ber: number;
}

/** Hamming distance between two symbol indices over k bits. */
function bitErrorsBetween(a: number, b: number): number {
  let x = a ^ b;
  let n = 0;
  while (x) {
    n += x & 1;
    x >>= 1;
  }
  return n;
}

/**
 * Monte-Carlo noncoherent M-ary FSK over AWGN (Proakis §9.5.2). Eb = 1, so
 * Es = log2(M). The transmitted tone arrives with a random unknown phase φ; each
 * of the M tones is correlated against cos and -sin (quadrature pair) and the
 * largest envelope wins.
 */
export function simulateNoncoherentFsk(opts: {
  M: number;
  ebN0Db: number;
  numSymbols: number;
  seed?: number;
}): NoncohSimResult {
  const { M, ebN0Db, numSymbols, seed = 12345 } = opts;
  const k = Math.log2(M);
  const es = k; // Eb = 1
  const amp = Math.sqrt(es);
  const sigma = sigmaFromN0(n0FromEbN0Db(ebN0Db, 1));
  const rng = makeRng(seed);

  let symErrors = 0;
  let bitErrors = 0;
  const branches: { yc: number; ys: number }[] = new Array(M);
  for (let i = 0; i < numSymbols; i++) {
    const tx = Math.floor(rng() * M);
    const phi = rng() * 2 * Math.PI;
    for (let m = 0; m < M; m++) {
      if (m === tx) {
        branches[m] = {
          yc: amp * Math.cos(phi) + sigma * gaussian(rng),
          ys: amp * Math.sin(phi) + sigma * gaussian(rng),
        };
      } else {
        branches[m] = { yc: sigma * gaussian(rng), ys: sigma * gaussian(rng) };
      }
    }
    const rx = squareLawDecide(branches);
    if (rx !== tx) {
      symErrors++;
      bitErrors += bitErrorsBetween(tx, rx);
    }
  }

  const totalBits = numSymbols * k;
  return {
    symErrors,
    bitErrors,
    totalSymbols: numSymbols,
    totalBits,
    ser: symErrors / numSymbols,
    ber: bitErrors / totalBits,
  };
}
