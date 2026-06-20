import { describe, it, expect } from 'vitest';
import {
  DEFAULT_MIMO_PARAMS,
  deriveMimo,
  deriveAlamouti,
  deriveMimoErrorRate,
} from '@/modules/wireless/mimo-model';

describe('deriveAlamouti', () => {
  it('Alamouti beats SISO and tracks 1x2 MRC within ~3 dB', () => {
    const d = deriveAlamouti({ ebN0Min: 0, ebN0Max: 20, points: 11 });
    const last = d.ebN0.length - 1;
    expect(d.alamouti[last]).toBeLessThan(d.siso[last]); // diversity gain
    expect(d.alamouti[last]).toBeGreaterThan(d.mrc1x2[last]); // ~3 dB array-gain penalty
  });
});

describe('deriveMimoErrorRate', () => {
  it('MMSE ≤ ZF and both fall with SNR', () => {
    const d = deriveMimoErrorRate({ nt: 2, nr: 2, snrMin: 0, snrMax: 18, points: 7, trials: 200, seed: 3 });
    const k = d.snr.length - 1;
    expect(d.mmse[k]).toBeLessThanOrEqual(d.zf[k] + 1e-3);
    expect(d.zf[k]).toBeLessThan(d.zf[0]);
  });
});

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
