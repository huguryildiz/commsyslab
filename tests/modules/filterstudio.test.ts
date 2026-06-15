import { describe, it, expect } from 'vitest';
import { buildFilterStudio, DEFAULT_STUDIO, type FilterStudioParams } from '@/modules/fourier/filterStudio';

const params = (over: Partial<FilterStudioParams>): FilterStudioParams => ({ ...DEFAULT_STUDIO, ...over });

describe('buildFilterStudio', () => {
  it('returns aligned, finite arrays', () => {
    const v = buildFilterStudio(DEFAULT_STUDIO);
    expect(v.time.length).toBe(v.xInput.length);
    expect(v.time.length).toBe(v.yOutput.length);
    expect(v.freqs.length).toBe(v.magX.length);
    expect(v.freqs.length).toBe(v.magH.length);
    expect(v.freqs.length).toBe(v.magY.length);
    expect(v.xInput.every(Number.isFinite)).toBe(true);
    expect(v.yOutput.every(Number.isFinite)).toBe(true);
  });

  it('ideal LPF zeroes spectrum above the cutoff (magY≈0) and keeps it below', () => {
    const v = buildFilterStudio(params({ source: 'square', f0: 20, filterType: 'lpf', response: 'ideal', fc: 50 }));
    const above = v.freqs.map((f, i) => ({ f, m: v.magY[i] })).filter((p) => p.f > 60);
    const belowPeak = Math.max(...v.freqs.map((f, i) => (f > 0 && f < 50 ? v.magY[i] : 0)));
    expect(Math.max(...above.map((p) => p.m))).toBeLessThan(1e-6);
    expect(belowPeak).toBeGreaterThan(0);
  });

  it('magY equals magX·magH bin-by-bin', () => {
    const v = buildFilterStudio(params({ source: 'sawtooth', filterType: 'hpf', response: 'butterworth', fc: 40, order: 4 }));
    for (let i = 0; i < v.freqs.length; i += 7) {
      expect(Math.abs(v.magY[i] - v.magX[i] * v.magH[i])).toBeLessThan(1e-9);
    }
  });

  it('low-cutoff LPF removes high harmonics → output is smoother (smaller max |Δ| between samples) than input', () => {
    const v = buildFilterStudio(params({ source: 'square', f0: 20, filterType: 'lpf', response: 'ideal', fc: 30 }));
    const maxDiff = (a: number[]) => Math.max(...a.slice(1).map((x, i) => Math.abs(x - a[i])));
    expect(maxDiff(v.yOutput)).toBeLessThan(maxDiff(v.xInput));
  });

  it('noise source is deterministic (same params → identical buffers)', () => {
    const a = buildFilterStudio(params({ source: 'white' }));
    const b = buildFilterStudio(params({ source: 'white' }));
    expect(a.xInput).toEqual(b.xInput);
  });
});
