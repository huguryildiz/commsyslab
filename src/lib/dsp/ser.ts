import { qfunc } from './math';
import { n0FromEbN0Db, sigmaFromN0, addAwgn } from './awgn';
import { detectML, detectMAP } from './detector';
import type { Scheme, Constellation } from './modulation';
import { makeRng } from '@/lib/sim/sources';

/** Theoretical symbol-error probability (slide formulas, Eb/N0 in dB). */
export function theoreticalSer(scheme: Scheme, M: number, ebN0Db: number): number {
  const g = 10 ** (ebN0Db / 10);
  const k = Math.log2(M);
  switch (scheme) {
    case 'bpsk':
      return qfunc(Math.sqrt(2 * g));
    case 'bask':
    case 'bfsk':
      return qfunc(Math.sqrt(g));
    case 'mpsk':
      return 2 * qfunc(Math.sqrt(2 * k * g) * Math.sin(Math.PI / M));
    case 'mfsk':
      return (M - 1) * qfunc(Math.sqrt(k * g));
    case 'mask':
      return ((2 * (M - 1)) / M) * qfunc(Math.sqrt((6 * k * g) / (M * M - 1)));
    case 'mqam':
      return ((4 * (Math.sqrt(M) - 1)) / Math.sqrt(M)) * qfunc(Math.sqrt((3 * k * g) / (M - 1)));
    default:
      throw new Error(`unknown scheme: ${scheme as string}`);
  }
}

export interface SimSerOptions {
  constellation: Constellation;
  ebN0Db: number;
  numSymbols: number;
  decision: 'ml' | 'map';
  priors?: number[];
  seed?: number;
}

export interface SimSerResult {
  errors: number;
  total: number;
  ser: number;
}

function symbolSampler(M: number, priors: number[] | undefined): (u: number) => number {
  if (!priors) return (u: number) => Math.min(M - 1, Math.floor(u * M));
  const cdf: number[] = [];
  let acc = 0;
  for (let i = 0; i < M; i++) {
    acc += priors[i];
    cdf.push(acc);
  }
  return (u: number) => {
    // Strict `<` matches the uniform sampler's floor(u*M) convention exactly,
    // so MAP with equal priors reproduces ML's symbol stream deterministically.
    const x = u * acc;
    for (let i = 0; i < M; i++) if (x < cdf[i]) return i;
    return M - 1;
  };
}

/** Monte-Carlo symbol-error-rate for a constellation over an AWGN channel. */
export function simulateSer(o: SimSerOptions): SimSerResult {
  const { constellation: c, ebN0Db, numSymbols, decision } = o;
  const eb = c.EsAvg / c.bitsPerSymbol;
  const n0 = n0FromEbN0Db(ebN0Db, eb);
  const sigma = sigmaFromN0(n0);
  const priors = decision === 'map' ? o.priors : undefined;
  const rng = makeRng(o.seed ?? 1);
  const pick = symbolSampler(c.M, priors);

  let errors = 0;
  for (let n = 0; n < numSymbols; n++) {
    const tx = pick(rng());
    const r = addAwgn(c.points[tx], sigma, rng);
    const rx =
      decision === 'map'
        ? detectMAP(r, c.points, priors ?? c.points.map(() => 1 / c.M), n0)
        : detectML(r, c.points);
    if (rx !== tx) errors++;
  }
  return { errors, total: numSymbols, ser: errors / numSymbols };
}

/**
 * Nearest-neighbour union bound on symbol-error probability for an arbitrary
 * constellation (Proakis §7.6.1):  P(e) ≤ (1/M) Σₘ Σ_{n≠m} Q(dₘₙ / √(2N₀)),
 * where dₘₙ = ‖sₘ − sₙ‖. Clamped to [0,1]. Used for custom signal sets that have
 * no closed-form SER.
 */
export function unionBoundSer(points: number[][], n0: number): number {
  const M = points.length;
  if (M < 2) return 0;
  let sum = 0;
  for (let m = 0; m < M; m++) {
    for (let n = 0; n < M; n++) {
      if (n === m) continue;
      let d2 = 0;
      for (let k = 0; k < points[m].length; k++) {
        const df = points[m][k] - points[n][k];
        d2 += df * df;
      }
      sum += qfunc(Math.sqrt(d2 / (2 * n0)));
    }
  }
  return Math.min(sum / M, 1);
}
