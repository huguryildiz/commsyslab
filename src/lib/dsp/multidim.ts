// Multidimensional digital modulation — orthogonal, biorthogonal, simplex signal sets.
// Proakis & Salehi, Fundamentals of Communication Systems, §9.1–9.3.
// (Binary-coded signals §9.4 — performance is treated in the channel-coding module, Ch 13.)

import { qfunc } from './math';
import { ebN0Linear } from './awgn';

export type FamilyKind = 'orthogonal' | 'biorthogonal' | 'simplex';

export interface SignalFamily {
  kind: FamilyKind;
  M: number;
  /** Effective signal-space dimension. */
  dim: number;
  /** Signal vectors (rows). */
  points: number[][];
  dMin: number;
  energyAvg: number;
}

/** Minimum Euclidean distance between any two distinct points. */
export function dMinOf(points: number[][]): number {
  let best = Infinity;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      let d2 = 0;
      for (let k = 0; k < points[i].length; k++) {
        const df = points[i][k] - points[j][k];
        d2 += df * df;
      }
      best = Math.min(best, Math.sqrt(d2));
    }
  }
  return best;
}

/** Average signal energy ‖s‖² over the set. */
export function energyAvgOf(points: number[][]): number {
  let sum = 0;
  for (const p of points) for (const c of p) sum += c * c;
  return sum / points.length;
}

/** Rank of the row space (effective dimension), via a tolerant Gram–Schmidt count. */
function effectiveDim(points: number[][]): number {
  const basis: number[][] = [];
  for (const p of points) {
    const v = p.slice();
    for (const b of basis) {
      let dot = 0;
      for (let k = 0; k < v.length; k++) dot += v[k] * b[k];
      for (let k = 0; k < v.length; k++) v[k] -= dot * b[k];
    }
    let norm = 0;
    for (const c of v) norm += c * c;
    norm = Math.sqrt(norm);
    if (norm > 1e-9) {
      for (let k = 0; k < v.length; k++) v[k] /= norm;
      basis.push(v);
    }
  }
  return basis.length;
}

/** Build one of the multidimensional signal families with per-symbol energy `es`. */
export function buildFamily(kind: FamilyKind, M: number, es = 1): SignalFamily {
  const a = Math.sqrt(es);
  let points: number[][];
  if (kind === 'orthogonal') {
    points = Array.from({ length: M }, (_, i) => {
      const v = new Array(M).fill(0);
      v[i] = a;
      return v;
    });
  } else if (kind === 'biorthogonal') {
    const n = M / 2;
    points = [];
    for (let i = 0; i < n; i++) {
      const v = new Array(n).fill(0);
      v[i] = a;
      points.push(v);
    }
    for (let i = 0; i < n; i++) {
      const v = new Array(n).fill(0);
      v[i] = -a;
      points.push(v);
    }
  } else {
    // simplex: orthogonal set minus its centroid (Eq. 9.3.1).
    const orth = Array.from({ length: M }, (_, i) => {
      const v = new Array(M).fill(0);
      v[i] = a;
      return v;
    });
    const c = new Array(M).fill(a / M);
    points = orth.map((v) => v.map((x, k) => x - c[k]));
  }
  return {
    kind,
    M,
    dim: effectiveDim(points),
    points,
    dMin: dMinOf(points),
    energyAvg: energyAvgOf(points),
  };
}

/**
 * Exact M-ary orthogonal symbol-error probability (Proakis §9.1.1 Eq. 9.1.15):
 *   P_M = 1 − ∫ Φ(v + √(2·Es/N0))^{M−1} φ(v) dv,
 * integrated numerically. `esN0` is the symbol SNR Es/N0 (linear).
 */
function orthogonalPeCore(M: number, esN0: number): number {
  const a = Math.sqrt(2 * esN0);
  const lo = -10;
  const hi = 12;
  const N = 4400; // even
  const hstep = (hi - lo) / N;
  const invSqrt2pi = 1 / Math.sqrt(2 * Math.PI);
  const phi = (x: number) => invSqrt2pi * Math.exp(-(x * x) / 2);
  const bigPhi = (x: number) => 1 - qfunc(x); // standard normal CDF
  let integral = 0;
  for (let i = 0; i <= N; i++) {
    const v = lo + i * hstep;
    const f = Math.pow(bigPhi(v + a), M - 1) * phi(v);
    const wgt = i === 0 || i === N ? 1 : i % 2 === 1 ? 4 : 2; // Simpson
    integral += wgt * f;
  }
  integral *= hstep / 3;
  return Math.min(Math.max(1 - integral, 0), 1);
}

/** M-ary orthogonal symbol-error probability at a given Eb/N0 (dB). Es = log2(M)·Eb. */
export function orthogonalPe(M: number, ebN0Db: number): number {
  return orthogonalPeCore(M, Math.log2(M) * ebN0Linear(ebN0Db));
}

/** Simplex SNR advantage over orthogonal: 10·log10(M/(M−1)) dB (Eq. 9.3.8). */
export function simplexGainDb(M: number): number {
  return 10 * Math.log10(M / (M - 1));
}

/**
 * M-ary simplex symbol-error probability. Simplex achieves the orthogonal curve
 * with a factor M/(M−1) less energy, i.e. shifted left by simplexGainDb (Eq. 9.3.8).
 */
export function simplexPe(M: number, ebN0Db: number): number {
  const esN0 = (M / (M - 1)) * Math.log2(M) * ebN0Linear(ebN0Db);
  return orthogonalPeCore(M, esN0);
}
