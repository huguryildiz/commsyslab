import { describe, it, expect } from 'vitest';
import { DEFAULT_MIMO_PARAMS, deriveMimo } from '@/modules/wireless/mimo-model';

describe('deriveMimo', () => {
  it('BER curves share the sweep length and Alamouti beats SISO at high SNR', () => {
    const d = deriveMimo(DEFAULT_MIMO_PARAMS);
    expect(d.berSiso.length).toBe(d.ebN0Sweep.length);
    expect(d.berAlamouti21.length).toBe(d.ebN0Sweep.length);
    expect(d.berAlamouti22.length).toBe(d.ebN0Sweep.length);
    const last = d.ebN0Sweep.length - 1;
    expect(d.berAlamouti21[last]).toBeLessThan(d.berSiso[last]);
    expect(d.berAlamouti22[last]).toBeLessThan(d.berAlamouti21[last]);
  });
  it('capacity curves share the SNR sweep length and MIMO exceeds SISO', () => {
    const d = deriveMimo(DEFAULT_MIMO_PARAMS);
    expect(d.capSiso.length).toBe(d.snrSweep.length);
    expect(d.capMimo.length).toBe(d.snrSweep.length);
    const mid = Math.floor(d.snrSweep.length / 2);
    expect(d.capMimo[mid]).toBeGreaterThan(d.capSiso[mid]);
  });
  it('is deterministic for a fixed seed', () => {
    const a = deriveMimo(DEFAULT_MIMO_PARAMS);
    const b = deriveMimo(DEFAULT_MIMO_PARAMS);
    expect(a.capMimo).toEqual(b.capMimo);
  });
});
