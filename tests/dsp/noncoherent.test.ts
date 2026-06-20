import { describe, it, expect } from 'vitest';
import {
  noncoherentFskPb,
  noncoherentFskPm,
  noncoherentFskBer,
  squareLawDecide,
  simulateNoncoherentFsk,
} from '@/lib/dsp/noncoherent';

describe('noncoherent FSK error probability', () => {
  it('binary P_b = ½ e^{-Eb/2N0} (Eq. 9.5.41)', () => {
    const g = 10 ** (8 / 10);
    expect(noncoherentFskPb(8)).toBeCloseTo(0.5 * Math.exp(-g / 2), 12);
  });
  it('M=2 symbol error from the M-ary sum equals the binary closed form', () => {
    expect(noncoherentFskPm(2, 8)).toBeCloseTo(noncoherentFskPb(8), 12);
  });
  it('M-ary sum (Eq. 9.5.40) decreases monotonically with SNR', () => {
    expect(noncoherentFskPm(4, 12)).toBeLessThan(noncoherentFskPm(4, 4));
    expect(noncoherentFskPm(8, 12)).toBeLessThan(noncoherentFskPm(8, 4));
  });
  it('bit error uses the (M/2)/(M-1) orthogonal factor', () => {
    const pm = noncoherentFskPm(4, 9);
    expect(noncoherentFskBer(4, 9)).toBeCloseTo((4 / 2 / (4 - 1)) * pm, 12);
  });
  it('binary noncoherent FSK needs ~2x the energy of binary DPSK (Example 9.5.1)', () => {
    // DPSK: ½ e^{-Eb/N0}; noncoh FSK: ½ e^{-Eb/2N0}. Same Pb when (Eb/N0)_fsk = 2·(Eb/N0)_dpsk.
    const dpskAt = 6; // dB
    const gd = 10 ** (dpskAt / 10);
    const fskLin = 2 * gd; // twice the linear SNR
    const fskDb = 10 * Math.log10(fskLin);
    expect(noncoherentFskPb(fskDb)).toBeCloseTo(0.5 * Math.exp(-gd), 6);
  });
});

describe('squareLawDecide', () => {
  it('selects the branch with the largest envelope yc²+ys²', () => {
    const branches = [
      { yc: 0.1, ys: 0.0 },
      { yc: 0.2, ys: 0.9 }, // largest
      { yc: -0.3, ys: 0.1 },
    ];
    expect(squareLawDecide(branches)).toBe(1);
  });
});

describe('simulateNoncoherentFsk', () => {
  it('binary BER tracks ½ e^{-Eb/2N0} within Monte-Carlo tolerance', () => {
    const r = simulateNoncoherentFsk({ M: 2, ebN0Db: 6, numSymbols: 200000, seed: 11 });
    const theory = noncoherentFskPb(6);
    expect(r.ber).toBeGreaterThan(theory * 0.85);
    expect(r.ber).toBeLessThan(theory * 1.15);
  });
  it('M=4 SER tracks the M-ary sum within tolerance', () => {
    const r = simulateNoncoherentFsk({ M: 4, ebN0Db: 8, numSymbols: 120000, seed: 4 });
    const theory = noncoherentFskPm(4, 8);
    expect(r.ser).toBeGreaterThan(theory * 0.8);
    expect(r.ser).toBeLessThan(theory * 1.2);
  });
  it('reports consistent counts', () => {
    const r = simulateNoncoherentFsk({ M: 8, ebN0Db: 9, numSymbols: 4000, seed: 2 });
    expect(r.totalSymbols).toBe(4000);
    expect(r.totalBits).toBe(4000 * 3);
    expect(r.ser).toBeCloseTo(r.symErrors / r.totalSymbols, 12);
  });
});
