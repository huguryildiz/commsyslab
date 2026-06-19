import { describe, it, expect } from 'vitest';
import {
  qfunc,
  qfuncBounds,
  gaussianPdf,
  gaussianCdf,
  uniformPdf,
  rayleighCdf,
  binom,
  binomialPmf,
  distStats,
  sampleDist,
  densityHistogram,
  binaryChannelBayes,
  bivariateNormalPdf,
  correlatedSamples,
  cltSampleMeans,
  cltBaseStats,
} from '@/lib/dsp/probability';

const close = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) < tol;

describe('qfunc', () => {
  it('matches known values', () => {
    expect(close(qfunc(0), 0.5)).toBe(true);
    expect(close(qfunc(1), 0.158655, 1e-4)).toBe(true);
    expect(close(qfunc(2), 0.02275, 1e-4)).toBe(true);
  });
  it('is symmetric: Q(-x) = 1 - Q(x)', () => {
    for (const x of [0.3, 1, 2.5]) expect(close(qfunc(-x), 1 - qfunc(x), 1e-4)).toBe(true);
  });
});

describe('qfuncBounds', () => {
  it('brackets Q(x) for x > 1', () => {
    for (const x of [1.5, 2, 3]) {
      const { upperExp, upperTight, lower } = qfuncBounds(x);
      const q = qfunc(x);
      expect(q).toBeLessThanOrEqual(upperExp + 1e-9);
      expect(q).toBeLessThanOrEqual(upperTight + 1e-9);
      expect(lower).not.toBeNull();
      expect(q).toBeGreaterThanOrEqual((lower as number) - 1e-9);
    }
  });
});

describe('distributions', () => {
  it('gaussian pdf integrates to ~1 and cdf(m) = 0.5', () => {
    let area = 0;
    const dx = 0.01;
    for (let x = -8; x <= 8; x += dx) area += gaussianPdf(x, 0, 1) * dx;
    expect(close(area, 1, 1e-3)).toBe(true);
    expect(close(gaussianCdf(2, 2, 0.7), 0.5)).toBe(true);
  });
  it('uniform pdf area = 1', () => {
    expect(close(uniformPdf(0.5, 0, 2) * 2, 1)).toBe(true);
    expect(uniformPdf(3, 0, 2)).toBe(0);
  });
  it('rayleigh cdf is monotonic in [0,1]', () => {
    let prev = 0;
    for (let x = 0; x <= 6; x += 0.5) {
      const c = rayleighCdf(x, 1);
      expect(c).toBeGreaterThanOrEqual(prev - 1e-12);
      expect(c).toBeLessThanOrEqual(1);
      prev = c;
    }
  });
  it('binomial pmf sums to 1 with mean np', () => {
    const n = 12;
    const p = 0.3;
    let s = 0;
    let mean = 0;
    for (let k = 0; k <= n; k++) {
      const pk = binomialPmf(k, n, p);
      s += pk;
      mean += k * pk;
    }
    expect(close(s, 1, 1e-9)).toBe(true);
    expect(close(mean, n * p, 1e-6)).toBe(true);
    expect(binom(5, 2)).toBe(10);
  });
  it('distStats reports book mean/variance', () => {
    expect(distStats('binomial', { n: 10, p: 0.2 })).toEqual({ mean: 2, variance: 1.6 });
    expect(distStats('uniform', { a: 0, b: 12 })).toEqual({ mean: 6, variance: 12 });
  });
});

describe('sampling', () => {
  it('is deterministic for a seed and empirically near the true mean', () => {
    const a = sampleDist('gaussian', { m: 3, sigma: 2 }, 50, 7);
    const b = sampleDist('gaussian', { m: 3, sigma: 2 }, 50, 7);
    expect(a).toEqual(b);
    const big = sampleDist('gaussian', { m: 3, sigma: 2 }, 20000, 7);
    const mean = big.reduce((s, v) => s + v, 0) / big.length;
    expect(close(mean, 3, 0.1)).toBe(true);
  });
  it('densityHistogram integrates to ~1', () => {
    const s = sampleDist('uniform', { a: 0, b: 1 }, 10000, 3);
    const { density } = densityHistogram(s, 20, 0, 1);
    const area = density.reduce((acc, d) => acc + d * (1 / 20), 0);
    expect(close(area, 1, 1e-9)).toBe(true);
  });
});

describe('binaryChannelBayes', () => {
  it('matches the book binary-channel example (P(X=1)=0.7)', () => {
    const r = binaryChannelBayes({ p1: 0.7, eps0: 0.01, eps1: 0.1 });
    expect(close(r.pY1, 0.633, 1e-6)).toBe(true);
    expect(close(r.postX1Y1, 0.63 / 0.633, 1e-6)).toBe(true);
  });
  it('posteriors over each Y sum to 1', () => {
    const r = binaryChannelBayes({ p1: 0.4, eps0: 0.05, eps1: 0.2 });
    expect(close(r.postX1Y1 + r.postX0Y1, 1, 1e-9)).toBe(true);
    expect(close(r.postX1Y0 + r.postX0Y0, 1, 1e-9)).toBe(true);
  });
});

describe('jointly Gaussian', () => {
  it('binormal pdf is positive and peaks at the mean', () => {
    const peak = bivariateNormalPdf(0, 0, 0, 0, 1, 1, 0.5);
    expect(peak).toBeGreaterThan(0);
    expect(bivariateNormalPdf(2, -2, 0, 0, 1, 1, 0.5)).toBeLessThan(peak);
  });
  it('correlatedSamples reproduce the target correlation', () => {
    for (const rho of [-0.6, 0, 0.8]) {
      const { xs, ys } = correlatedSamples(11, rho, 20000);
      const mx = xs.reduce((s, v) => s + v, 0) / xs.length;
      const my = ys.reduce((s, v) => s + v, 0) / ys.length;
      let cov = 0;
      let vx = 0;
      let vy = 0;
      for (let i = 0; i < xs.length; i++) {
        cov += (xs[i] - mx) * (ys[i] - my);
        vx += (xs[i] - mx) ** 2;
        vy += (ys[i] - my) ** 2;
      }
      const emp = cov / Math.sqrt(vx * vy);
      expect(close(emp, rho, 0.05)).toBe(true);
    }
  });
});

describe('central limit theorem', () => {
  it('sample-mean variance shrinks like variance/n', () => {
    const { variance } = cltBaseStats('uniform');
    const means = cltSampleMeans(5, 'uniform', 30, 5000);
    const mu = means.reduce((s, v) => s + v, 0) / means.length;
    const v = means.reduce((s, x) => s + (x - mu) ** 2, 0) / means.length;
    expect(close(v, variance / 30, 5e-3)).toBe(true);
    expect(close(mu, 0.5, 0.02)).toBe(true);
  });
});
