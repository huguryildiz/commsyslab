import { describe, it, expect } from 'vitest';
import type { Complex } from '@/lib/dsp/fft';
import { ofdmModulate, ofdmDemodulate, cabs } from '@/lib/dsp/ofdm';

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
