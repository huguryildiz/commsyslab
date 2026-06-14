import { describe, it, expect } from 'vitest';
import { DEFAULT_DOPPLER_PARAMS, deriveDoppler } from '@/modules/wireless/doppler-model';

describe('deriveDoppler', () => {
  it('produces plot arrays of the expected lengths and a positive Doppler shift', () => {
    const d = deriveDoppler(DEFAULT_DOPPLER_PARAMS);
    expect(d.fmHz).toBeGreaterThan(0);
    expect(d.psdFreq.length).toBe(d.psdVal.length);
    expect(d.acfTauMs.length).toBe(d.acfVal.length);
    expect(d.envTimeMs.length).toBe(d.envDb.length);
    expect(d.acfVal[0]).toBeCloseTo(1, 6); // R(0)=1
  });
  it('faster motion raises Doppler and shortens coherence time', () => {
    const slow = deriveDoppler(DEFAULT_DOPPLER_PARAMS);
    const fast = deriveDoppler({ ...DEFAULT_DOPPLER_PARAMS, speedKmh: 180 });
    expect(fast.fmHz).toBeGreaterThan(slow.fmHz);
    expect(fast.coherenceTimeMs).toBeLessThan(slow.coherenceTimeMs);
  });
  it('the envelope is deterministic for a fixed seed', () => {
    const a = deriveDoppler(DEFAULT_DOPPLER_PARAMS);
    const b = deriveDoppler(DEFAULT_DOPPLER_PARAMS);
    expect(a.envDb).toEqual(b.envDb);
  });
});
