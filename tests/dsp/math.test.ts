import { describe, it, expect } from 'vitest';
import { erf, qfunc, qfuncInv, clamp, linspace } from '@/lib/dsp/math';

describe('erf', () => {
  it('erf(0) is 0', () => {
    expect(erf(0)).toBeCloseTo(0, 6);
  });
  it('erf(1) ~= 0.842701', () => {
    expect(erf(1)).toBeCloseTo(0.842701, 4);
  });
  it('is odd: erf(-x) = -erf(x)', () => {
    expect(erf(-0.7)).toBeCloseTo(-erf(0.7), 6);
  });
});

describe('qfunc', () => {
  it('Q(0) = 0.5', () => {
    expect(qfunc(0)).toBeCloseTo(0.5, 6);
  });
  it('Q(1) ~= 0.158655', () => {
    expect(qfunc(1)).toBeCloseTo(0.158655, 4);
  });
  it('Q(2) ~= 0.022750', () => {
    expect(qfunc(2)).toBeCloseTo(0.02275, 4);
  });
});

describe('clamp', () => {
  it('clamps within bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });
});

describe('linspace', () => {
  it('includes both endpoints', () => {
    expect(linspace(0, 1, 5)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });
  it('handles n=1', () => {
    expect(linspace(2, 9, 1)).toEqual([2]);
  });
});

describe('qfuncInv (inverse Q-function)', () => {
  it('inverts qfunc: qfuncInv(qfunc(x)) ≈ x', () => {
    for (const x of [-2, -0.5, 0, 1.5, 3]) {
      expect(qfuncInv(qfunc(x))).toBeCloseTo(x, 5);
    }
  });
  it('qfuncInv(0.5) = 0 (median)', () => {
    expect(qfuncInv(0.5)).toBeCloseTo(0, 6);
  });
  it('matches the standard normal upper-tail quantile (~1.6449 at p=0.05)', () => {
    expect(qfuncInv(0.05)).toBeCloseTo(1.6449, 3);
  });
  it('is decreasing in p', () => {
    expect(qfuncInv(0.01)).toBeGreaterThan(qfuncInv(0.1));
  });
});
