import { describe, it, expect } from 'vitest';
import {
  processingGainDb,
  partialBandBerBfsk,
  fullBandBerBfsk,
  worstCaseBeta,
  worstCaseBerBfsk,
  hopPattern,
} from '@/lib/dsp/fhss';

describe('processingGainDb', () => {
  it('is 10·log10 of the hop-slot count', () => {
    expect(processingGainDb(1000)).toBeCloseTo(30, 9);
    expect(processingGainDb(100)).toBeCloseTo(20, 9);
  });
});

describe('partial-band BFSK', () => {
  it('β=1 equals the full-band exponential case', () => {
    expect(partialBandBerBfsk(10, 1)).toBeCloseTo(fullBandBerBfsk(10), 12);
    expect(fullBandBerBfsk(10)).toBeCloseTo(0.5 * Math.exp(-5), 9);
  });
  it('worst-case β maximizes P_e over β', () => {
    const gammaDb = 13; // γ_b = ~20 → β* = 0.1
    const bStar = worstCaseBeta(gammaDb);
    const pStar = partialBandBerBfsk(gammaDb, bStar);
    for (const b of [0.05, 0.2, 0.5, 1]) {
      expect(pStar).toBeGreaterThanOrEqual(partialBandBerBfsk(gammaDb, b) - 1e-12);
    }
    expect(bStar).toBeCloseTo(2 / 10 ** (13 / 10), 9);
  });
  it('worst-case BER follows the inverse law e^-1/γ_b and beats full-band at high SNR', () => {
    expect(worstCaseBerBfsk(20)).toBeCloseTo(Math.exp(-1) / 10 ** 2, 9);
    expect(worstCaseBerBfsk(20)).toBeGreaterThan(fullBandBerBfsk(20)); // inverse > exponential
  });
  it('below γ_b=2 the worst case is just full-band (β*=1)', () => {
    expect(worstCaseBeta(0)).toBe(1); // γ_b=1 < 2
    expect(worstCaseBerBfsk(0)).toBeCloseTo(fullBandBerBfsk(0), 12);
  });
});

describe('hopPattern', () => {
  it('returns nHops indices within range, deterministic for a seed', () => {
    const a = hopPattern(64, 40, 5);
    const b = hopPattern(64, 40, 5);
    expect(a.length).toBe(40);
    expect(a).toEqual(b);
    expect(a.every((v) => v >= 0 && v < 64)).toBe(true);
  });
});
