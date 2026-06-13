import { describe, it, expect } from 'vitest';
import { DEFAULT_PARAMS, deriveAll } from '@/modules/wireless/model';

describe('deriveAll', () => {
  it('produces plot-ready arrays consistent with the params', () => {
    const d = deriveAll(DEFAULT_PARAMS);
    expect(d.taps.length).toBe(DEFAULT_PARAMS.nTaps);
    expect(d.freqs.length).toBe(d.magResponse.length);
    expect(d.envelope.length).toBe(DEFAULT_PARAMS.nSamples);
    expect(d.sigmaTau).toBeGreaterThan(0);
    expect(d.coherenceBw).toBeGreaterThan(0);
    expect(d.coherenceTime).toBeGreaterThan(0);
    expect(d.pdf.r.length).toBe(d.pdf.fr.length);
  });
  it('is deterministic (memo-safe) for identical params', () => {
    const a = deriveAll(DEFAULT_PARAMS);
    const b = deriveAll(DEFAULT_PARAMS);
    expect(Array.from(a.envelope)).toEqual(Array.from(b.envelope));
  });
  it('K = 0 selects the Rayleigh PDF branch (finite, positive)', () => {
    const d = deriveAll({ ...DEFAULT_PARAMS, K: 0 });
    expect(d.pdf.fr.every((v) => Number.isFinite(v) && v >= 0)).toBe(true);
  });
});
