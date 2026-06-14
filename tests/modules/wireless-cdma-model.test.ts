import { describe, it, expect } from 'vitest';
import { DEFAULT_CDMA_PARAMS, deriveCdma } from '@/modules/wireless/cdma-model';

describe('deriveCdma', () => {
  it('produces aligned sweeps and a BER that rises with the user count', () => {
    const d = deriveCdma(DEFAULT_CDMA_PARAMS);
    expect(d.berVsUsers.length).toBe(d.userSweep.length);
    expect(d.berPc.length).toBe(d.ebN0Sweep.length);
    expect(d.berNf.length).toBe(d.ebN0Sweep.length);
    expect(d.berVsUsers[40]).toBeGreaterThan(d.berVsUsers[5]); // more users → worse
    expect(d.capacity).toBeGreaterThanOrEqual(1);
  });
  it('near-far raises the BER floor versus perfect power control', () => {
    const d = deriveCdma({ ...DEFAULT_CDMA_PARAMS, nearFarDb: 9 });
    const hi = d.ebN0Sweep.length - 1;
    expect(d.berNf[hi]).toBeGreaterThan(d.berPc[hi]); // near-far floors out
    expect(d.capacity).toBeLessThan(deriveCdma(DEFAULT_CDMA_PARAMS).capacity);
  });
  it('with perfect power control the two E_b/N_0 curves coincide', () => {
    const d = deriveCdma(DEFAULT_CDMA_PARAMS); // nearFarDb = 0 → Γ = 1
    expect(d.berNf).toEqual(d.berPc);
  });
});
