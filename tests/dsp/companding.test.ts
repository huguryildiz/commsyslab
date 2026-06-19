import { describe, it, expect } from 'vitest';
import {
  muLawCompress,
  muLawExpand,
  aLawCompress,
  aLawExpand,
  compandedQuantize,
  sqnrVsAmplitude,
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

describe('compandedQuantize', () => {
  it('with law="none" equals a plain uniform midrise quantizer', () => {
    // 3-bit uniform over [-1,1]: step 0.25, midrise levels at ±0.125, ±0.375, ...
    expect(compandedQuantize(0.3, 1, 3, 'none', 0)).toBeCloseTo(0.375, 12);
  });
  it('returns a value within full scale for in-range input', () => {
    const q = compandedQuantize(0.4, 1, 4, 'mu', 255);
    expect(Math.abs(q)).toBeLessThanOrEqual(1 + 1e-9);
  });
});

describe('sqnrVsAmplitude', () => {
  it('μ-law gives higher SQNR than uniform for a small-amplitude signal', () => {
    const amps = [0.02];
    const uniform = sqnrVsAmplitude(amps, 6, 'none', 0)[0];
    const mu = sqnrVsAmplitude(amps, 6, 'mu', 255)[0];
    expect(mu).toBeGreaterThan(uniform); // companding protects quiet signals
  });
  it('μ-law SQNR is flatter across amplitude than uniform', () => {
    const amps = [0.02, 0.2, 0.9];
    const uni = sqnrVsAmplitude(amps, 6, 'none', 0);
    const mu = sqnrVsAmplitude(amps, 6, 'mu', 255);
    const spread = (a: number[]) => Math.max(...a) - Math.min(...a);
    expect(spread(mu)).toBeLessThan(spread(uni));
  });
});
