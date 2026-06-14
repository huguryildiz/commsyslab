import { describe, it, expect } from 'vitest';
import type { Complex } from '@/lib/dsp/fft';
import { ofdmModulate, ofdmDemodulate, cabs, addCyclicPrefix, removeCyclicPrefix } from '@/lib/dsp/ofdm';

function expectComplexClose(a: Complex[], b: Complex[], digits = 9): void {
  expect(a.length).toBe(b.length);
  for (let i = 0; i < a.length; i++) {
    expect(a[i].re).toBeCloseTo(b[i].re, digits);
    expect(a[i].im).toBeCloseTo(b[i].im, digits);
  }
}

describe('ofdmModulate / ofdmDemodulate', () => {
  it('demodulate(modulate(X)) recovers the subcarrier symbols (FFT∘IFFT identity)', () => {
    const X: Complex[] = [
      { re: 0.707, im: 0.707 },
      { re: -0.707, im: 0.707 },
      { re: 0.707, im: -0.707 },
      { re: -0.707, im: -0.707 },
    ];
    const time = ofdmModulate(X);
    expect(time).toHaveLength(X.length);
    const recovered = ofdmDemodulate(time);
    expectComplexClose(recovered, X);
  });
});

describe('cabs', () => {
  it('returns the complex magnitude', () => {
    expect(cabs({ re: 3, im: 4 })).toBeCloseTo(5, 12);
  });
});

describe('addCyclicPrefix / removeCyclicPrefix', () => {
  it('prepends the last cp samples and removes them again', () => {
    const time: Complex[] = [
      { re: 1, im: 0 },
      { re: 2, im: 0 },
      { re: 3, im: 0 },
      { re: 4, im: 0 },
    ];
    const withCp = addCyclicPrefix(time, 2);
    expect(withCp).toHaveLength(6);
    expect(withCp.map((z) => z.re)).toEqual([3, 4, 1, 2, 3, 4]);
    const body = removeCyclicPrefix(withCp, 2, 4);
    expect(body.map((z) => z.re)).toEqual([1, 2, 3, 4]);
  });
  it('cp = 0 is a no-op', () => {
    const time: Complex[] = [{ re: 5, im: -1 }];
    expect(addCyclicPrefix(time, 0)).toEqual(time);
  });
});
