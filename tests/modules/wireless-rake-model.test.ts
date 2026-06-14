import { describe, it, expect } from 'vitest';
import { DEFAULT_RAKE_PARAMS, deriveRake } from '@/modules/wireless/rake-model';

describe('deriveRake', () => {
  it('builds a PDP and resolves at least one finger with normalized powers', () => {
    const d = deriveRake(DEFAULT_RAKE_PARAMS);
    expect(d.tapPowers.length).toBe(DEFAULT_RAKE_PARAMS.nTaps);
    expect(d.fingerCount).toBeGreaterThanOrEqual(1);
    expect(d.fingerPowers.reduce((s, p) => s + p, 0)).toBeCloseTo(1, 9);
    expect(d.fingerSnrsDb.length).toBe(d.fingerCount);
  });
  it('RAKE beats no-RAKE at high SNR, and all BER curves share the sweep length', () => {
    const d = deriveRake(DEFAULT_RAKE_PARAMS);
    expect(d.berRake.length).toBe(d.ebN0Sweep.length);
    expect(d.berNoRake.length).toBe(d.ebN0Sweep.length);
    expect(d.berAwgn.length).toBe(d.ebN0Sweep.length);
    const last = d.ebN0Sweep.length - 1;
    expect(d.berRake[last]).toBeLessThan(d.berNoRake[last]);
  });
  it('a lower chip rate (narrower band) resolves no more fingers', () => {
    const wide = deriveRake(DEFAULT_RAKE_PARAMS);
    const narrow = deriveRake({ ...DEFAULT_RAKE_PARAMS, chipRateMcps: 0.5 });
    expect(narrow.fingerCount).toBeLessThanOrEqual(wide.fingerCount);
  });
});
