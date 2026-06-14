import { describe, it, expect } from 'vitest';
import { alamoutiBerAntipodal, mimoCapacity } from '@/lib/dsp/mimo';
import { mrcBerAntipodal, rayleighBerAntipodal } from '@/lib/dsp/diversity';

describe('alamoutiBerAntipodal', () => {
  it('2x1 equals 2-branch MRC at half the average SNR (3 dB Tx split)', () => {
    expect(alamoutiBerAntipodal(12, 1)).toBeCloseTo(mrcBerAntipodal(12 - 10 * Math.log10(2), 2), 12);
  });
  it('beats SISO Rayleigh and steepens with more receive antennas', () => {
    expect(alamoutiBerAntipodal(15, 1)).toBeLessThan(rayleighBerAntipodal(15));
    expect(alamoutiBerAntipodal(15, 2)).toBeLessThan(alamoutiBerAntipodal(15, 1));
  });
});

describe('mimoCapacity', () => {
  it('is deterministic for a fixed seed', () => {
    expect(mimoCapacity(10, 2, 2, 200, 7)).toBe(mimoCapacity(10, 2, 2, 200, 7));
  });
  it('grows with min(Nt, Nr) and exceeds SISO at the same SNR', () => {
    const siso = mimoCapacity(10, 1, 1, 400, 7);
    const simo = mimoCapacity(10, 1, 2, 400, 7);
    const mimo = mimoCapacity(10, 2, 2, 400, 7);
    expect(simo).toBeGreaterThan(siso);
    expect(mimo).toBeGreaterThan(simo); // min(2,2)=2 > min(1,2)=1
  });
  it('SISO ergodic capacity is positive and below the AWGN bound log2(1+rho)', () => {
    const rho = 10 ** (10 / 10);
    const c = mimoCapacity(10, 1, 1, 400, 7);
    expect(c).toBeGreaterThan(0);
    expect(c).toBeLessThan(Math.log2(1 + rho)); // fading loses vs a fixed unit-gain channel
  });
});
