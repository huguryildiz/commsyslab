import { describe, it, expect } from 'vitest';
import { DEFAULT_FHSS_PARAMS, deriveFhss } from '@/modules/wireless/fhss-model';

describe('deriveFhss', () => {
  it('produces sweeps of equal length and a hop pattern of nHops', () => {
    const d = deriveFhss(DEFAULT_FHSS_PARAMS);
    expect(d.berFull.length).toBe(d.ebN0JSweep.length);
    expect(d.berBeta.length).toBe(d.ebN0JSweep.length);
    expect(d.berWorst.length).toBe(d.ebN0JSweep.length);
    expect(d.hopIdx.length).toBe(DEFAULT_FHSS_PARAMS.nHops);
    expect(d.hopIdx.every((v) => v >= 0 && v < DEFAULT_FHSS_PARAMS.nHopChannels)).toBe(true);
  });
  it('the worst-case partial-band curve sits above full-band at high E_b/N_J', () => {
    const d = deriveFhss(DEFAULT_FHSS_PARAMS);
    const last = d.ebN0JSweep.length - 1;
    expect(d.berWorst[last]).toBeGreaterThan(d.berFull[last]); // inverse beats exponential
  });
  it('more hop channels give a larger processing gain', () => {
    const a = deriveFhss(DEFAULT_FHSS_PARAMS);
    const b = deriveFhss({ ...DEFAULT_FHSS_PARAMS, nHopChannels: 128 });
    expect(b.processingGainDb).toBeGreaterThan(a.processingGainDb);
  });
});
