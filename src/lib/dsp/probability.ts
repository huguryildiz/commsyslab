// Probability & random-variable DSP (Proakis & Salehi §5.1). Pure, framework-free.
// Reuses qfunc/erf from ./math; samplers reuse makeRng/gaussian. Equation numbers
// reference the 2nd-edition text (Q-function 5.1.7, bounds 5.1.8–5.1.10, Gaussian pdf
// 5.1.6, binomial 5.1.5, Bayes 5.1.3, binormal pdf §5.1.5, CLT §5.1.6).

import { erf } from './math';
import { makeRng } from './random';
import { gaussian } from './awgn';

export { qfunc } from './math';

// ── Q-function bounds (Eqs. 5.1.8–5.1.10), valid for x ≥ 0 ────────────────────
export interface QBounds {
  /** Upper bound ½ e^{-x²/2} (Eq. 5.1.8). */
  upperExp: number;
  /** Tighter upper bound 1/(√(2π) x) · e^{-x²/2} (Eq. 5.1.9). */
  upperTight: number;
  /** Lower bound (1 − 1/x²) · 1/(√(2π) x) · e^{-x²/2} (Eq. 5.1.10), only for x > 1. */
  lower: number | null;
}
export function qfuncBounds(x: number): QBounds {
  const g = Math.exp(-(x * x) / 2);
  const upperExp = 0.5 * g;
  const upperTight = x > 0 ? g / (Math.sqrt(2 * Math.PI) * x) : Infinity;
  const lower = x > 1 ? (1 - 1 / (x * x)) * (g / (Math.sqrt(2 * Math.PI) * x)) : null;
  return { upperExp, upperTight, lower };
}

// ── Continuous & discrete distributions (§5.1.3) ──────────────────────────────
export type DistKind = 'gaussian' | 'uniform' | 'rayleigh' | 'binomial' | 'bernoulli';

/** Gaussian / normal pdf N(m, σ²) (Eq. 5.1.6). */
export function gaussianPdf(x: number, m: number, sigma: number): number {
  const z = (x - m) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}
/** Gaussian cdf F(x) = ½[1 + erf((x−m)/(σ√2))] = 1 − Q((x−m)/σ). */
export function gaussianCdf(x: number, m: number, sigma: number): number {
  return 0.5 * (1 + erf((x - m) / (sigma * Math.SQRT2)));
}

/** Uniform pdf on [a, b]. */
export function uniformPdf(x: number, a: number, b: number): number {
  return x >= a && x <= b ? 1 / (b - a) : 0;
}
export function uniformCdf(x: number, a: number, b: number): number {
  if (x <= a) return 0;
  if (x >= b) return 1;
  return (x - a) / (b - a);
}

/** Rayleigh pdf (Eq. 5.1.31): magnitude of two i.i.d. N(0, σ²). */
export function rayleighPdf(x: number, sigma: number): number {
  if (x < 0) return 0;
  return (x / (sigma * sigma)) * Math.exp(-(x * x) / (2 * sigma * sigma));
}
export function rayleighCdf(x: number, sigma: number): number {
  if (x <= 0) return 0;
  return 1 - Math.exp(-(x * x) / (2 * sigma * sigma));
}

/** log n! via lgamma-free product (n small in UI). */
function logFactorial(n: number): number {
  let s = 0;
  for (let i = 2; i <= n; i++) s += Math.log(i);
  return s;
}
/** Binomial coefficient C(n, k) (numerically via log-factorials). */
export function binom(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  return Math.round(Math.exp(logFactorial(n) - logFactorial(k) - logFactorial(n - k)));
}
/** Binomial pmf (Eq. 5.1.5): k successes in n independent Bernoulli(p) trials. */
export function binomialPmf(k: number, n: number, p: number): number {
  if (k < 0 || k > n) return 0;
  const logP = logFactorial(n) - logFactorial(k) - logFactorial(n - k) +
    k * Math.log(p || 1e-300) + (n - k) * Math.log(1 - p || 1e-300);
  return Math.exp(logP);
}
export function binomialCdf(k: number, n: number, p: number): number {
  let s = 0;
  for (let i = 0; i <= Math.min(k, n); i++) s += binomialPmf(i, n, p);
  return s;
}

/** Bernoulli pmf: P(X=1)=p, P(X=0)=1−p. */
export function bernoulliPmf(k: number, p: number): number {
  if (k === 1) return p;
  if (k === 0) return 1 - p;
  return 0;
}

/** Mean and variance of a named distribution, for live read-outs (§5.1.3–5.1.4). */
export function distStats(
  kind: DistKind,
  params: { m?: number; sigma?: number; a?: number; b?: number; n?: number; p?: number },
): { mean: number; variance: number } {
  switch (kind) {
    case 'gaussian':
      return { mean: params.m ?? 0, variance: (params.sigma ?? 1) ** 2 };
    case 'uniform': {
      const a = params.a ?? 0;
      const b = params.b ?? 1;
      return { mean: (a + b) / 2, variance: (b - a) ** 2 / 12 };
    }
    case 'rayleigh': {
      const s = params.sigma ?? 1;
      return { mean: s * Math.sqrt(Math.PI / 2), variance: ((4 - Math.PI) / 2) * s * s };
    }
    case 'binomial': {
      const n = params.n ?? 1;
      const p = params.p ?? 0.5;
      return { mean: n * p, variance: n * p * (1 - p) };
    }
    case 'bernoulli': {
      const p = params.p ?? 0.5;
      return { mean: p, variance: p * (1 - p) };
    }
  }
}

// ── Samplers (deterministic given a seed) ─────────────────────────────────────
export function sampleUniform(rng: () => number, a: number, b: number): number {
  return a + (b - a) * rng();
}
export function sampleGaussian(rng: () => number, m: number, sigma: number): number {
  return m + sigma * gaussian(rng);
}
/** Inverse-cdf Rayleigh sample: x = σ√(−2 ln(1−u)). */
export function sampleRayleigh(rng: () => number, sigma: number): number {
  const u = Math.max(1e-12, 1 - rng());
  return sigma * Math.sqrt(-2 * Math.log(u));
}
export function sampleBernoulli(rng: () => number, p: number): number {
  return rng() < p ? 1 : 0;
}
export function sampleBinomial(rng: () => number, n: number, p: number): number {
  let s = 0;
  for (let i = 0; i < n; i++) s += rng() < p ? 1 : 0;
  return s;
}

/** Draw `count` samples from a named distribution with a fixed seed. */
export function sampleDist(
  kind: DistKind,
  params: { m?: number; sigma?: number; a?: number; b?: number; n?: number; p?: number },
  count: number,
  seed: number,
): number[] {
  const rng = makeRng(seed);
  const out = new Array<number>(count);
  for (let i = 0; i < count; i++) {
    switch (kind) {
      case 'gaussian':
        out[i] = sampleGaussian(rng, params.m ?? 0, params.sigma ?? 1);
        break;
      case 'uniform':
        out[i] = sampleUniform(rng, params.a ?? 0, params.b ?? 1);
        break;
      case 'rayleigh':
        out[i] = sampleRayleigh(rng, params.sigma ?? 1);
        break;
      case 'binomial':
        out[i] = sampleBinomial(rng, params.n ?? 1, params.p ?? 0.5);
        break;
      case 'bernoulli':
        out[i] = sampleBernoulli(rng, params.p ?? 0.5);
        break;
    }
  }
  return out;
}

/** Normalized-density histogram (area = 1) of samples over [lo, hi]. */
export function densityHistogram(
  samples: number[],
  bins: number,
  lo: number,
  hi: number,
): { centers: number[]; density: number[] } {
  const counts = new Array<number>(bins).fill(0);
  const width = (hi - lo) / bins;
  for (const v of samples) {
    const idx = Math.floor((v - lo) / width);
    if (idx >= 0 && idx < bins) counts[idx]++;
  }
  const n = samples.length || 1;
  const centers = new Array<number>(bins);
  const density = new Array<number>(bins);
  for (let i = 0; i < bins; i++) {
    centers[i] = lo + (i + 0.5) * width;
    density[i] = counts[i] / (n * width);
  }
  return { centers, density };
}

// ── Bayes: binary channel posterior (§5.1.2, Eqs. 5.1.2–5.1.3) ────────────────
export interface BinaryChannel {
  /** Prior P(X=1). */
  p1: number;
  /** Crossover P(Y=1 | X=0) — error when a 0 is sent. */
  eps0: number;
  /** Crossover P(Y=0 | X=1) — error when a 1 is sent. */
  eps1: number;
}
export interface BayesResult {
  pY1: number;
  pY0: number;
  /** P(X=1 | Y=1). */
  postX1Y1: number;
  /** P(X=0 | Y=0). */
  postX0Y0: number;
  /** P(X=1 | Y=0). */
  postX1Y0: number;
  /** P(X=0 | Y=1). */
  postX0Y1: number;
}
export function binaryChannelBayes({ p1, eps0, eps1 }: BinaryChannel): BayesResult {
  const p0 = 1 - p1;
  // Total probability (Eq. 5.1.2).
  const pY1 = p0 * eps0 + p1 * (1 - eps1);
  const pY0 = p0 * (1 - eps0) + p1 * eps1;
  // Bayes' rule (Eq. 5.1.3).
  const postX1Y1 = pY1 > 0 ? (p1 * (1 - eps1)) / pY1 : 0;
  const postX0Y1 = pY1 > 0 ? (p0 * eps0) / pY1 : 0;
  const postX0Y0 = pY0 > 0 ? (p0 * (1 - eps0)) / pY0 : 0;
  const postX1Y0 = pY0 > 0 ? (p1 * eps1) / pY0 : 0;
  return { pY1, pY0, postX1Y1, postX0Y0, postX1Y0, postX0Y1 };
}

// ── Multiple RVs: jointly Gaussian / correlation (§5.1.5) ─────────────────────
/** Binormal (jointly Gaussian) pdf with correlation coefficient ρ (§5.1.5). */
export function bivariateNormalPdf(
  x: number,
  y: number,
  m1: number,
  m2: number,
  s1: number,
  s2: number,
  rho: number,
): number {
  const dx = (x - m1) / s1;
  const dy = (y - m2) / s2;
  const r2 = 1 - rho * rho;
  const z = (dx * dx - 2 * rho * dx * dy + dy * dy) / r2;
  return Math.exp(-z / 2) / (2 * Math.PI * s1 * s2 * Math.sqrt(r2));
}

/** Correlated jointly-Gaussian sample cloud via Cholesky: z2 = ρz1 + √(1−ρ²)z. */
export function correlatedSamples(
  seed: number,
  rho: number,
  count: number,
  s1 = 1,
  s2 = 1,
  m1 = 0,
  m2 = 0,
): { xs: number[]; ys: number[] } {
  const rng = makeRng(seed);
  const xs = new Array<number>(count);
  const ys = new Array<number>(count);
  const r = Math.sqrt(Math.max(0, 1 - rho * rho));
  for (let i = 0; i < count; i++) {
    const u1 = gaussian(rng);
    const u2 = gaussian(rng);
    xs[i] = m1 + s1 * u1;
    ys[i] = m2 + s2 * (rho * u1 + r * u2);
  }
  return { xs, ys };
}

/** k-σ covariance ellipse for the binormal density (drawing aid, §5.1.5). */
export function covarianceEllipse(
  m1: number,
  m2: number,
  s1: number,
  s2: number,
  rho: number,
  k: number,
  points = 96,
): { xs: number[]; ys: number[] } {
  const r = Math.sqrt(Math.max(0, 1 - rho * rho));
  const xs = new Array<number>(points + 1);
  const ys = new Array<number>(points + 1);
  for (let i = 0; i <= points; i++) {
    const th = (i / points) * 2 * Math.PI;
    const c = Math.cos(th);
    const s = Math.sin(th);
    // Cholesky L = [[s1,0],[ρ s2, s2√(1−ρ²)]] applied to k·(cosθ, sinθ).
    xs[i] = m1 + k * s1 * c;
    ys[i] = m2 + k * s2 * (rho * c + r * s);
  }
  return { xs, ys };
}

// ── Sums of random variables: Central Limit Theorem (§5.1.6) ──────────────────
export type CltBase = 'uniform' | 'bernoulli' | 'exponential';

/** Per-sample mean and variance of the CLT base distribution. */
export function cltBaseStats(base: CltBase): { mean: number; variance: number } {
  switch (base) {
    case 'uniform':
      return { mean: 0.5, variance: 1 / 12 }; // U[0,1]
    case 'bernoulli':
      return { mean: 0.5, variance: 0.25 }; // p = 0.5
    case 'exponential':
      return { mean: 1, variance: 1 }; // λ = 1
  }
}

function sampleCltBase(rng: () => number, base: CltBase): number {
  switch (base) {
    case 'uniform':
      return rng();
    case 'bernoulli':
      return rng() < 0.5 ? 1 : 0;
    case 'exponential':
      return -Math.log(Math.max(1e-12, 1 - rng())); // λ = 1
  }
}

/**
 * `trials` sample means of `n` i.i.d. draws from the base distribution (§5.1.6).
 * The histogram of these means converges to N(mean, variance/n) as n grows.
 */
export function cltSampleMeans(seed: number, base: CltBase, n: number, trials: number): number[] {
  const rng = makeRng(seed);
  const out = new Array<number>(trials);
  for (let tIdx = 0; tIdx < trials; tIdx++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += sampleCltBase(rng, base);
    out[tIdx] = s / n;
  }
  return out;
}
