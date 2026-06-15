import { describe, it, expect } from 'vitest';
import { buildIQRepresentation } from '@/modules/fourier/model';

/** Relative L2 error of `a` vs reference `b` over interior indices [lo, hi). */
function relErr(a: number[], b: number[], lo: number, hi: number): number {
  let num = 0;
  let den = 0;
  for (let i = lo; i < hi; i++) {
    num += (a[i] - b[i]) ** 2;
    den += b[i] ** 2;
  }
  return Math.sqrt(num / Math.max(den, 1e-12));
}

describe('buildIQRepresentation', () => {
  const fc = 80;
  const W = 8;

  it('returns equal-length, finite arrays', () => {
    const v = buildIQRepresentation('gaussian', 'gaussian', W, fc);
    const N = v.time.length;
    expect(N).toBeGreaterThan(1000);
    for (const arr of [v.signal, v.xcTrue, v.xsTrue, v.iRec, v.qRec, v.envelope]) {
      expect(arr.length).toBe(N);
      expect(arr.every((x) => Number.isFinite(x))).toBe(true);
    }
  });

  it('recovers I and Q from the bandpass signal (coherent demod)', () => {
    const v = buildIQRepresentation('gaussian', 'gaussian', W, fc);
    const N = v.time.length;
    const lo = Math.floor(N * 0.15);
    const hi = Math.floor(N * 0.85);
    // Smooth (near-bandlimited) message → tight recovery.
    expect(relErr(v.iRec, v.xcTrue, lo, hi)).toBeLessThan(0.1);
    expect(relErr(v.qRec, v.xsTrue, lo, hi)).toBeLessThan(0.1);
  });

  it('keeps the two channels isolated (no I↔Q crosstalk)', () => {
    // Distinct shapes: a good recovery must track its own source, not the other.
    const v = buildIQRepresentation('rect', 'tri', W, fc);
    const N = v.time.length;
    const lo = Math.floor(N * 0.15);
    const hi = Math.floor(N * 0.85);
    expect(relErr(v.iRec, v.xcTrue, lo, hi)).toBeLessThan(relErr(v.iRec, v.xsTrue, lo, hi));
    expect(relErr(v.qRec, v.xsTrue, lo, hi)).toBeLessThan(relErr(v.qRec, v.xcTrue, lo, hi));
  });

  it('computes the envelope as hypot(x_c, x_s)', () => {
    const v = buildIQRepresentation('gaussian', 'rect', W, fc);
    for (let i = 0; i < v.time.length; i += 137) {
      expect(v.envelope[i]).toBeCloseTo(Math.hypot(v.xcTrue[i], v.xsTrue[i]), 9);
    }
  });
});
