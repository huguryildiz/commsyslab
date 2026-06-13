import { describe, it, expect } from 'vitest';
import { window as makeWindow } from '@/lib/dsp/window';

describe('window', () => {
  it('rect is all ones', () => {
    const w = makeWindow('rect', 5);
    expect(w).toEqual([1, 1, 1, 1, 1]);
  });

  it('hann is zero at the endpoints and 1 at the centre', () => {
    const N = 9;
    const w = makeWindow('hann', N);
    expect(w[0]).toBeCloseTo(0, 12);
    expect(w[N - 1]).toBeCloseTo(0, 12);
    expect(w[(N - 1) / 2]).toBeCloseTo(1, 12);
  });

  it('hamming has the characteristic 0.08 pedestal at the endpoints', () => {
    const w = makeWindow('hamming', 9);
    expect(w[0]).toBeCloseTo(0.08, 6);
  });

  it('returns the requested length', () => {
    expect(makeWindow('hann', 32)).toHaveLength(32);
  });
});
