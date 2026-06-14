import { describe, it, expect } from 'vitest';
import { DEFAULT_SPREAD_PARAMS, deriveSpread } from '@/modules/wireless/spread-model';

describe('deriveSpread', () => {
  it('exposes the PN length N = 2^n - 1 and processing gain', () => {
    const d = deriveSpread(DEFAULT_SPREAD_PARAMS);
    const N = (1 << DEFAULT_SPREAD_PARAMS.registerLength) - 1;
    expect(d.N).toBe(N);
    expect(d.processingGainDb).toBeCloseTo(10 * Math.log10(N), 9);
    expect(d.autocorr.length).toBe(N);
    expect(d.autocorr[0]).toBe(N);
  });
  it('produces equal-length pre/post despread spectra', () => {
    const d = deriveSpread(DEFAULT_SPREAD_PARAMS);
    expect(d.spectrumSpread.length).toBeGreaterThan(2);
    expect(d.spectrumDespread.length).toBe(d.spectrumSpread.length);
    expect(d.freqs.length).toBe(d.spectrumSpread.length);
  });
  it('produces BER-vs-JSR curves: spread beats unspread (lower BER) at high JSR', () => {
    const d = deriveSpread(DEFAULT_SPREAD_PARAMS);
    expect(d.jsrSweep.length).toBeGreaterThan(2);
    expect(d.berSpread.length).toBe(d.jsrSweep.length);
    expect(d.berUnspread.length).toBe(d.jsrSweep.length);
    const last = d.jsrSweep.length - 1; // highest JSR
    expect(d.berSpread[last]).toBeLessThan(d.berUnspread[last]);
  });
});
