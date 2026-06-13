import { describe, it, expect } from 'vitest';
import {
  numLevels,
  step,
  quantize,
  quantizeSignal,
  quantizationError,
  sqnrTheoreticalDb,
  sqnrMeasuredDb,
  levelValues,
  quantizationNoisePower,
} from '@/lib/dsp/quantize';

describe('numLevels & step', () => {
  it('L = 2^R', () => {
    expect(numLevels(3)).toBe(8);
  });
  it('step = 2*mMax/L', () => {
    expect(step(1, 2)).toBeCloseTo(0.5, 12); // 2*1/4
  });
});

describe('quantize midrise (mMax=1, bits=2, delta=0.5)', () => {
  it('maps to mid-rise levels', () => {
    expect(quantize(0.1, 1, 2, 'midrise')).toBeCloseTo(0.25, 12);
    expect(quantize(-0.1, 1, 2, 'midrise')).toBeCloseTo(-0.25, 12);
    expect(quantize(0.9, 1, 2, 'midrise')).toBeCloseTo(0.75, 12);
  });
  it('clamps out-of-range inputs to the top level', () => {
    expect(quantize(5, 1, 2, 'midrise')).toBeCloseTo(0.75, 12);
  });
});

describe('quantize midtread (mMax=1, bits=2, delta=0.5)', () => {
  it('has a level at zero', () => {
    expect(quantize(0.1, 1, 2, 'midtread')).toBeCloseTo(0, 12);
    expect(quantize(0.3, 1, 2, 'midtread')).toBeCloseTo(0.5, 12);
    expect(quantize(-0.3, 1, 2, 'midtread')).toBeCloseTo(-0.5, 12);
  });
  it('spans all L = 2^bits levels (asymmetric for even L)', () => {
    // L = 4 -> levels {-1, -0.5, 0, 0.5}; index k in {-2,-1,0,1}
    const levels = [-0.9, -0.3, 0.1, 0.3].map((v) => quantize(v, 1, 2, 'midtread'));
    expect(levels).toEqual([-1, -0.5, 0, 0.5]);
  });
});

describe('error bound', () => {
  it('|error| <= delta/2 when the signal stays within +/- mMax', () => {
    const values = Array.from({ length: 200 }, (_, i) => Math.cos((2 * Math.PI * i) / 50));
    const mMax = 1;
    const bits = 4;
    const q = quantizeSignal(values, mMax, bits, 'midrise');
    const err = quantizationError(values, q);
    const half = step(mMax, bits) / 2 + 1e-9;
    expect(Math.max(...err.map(Math.abs))).toBeLessThanOrEqual(half);
  });
});

describe('sqnrTheoreticalDb (slide reference values)', () => {
  it('cosine amp 5, R=3 -> 19.82 dB', () => {
    expect(sqnrTheoreticalDb(12.5, 5, 3)).toBeCloseTo(19.82, 1);
  });
  it('cosine amp 5, R=4 -> 25.84 dB', () => {
    expect(sqnrTheoreticalDb(12.5, 5, 4)).toBeCloseTo(25.84, 1);
  });
  it('adds ~6.02 dB per extra bit', () => {
    expect(sqnrTheoreticalDb(12.5, 5, 4) - sqnrTheoreticalDb(12.5, 5, 3)).toBeCloseTo(6.02, 1);
  });
});

describe('sqnrMeasuredDb', () => {
  it('is close to theoretical for a densely sampled cosine', () => {
    const values = Array.from({ length: 4000 }, (_, i) => 5 * Math.cos((2 * Math.PI * i) / 1000));
    const q = quantizeSignal(values, 5, 4, 'midrise');
    expect(sqnrMeasuredDb(values, q)).toBeGreaterThan(23);
    expect(sqnrMeasuredDb(values, q)).toBeLessThan(28);
  });
});

describe('sqnrMeasuredDb edge cases', () => {
  it('returns Infinity when reconstruction is perfect (zero error power)', () => {
    const values = [0.25, -0.25, 0.75, -0.75];
    // these land exactly on midrise levels for mMax=1, bits=2 -> zero error
    const q = quantizeSignal(values, 1, 2, 'midrise');
    expect(sqnrMeasuredDb(values, q)).toBe(Infinity);
  });
});

describe('levelValues', () => {
  it('midrise: L levels at (k+0.5)*delta, ascending', () => {
    expect(levelValues(1, 2, 'midrise')).toEqual([-0.75, -0.25, 0.25, 0.75]);
  });
  it('midtread: L levels at k*delta including zero, ascending', () => {
    expect(levelValues(1, 2, 'midtread')).toEqual([-1, -0.5, 0, 0.5]);
  });
  it('has exactly L = 2^bits entries', () => {
    expect(levelValues(2, 3, 'midrise')).toHaveLength(8);
  });
});

describe('quantizationNoisePower', () => {
  it('equals delta^2 / 12', () => {
    // mMax=1, bits=2 -> delta=0.5 -> 0.25/12
    expect(quantizationNoisePower(1, 2)).toBeCloseTo(0.25 / 12, 12);
  });
});
