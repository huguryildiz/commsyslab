import { describe, it, expect } from 'vitest';
import { DEFAULT_BER_PARAMS, deriveBer } from '@/modules/wireless/ber-model';

describe('deriveBer', () => {
  it('produces equal-length BER curves over the Eb/N0 sweep', () => {
    const d = deriveBer(DEFAULT_BER_PARAMS);
    expect(d.ebN0.length).toBeGreaterThan(2);
    expect(d.awgn.length).toBe(d.ebN0.length);
    expect(d.rayleigh.length).toBe(d.ebN0.length);
    expect(d.mrc.length).toBe(d.ebN0.length);
  });
  it('Rayleigh BER is worse than AWGN across the sweep', () => {
    const d = deriveBer(DEFAULT_BER_PARAMS);
    for (let i = 0; i < d.ebN0.length; i++) {
      expect(d.rayleigh[i]).toBeGreaterThanOrEqual(d.awgn[i] - 1e-9);
    }
  });
  it('exposes outage curves: one per shadowing sigma, sigma=0 first', () => {
    const d = deriveBer(DEFAULT_BER_PARAMS);
    expect(d.outage.gammaBar.length).toBeGreaterThan(2);
    expect(d.outage.curves.length).toBeGreaterThanOrEqual(2);
    expect(d.outage.curves[0].sigmaDb).toBe(0);
    expect(d.outage.curves[0].pout.length).toBe(d.outage.gammaBar.length);
  });
  it('uses the orthogonal Rayleigh form when modulation is orthogonal', () => {
    const d = deriveBer({ ...DEFAULT_BER_PARAMS, modulation: 'orthogonal' });
    // orthogonal is strictly worse than antipodal at the same point
    const a = deriveBer({ ...DEFAULT_BER_PARAMS, modulation: 'antipodal' });
    const mid = Math.floor(d.ebN0.length / 2);
    expect(d.rayleigh[mid]).toBeGreaterThan(a.rayleigh[mid]);
  });
});
