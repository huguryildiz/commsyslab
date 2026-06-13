import { describe, it, expect } from 'vitest';
import { fft, ifft, spectrum, type Complex } from '@/lib/dsp/fft';

const mag = (c: Complex) => Math.hypot(c.re, c.im);

describe('fft', () => {
  it('DC signal -> all energy in bin 0', () => {
    const X = fft([1, 1, 1, 1]);
    expect(X[0].re).toBeCloseTo(4, 10);
    expect(X[0].im).toBeCloseTo(0, 10);
    for (let k = 1; k < 4; k++) expect(mag(X[k])).toBeCloseTo(0, 10);
  });

  it('single cosine -> two symmetric bins (radix-2, N=8)', () => {
    const N = 8;
    const x = Array.from({ length: N }, (_, n) => Math.cos((2 * Math.PI * 1 * n) / N));
    const X = fft(x);
    // cos at bin 1 -> magnitude N/2 at k=1 and k=N-1
    expect(mag(X[1])).toBeCloseTo(N / 2, 8);
    expect(mag(X[7])).toBeCloseTo(N / 2, 8);
    expect(mag(X[2])).toBeCloseTo(0, 8);
  });

  it('matches the naive DFT for a non-power-of-two length', () => {
    const x = [1, 2, 3, 4, 5]; // N=5 -> O(N^2) DFT fallback
    const X = fft(x);
    // reference DFT
    const N = x.length;
    for (let k = 0; k < N; k++) {
      let re = 0;
      let im = 0;
      for (let n = 0; n < N; n++) {
        const ph = (-2 * Math.PI * k * n) / N;
        re += x[n] * Math.cos(ph);
        im += x[n] * Math.sin(ph);
      }
      expect(X[k].re).toBeCloseTo(re, 8);
      expect(X[k].im).toBeCloseTo(im, 8);
    }
  });

  it('Parseval: sum|x|^2 == (1/N) sum|X|^2', () => {
    const x = [3, 1, 4, 1, 5, 9, 2, 6];
    const X = fft(x);
    const timeE = x.reduce((s, v) => s + v * v, 0);
    const freqE = X.reduce((s, c) => s + c.re * c.re + c.im * c.im, 0) / x.length;
    expect(freqE).toBeCloseTo(timeE, 8);
  });
});

describe('ifft', () => {
  it('ifft(fft(x)) ~= x', () => {
    const x = [3, 1, 4, 1, 5, 9, 2, 6];
    const r = ifft(fft(x));
    for (let n = 0; n < x.length; n++) expect(r[n].re).toBeCloseTo(x[n], 8);
  });

  it('round-trips a non-power-of-two length', () => {
    const x = [1, -2, 3, 7, 0, -4, 5];
    const r = ifft(fft(x));
    for (let n = 0; n < x.length; n++) expect(r[n].re).toBeCloseTo(x[n], 8);
  });
});

describe('spectrum', () => {
  it('returns fftshifted frequency axis in [-fs/2, fs/2)', () => {
    const fs = 8;
    const x = Array.from({ length: 8 }, () => 0);
    const s = spectrum(x, fs);
    expect(s.freq[0]).toBeCloseTo(-fs / 2, 10);
    expect(s.freq.length).toBe(8);
    // monotonic increasing
    for (let i = 1; i < s.freq.length; i++) expect(s.freq[i]).toBeGreaterThan(s.freq[i - 1]);
  });

  it('a pure tone peaks at its frequency', () => {
    const fs = 16;
    const f0 = 2;
    const N = 16;
    const x = Array.from({ length: N }, (_, n) => Math.cos((2 * Math.PI * f0 * n) / fs));
    const s = spectrum(x, fs);
    let peakIdx = 0;
    for (let i = 1; i < s.mag.length; i++) if (s.mag[i] > s.mag[peakIdx]) peakIdx = i;
    expect(Math.abs(Math.abs(s.freq[peakIdx]) - f0)).toBeLessThan(1e-6);
  });
});
