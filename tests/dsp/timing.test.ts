import { describe, it, expect } from 'vitest';
import { raisedCosineAutocorr, earlyLateError, timingSCurve } from '@/lib/dsp/timing';

describe('raisedCosineAutocorr', () => {
  it('peaks at the origin and is even', () => {
    expect(raisedCosineAutocorr(0)).toBeCloseTo(1, 12);
    expect(raisedCosineAutocorr(0.3)).toBeCloseTo(raisedCosineAutocorr(-0.3), 12);
    expect(raisedCosineAutocorr(0.3)).toBeLessThan(1);
  });
});

describe('earlyLateError (§8.9.1)', () => {
  it('is zero at perfect timing (τ = 0)', () => {
    expect(earlyLateError(0, 0.25)).toBeCloseTo(0, 12);
  });
  it('is an odd S-curve around the lock point', () => {
    const e = earlyLateError(0.2, 0.25);
    expect(earlyLateError(-0.2, 0.25)).toBeCloseTo(-e, 12);
    expect(e).not.toBe(0);
  });
  it('points back toward the lock: positive offset → restoring sign', () => {
    // For a symmetric autocorrelation peak, |R(τ−δ)| > |R(τ+δ)| when τ>0.
    expect(earlyLateError(0.2, 0.25)).toBeGreaterThan(0);
    expect(earlyLateError(-0.2, 0.25)).toBeLessThan(0);
  });
});

describe('timingSCurve', () => {
  it('samples the discriminator across offsets, zero-crossing at τ=0', () => {
    const s = timingSCurve(0.25, 41);
    expect(s).toHaveLength(41);
    const mid = s[(41 - 1) / 2];
    expect(mid.tau).toBeCloseTo(0, 12);
    expect(mid.error).toBeCloseTo(0, 9);
  });
});
