import { describe, it, expect } from 'vitest';
import { zeroForcingTaps, mmseTaps, applyFilter, residualIsi } from '@/lib/dsp/equalizer';

describe('zeroForcingTaps', () => {
  it('is the truncated geometric inverse of 1 + 0.5 z⁻¹', () => {
    const w = zeroForcingTaps([1, 0.5], 4);
    expect(w[0]).toBeCloseTo(1, 12);
    expect(w[1]).toBeCloseTo(-0.5, 12);
    expect(w[2]).toBeCloseTo(0.25, 12);
    expect(w[3]).toBeCloseTo(-0.125, 12);
  });
  it('forces the first nTaps−1 off-center samples to zero', () => {
    const ch = [1, 0.5];
    const eq = applyFilter(ch, zeroForcingTaps(ch, 4));
    expect(eq[0]).toBeCloseTo(1, 12);
    expect(Math.abs(eq[1])).toBeLessThan(1e-9);
    expect(Math.abs(eq[2])).toBeLessThan(1e-9);
    expect(Math.abs(eq[3])).toBeLessThan(1e-9);
  });
});

describe('residualIsi', () => {
  it('shrinks toward zero as the tap count grows', () => {
    const ch = [1, 0.5];
    const r4 = residualIsi(ch, zeroForcingTaps(ch, 4));
    const r12 = residualIsi(ch, zeroForcingTaps(ch, 12));
    expect(r12).toBeLessThan(r4);
    expect(r12).toBeLessThan(1e-3);
  });
});

describe('mmseTaps', () => {
  it('reduces to the zero-forcing solution as noise variance → 0', () => {
    const ch = [1, 0.5];
    const zf = zeroForcingTaps(ch, 4);
    const mmse = mmseTaps(ch, 0, 4);
    for (let i = 0; i < zf.length; i++) expect(mmse[i]).toBeCloseTo(zf[i], 6);
  });
  it('shrinks the taps (less noise enhancement) as noise variance grows', () => {
    const ch = [1, 0.5];
    const norm = (w: number[]) => Math.sqrt(w.reduce((s, v) => s + v * v, 0));
    expect(norm(mmseTaps(ch, 1, 4))).toBeLessThan(norm(zeroForcingTaps(ch, 4)));
  });
});
