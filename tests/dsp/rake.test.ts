import { describe, it, expect } from 'vitest';
import { resolvableFingers, rakeBerAntipodal } from '@/lib/dsp/rake';
import { exponentialPdp } from '@/lib/dsp/fading';
import { rayleighBerAntipodal, awgnBerAntipodal } from '@/lib/dsp/diversity';

describe('resolvableFingers', () => {
  it('merges taps within a chip and resolves taps a chip apart', () => {
    const taps = exponentialPdp(4, 1e-6, 0.5e-6); // delays 0, 0.5, 1.0, 1.5 µs
    expect(resolvableFingers(taps, 1e-6)).toHaveLength(2); // ~1 µs chip → 2 fingers
    expect(resolvableFingers(taps, 0.4e-6)).toHaveLength(4); // short chip → 4 fingers
    expect(resolvableFingers(taps, 5e-6)).toHaveLength(1); // long chip → 1 finger
  });
  it('finger powers are normalized to sum 1', () => {
    const taps = exponentialPdp(6, 1e-6, 0.3e-6);
    const f = resolvableFingers(taps, 0.5e-6);
    expect(f.reduce((s, p) => s + p, 0)).toBeCloseTo(1, 9);
  });
});

describe('rakeBerAntipodal', () => {
  it('L=1 equals flat Rayleigh (no diversity)', () => {
    expect(rakeBerAntipodal(10, 1)).toBeCloseTo(rayleighBerAntipodal(10), 9);
  });
  it('more fingers lower the BER (diversity gain)', () => {
    expect(rakeBerAntipodal(10, 3)).toBeLessThan(rakeBerAntipodal(10, 1));
    expect(rakeBerAntipodal(10, 5)).toBeLessThan(rakeBerAntipodal(10, 3));
  });
  it('stays above the AWGN bound', () => {
    expect(rakeBerAntipodal(10, 4)).toBeGreaterThan(awgnBerAntipodal(10));
  });
});
