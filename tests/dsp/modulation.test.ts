import { describe, it, expect } from 'vitest';
import { makeConstellation } from '@/lib/dsp/modulation';

describe('BPSK', () => {
  it('two antipodal 1-D points with d_min = 2*sqrt(Eb)', () => {
    const c = makeConstellation('bpsk', 2, 1);
    expect(c.dim).toBe(1);
    expect(c.M).toBe(2);
    expect(c.bitsPerSymbol).toBe(1);
    const xs = c.points.map((p) => p[0]).sort((a, b) => a - b);
    expect(xs).toEqual([-1, 1]);
    expect(c.dMin).toBeCloseTo(2, 12);
    expect(c.EsAvg).toBeCloseTo(1, 12);
  });
});

describe('BASK', () => {
  it('on-off 1-D: {0, sqrt(2Eb)}, d_min = sqrt(2Eb), EsAvg = Eb', () => {
    const c = makeConstellation('bask', 2, 1);
    const xs = c.points.map((p) => p[0]).sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(0, 12);
    expect(xs[1]).toBeCloseTo(Math.SQRT2, 12);
    expect(c.dMin).toBeCloseTo(Math.SQRT2, 12);
    expect(c.EsAvg).toBeCloseTo(1, 12);
  });
});

describe('BFSK', () => {
  it('2-D orthogonal, d_min = sqrt(2Eb)', () => {
    const c = makeConstellation('bfsk', 2, 1);
    expect(c.dim).toBe(2);
    expect(c.dMin).toBeCloseTo(Math.SQRT2, 12);
  });
});

describe('M-PSK / QPSK', () => {
  it('QPSK (M=4): 4 points on a circle of radius sqrt(Es), d_min = 2*sqrt(Eb)', () => {
    const c = makeConstellation('mpsk', 4, 1);
    expect(c.dim).toBe(2);
    expect(c.bitsPerSymbol).toBe(2);
    const Es = 2;
    for (const p of c.points) {
      expect(Math.hypot(p[0], p[1])).toBeCloseTo(Math.sqrt(Es), 9);
    }
    expect(c.EsAvg).toBeCloseTo(Es, 9);
    expect(c.dMin).toBeCloseTo(2, 9);
  });
  it('8-PSK d_min = 2*sqrt(Es)*sin(pi/8)', () => {
    const c = makeConstellation('mpsk', 8, 1);
    const Es = 3;
    expect(c.dMin).toBeCloseTo(2 * Math.sqrt(Es) * Math.sin(Math.PI / 8), 9);
  });
});

describe('M-ASK', () => {
  it('4-ASK: levels (2i+1-M)A, EsAvg = A^2(M^2-1)/3, d_min = 2A', () => {
    const c = makeConstellation('mask', 4, 1);
    expect(c.dim).toBe(1);
    expect(c.EsAvg).toBeCloseTo(2, 9);
    const xs = c.points.map((p) => p[0]).sort((a, b) => a - b);
    const A = (xs[3] - xs[2]) / 2;
    expect(c.dMin).toBeCloseTo(2 * A, 9);
    expect(xs[0]).toBeCloseTo(-xs[3], 9);
    expect(c.dMin * c.dMin).toBeCloseTo((12 * c.EsAvg) / (16 - 1), 9);
  });
});

describe('M-QAM', () => {
  it('16-QAM: 16 points, EsAvg = Eb*log2(M), d_min = 2*sqrt(E0)', () => {
    const c = makeConstellation('mqam', 16, 1);
    expect(c.dim).toBe(2);
    expect(c.M).toBe(16);
    expect(c.bitsPerSymbol).toBe(4);
    expect(c.EsAvg).toBeCloseTo(4, 6);
    const E0 = (3 * 1 * 4) / (2 * (16 - 1));
    expect(c.dMin).toBeCloseTo(2 * Math.sqrt(E0), 6);
  });
});

describe('M-FSK', () => {
  it('4-FSK: orthogonal in M dimensions, d_min = sqrt(2Es)', () => {
    const c = makeConstellation('mfsk', 4, 1);
    expect(c.dim).toBe(4);
    const Es = 2;
    expect(c.dMin).toBeCloseTo(Math.sqrt(2 * Es), 9);
    expect(Math.hypot(...c.points[0])).toBeCloseTo(Math.sqrt(Es), 9);
  });
});

describe('labels', () => {
  it('provides M distinct bit labels of width log2(M)', () => {
    const c = makeConstellation('mqam', 16, 1);
    expect(c.labels).toHaveLength(16);
    expect(new Set(c.labels).size).toBe(16);
    expect(c.labels[0]).toHaveLength(4);
  });
});
