import { describe, it, expect } from 'vitest';
import {
  muLawCompress,
  muLawExpand,
  aLawCompress,
  aLawExpand,
} from '@/lib/dsp/companding';

describe('muLawCompress', () => {
  it('maps endpoints: 0→0 and ±1→±1', () => {
    expect(muLawCompress(0, 255)).toBe(0);
    expect(muLawCompress(1, 255)).toBeCloseTo(1, 12);
    expect(muLawCompress(-1, 255)).toBeCloseTo(-1, 12);
  });
  it('is an odd, monotonically increasing compressor (boosts small values)', () => {
    expect(muLawCompress(0.5, 255)).toBeCloseTo(0.8756, 3); // > 0.5: small-signal gain
    expect(muLawCompress(-0.5, 255)).toBeCloseTo(-0.8756, 3);
    expect(muLawCompress(0.25, 255)).toBeGreaterThan(muLawCompress(0.1, 255));
  });
});

describe('muLawExpand', () => {
  it('inverts muLawCompress (round-trip)', () => {
    for (const x of [-0.9, -0.3, 0, 0.2, 0.7, 1]) {
      expect(muLawExpand(muLawCompress(x, 255), 255)).toBeCloseTo(x, 9);
    }
  });
});

describe('aLawCompress', () => {
  it('maps endpoints: 0→0 and 1→1', () => {
    expect(aLawCompress(0, 87.56)).toBe(0);
    expect(aLawCompress(1, 87.56)).toBeCloseTo(1, 12);
  });
  it('is continuous at the breakpoint |x| = 1/A', () => {
    const A = 87.56;
    const below = aLawCompress(1 / A - 1e-9, A);
    const above = aLawCompress(1 / A + 1e-9, A);
    expect(Math.abs(above - below)).toBeLessThan(1e-6);
  });
});

describe('aLawExpand', () => {
  it('inverts aLawCompress (round-trip)', () => {
    for (const x of [-0.95, -0.2, 0, 0.05, 0.6, 1]) {
      expect(aLawExpand(aLawCompress(x, 87.56), 87.56)).toBeCloseTo(x, 9);
    }
  });
});
