// Proakis §7.2.1 — Lloyd-Max optimal scalar quantizer (unit-variance sources).
// Ref CCSM lloydmax.m / centroid.m: centroid levels (Eq. 7.2.12) + midpoint
// boundaries (Eq. 7.2.10), iterated to convergence. Numerical (grid) integration.

export type SourcePdf = 'gaussian' | 'uniform' | 'laplacian';

export interface LloydMaxResult {
  boundaries: number[]; // length levels+1 (outer two clamped to ±support)
  levels: number[]; // length `levels`
  distortion: number; // mean-squared error
  sqnrDb: number; // 10 log10(σ² / D), σ² = 1
  iterations: number;
}

/** Unit-variance source densities. */
function pdf(kind: SourcePdf, x: number): number {
  switch (kind) {
    case 'gaussian':
      return Math.exp(-(x * x) / 2) / Math.sqrt(2 * Math.PI);
    case 'uniform': {
      const h = Math.sqrt(3); // U(-√3,√3) has variance 1
      return Math.abs(x) <= h ? 1 / (2 * h) : 0;
    }
    case 'laplacian': {
      const b = 1 / Math.SQRT2; // variance 2b² = 1
      return Math.exp(-Math.abs(x) / b) / (2 * b);
    }
  }
}

/** Effective support [-S, S] for the grid. */
function support(kind: SourcePdf): number {
  return kind === 'uniform' ? Math.sqrt(3) : kind === 'gaussian' ? 6 : 8;
}

/** Sampled (x, weight) grid with weights normalized to sum 1. */
function grid(kind: SourcePdf, n = 4000): { xs: number[]; ws: number[]; s: number } {
  const s = support(kind);
  const dx = (2 * s) / n;
  const xs: number[] = [];
  const ws: number[] = [];
  let wsum = 0;
  for (let i = 0; i < n; i++) {
    const x = -s + (i + 0.5) * dx;
    const w = pdf(kind, x) * dx;
    xs.push(x);
    ws.push(w);
    wsum += w;
  }
  for (let i = 0; i < n; i++) ws[i] /= wsum;
  return { xs, ws, s };
}

export function lloydMaxDesign(
  kind: SourcePdf,
  levels: number,
  tol = 1e-5,
  maxIter = 200,
): LloydMaxResult {
  const { xs, ws, s } = grid(kind);
  const n = xs.length;

  // Uniform initial boundaries on [-s, s]; outer bounds are open (±∞ effectively).
  const bounds = new Array<number>(levels + 1);
  for (let i = 0; i <= levels; i++) bounds[i] = -s + (i * 2 * s) / levels;
  bounds[0] = -Infinity;
  bounds[levels] = Infinity;

  const lev = new Array<number>(levels).fill(0);
  let dist = Infinity;
  let iterations = 0;

  for (; iterations < maxIter; iterations++) {
    // Centroid level of each region (Eq. 7.2.12).
    const num = new Array<number>(levels).fill(0);
    const den = new Array<number>(levels).fill(0);
    let r = 0;
    for (let i = 0; i < n; i++) {
      while (r < levels - 1 && xs[i] >= bounds[r + 1]) r++;
      num[r] += xs[i] * ws[i];
      den[r] += ws[i];
    }
    for (let k = 0; k < levels; k++) if (den[k] > 0) lev[k] = num[k] / den[k];

    // Distortion with the updated levels.
    let D = 0;
    r = 0;
    for (let i = 0; i < n; i++) {
      while (r < levels - 1 && xs[i] >= bounds[r + 1]) r++;
      const e = xs[i] - lev[r];
      D += e * e * ws[i];
    }

    const converged = Math.abs(dist - D) / (D || 1) < tol;
    dist = D;
    if (converged) {
      iterations++;
      break;
    }
    // Midpoint boundaries (Eq. 7.2.10).
    for (let k = 1; k < levels; k++) bounds[k] = (lev[k - 1] + lev[k]) / 2;
  }

  return {
    boundaries: bounds.map((v) => (v === -Infinity ? -s : v === Infinity ? s : v)),
    levels: lev,
    distortion: dist,
    sqnrDb: 10 * Math.log10(1 / dist),
    iterations,
  };
}

/** MSE of a uniform midrise quantizer with `levels` levels spanning [-range, range],
 *  integrated against the source density (overload included). */
export function uniformDistortion(kind: SourcePdf, levels: number, range: number): number {
  const { xs, ws } = grid(kind);
  const d = (2 * range) / levels;
  let D = 0;
  for (let i = 0; i < xs.length; i++) {
    let k = Math.floor(xs[i] / d);
    k = Math.max(-levels / 2, Math.min(levels / 2 - 1, k));
    const q = (k + 0.5) * d;
    const e = xs[i] - q;
    D += e * e * ws[i];
  }
  return D;
}
