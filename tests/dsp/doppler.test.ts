import { describe, it, expect } from 'vitest';
import { besselJ0 } from '@/lib/dsp/math';
import {
  maxDopplerHz,
  coherenceTimeS,
  jakesDopplerPsd,
  dopplerAutocorr,
  levelCrossingRateHz,
  avgFadeDurationS,
  fadingEnvelope,
} from '@/lib/dsp/doppler';

describe('besselJ0', () => {
  it('matches known values and zeros', () => {
    expect(besselJ0(0)).toBeCloseTo(1, 6);
    expect(besselJ0(2.404825558)).toBeCloseTo(0, 5); // first zero
    expect(besselJ0(5.520078110)).toBeCloseTo(0, 5); // second zero
    expect(besselJ0(1)).toBeCloseTo(0.7651976866, 5);
    expect(besselJ0(-1)).toBeCloseTo(besselJ0(1), 9); // even
  });
});

describe('maxDopplerHz & coherenceTimeS', () => {
  it('Doppler grows with speed and carrier; coherence time is its inverse', () => {
    const slow = maxDopplerHz(10, 900e6);
    const fast = maxDopplerHz(30, 900e6);
    const high = maxDopplerHz(10, 2.4e9);
    expect(fast).toBeGreaterThan(slow);
    expect(high).toBeGreaterThan(slow);
    expect(maxDopplerHz(30, 900e6)).toBeCloseTo((30 * 900e6) / 299792458, 6);
    expect(coherenceTimeS(fast)).toBeLessThan(coherenceTimeS(slow)); // faster → shorter T_ct
    expect(coherenceTimeS(50)).toBeCloseTo(1 / 100, 9);
  });
});

describe('jakesDopplerPsd', () => {
  it('is zero outside ±f_m and rises toward the band edge', () => {
    const fm = 100;
    expect(jakesDopplerPsd(150, fm)).toBe(0);
    expect(jakesDopplerPsd(-150, fm)).toBe(0);
    expect(jakesDopplerPsd(95, fm)).toBeGreaterThan(jakesDopplerPsd(0, fm)); // U-shape
    expect(jakesDopplerPsd(0, fm)).toBeCloseTo(1 / (Math.PI * fm), 9);
  });
});

describe('dopplerAutocorr', () => {
  it('is 1 at τ=0 and equals J₀(2π f_m τ)', () => {
    expect(dopplerAutocorr(0, 100)).toBeCloseTo(1, 6);
    expect(dopplerAutocorr(0.001, 100)).toBeCloseTo(besselJ0(2 * Math.PI * 100 * 0.001), 9);
  });
});

describe('levelCrossingRateHz & avgFadeDurationS', () => {
  it('LCR peaks near ρ=1/√2 and AFD increases with the threshold', () => {
    const fm = 100;
    const peak = levelCrossingRateHz(1 / Math.SQRT2, fm);
    expect(peak).toBeGreaterThan(levelCrossingRateHz(0.2, fm));
    expect(peak).toBeGreaterThan(levelCrossingRateHz(2.0, fm));
    expect(avgFadeDurationS(0.5, fm)).toBeLessThan(avgFadeDurationS(1.5, fm));
  });
});

describe('fadingEnvelope', () => {
  it('returns nSamples of unit-RMS envelope, deterministic for a seed', () => {
    const a = fadingEnvelope(100, 1000, 256, 42);
    const b = fadingEnvelope(100, 1000, 256, 42);
    expect(a.length).toBe(256);
    expect(a).toEqual(b);
    const ms = a.reduce((s, v) => s + v * v, 0) / a.length;
    expect(Math.sqrt(ms)).toBeCloseTo(1, 6); // unit RMS
    expect(a.every((v) => v >= 0)).toBe(true);
  });
});
