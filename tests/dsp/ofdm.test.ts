import { describe, it, expect } from 'vitest';
import type { Complex } from '@/lib/dsp/fft';
import { ofdmModulate, ofdmDemodulate, cabs, addCyclicPrefix, removeCyclicPrefix, convolveChannel, channelFreqResponse, equalizeZf, exponentialChannelTaps } from '@/lib/dsp/ofdm';
import { makeRng } from '@/lib/dsp/random';

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

describe('convolveChannel', () => {
  it('is the linear convolution of two complex sequences', () => {
    const a: Complex[] = [{ re: 1, im: 0 }, { re: 1, im: 0 }];
    const h: Complex[] = [{ re: 1, im: 0 }, { re: 1, im: 0 }];
    const y = convolveChannel(a, h);
    expect(y).toHaveLength(3);
    expect(y.map((z) => z.re)).toEqual([1, 2, 1]);
  });
  it('a unit-impulse channel passes the signal through unchanged', () => {
    const a: Complex[] = [{ re: 2, im: 1 }, { re: -1, im: 3 }];
    const h: Complex[] = [{ re: 1, im: 0 }];
    const y = convolveChannel(a, h);
    expect(y.map((z) => z.re)).toEqual([2, -1]);
    expect(y.map((z) => z.im)).toEqual([1, 3]);
  });
});

describe('channelFreqResponse', () => {
  it('a unit-impulse channel has a flat |H| = 1 over all subcarriers', () => {
    const h: Complex[] = [{ re: 1, im: 0 }];
    const H = channelFreqResponse(h, 8);
    expect(H).toHaveLength(8);
    for (const v of H) expect(cabs(v)).toBeCloseTo(1, 12);
  });
});

describe('equalizeZf', () => {
  it('divides each subcarrier by its channel gain (Y/H)', () => {
    const Y: Complex[] = [{ re: 2, im: 0 }, { re: 0, im: 4 }];
    const H: Complex[] = [{ re: 2, im: 0 }, { re: 0, im: 2 }];
    const X = equalizeZf(Y, H);
    expect(X[0].re).toBeCloseTo(1, 12);
    expect(X[0].im).toBeCloseTo(0, 12);
    expect(X[1].re).toBeCloseTo(2, 12);
    expect(X[1].im).toBeCloseTo(0, 12);
  });
});

describe('OFDM end-to-end (CP ≥ L−1, no noise) recovers symbols exactly', () => {
  it('modulate → CP → channel → remove CP → demodulate → equalize ≈ input', () => {
    const N = 16;
    const cp = 4;
    const rng = makeRng(7);
    const X: Complex[] = Array.from({ length: N }, () => ({
      re: rng() < 0.5 ? -Math.SQRT1_2 : Math.SQRT1_2,
      im: rng() < 0.5 ? -Math.SQRT1_2 : Math.SQRT1_2,
    }));
    const h: Complex[] = [
      { re: 0.8, im: 0.1 },
      { re: 0.3, im: -0.2 },
      { re: -0.1, im: 0.05 },
    ];
    const x = ofdmModulate(X);
    const s = addCyclicPrefix(x, cp);
    const r = convolveChannel(s, h);
    const body = removeCyclicPrefix(r, cp, N);
    const Y = ofdmDemodulate(body);
    const H = channelFreqResponse(h, N);
    const Xhat = equalizeZf(Y, H);
    expectComplexClose(Xhat, X, 9);
  });
});

describe('exponentialChannelTaps', () => {
  it('returns `numTaps` complex taps with unit total power', () => {
    const h = exponentialChannelTaps(4, 1.5, makeRng(3));
    expect(h).toHaveLength(4);
    const power = h.reduce((s, z) => s + z.re * z.re + z.im * z.im, 0);
    expect(power).toBeCloseTo(1, 9);
  });
  it('is deterministic for a fixed seed', () => {
    const a = exponentialChannelTaps(5, 2, makeRng(42));
    const b = exponentialChannelTaps(5, 2, makeRng(42));
    expect(a).toEqual(b);
  });
  it('decays: the first tap carries more power than the last', () => {
    const h = exponentialChannelTaps(4, 1, makeRng(9));
    const p0 = h[0].re * h[0].re + h[0].im * h[0].im;
    const pLast = h[3].re * h[3].re + h[3].im * h[3].im;
    expect(p0).toBeGreaterThan(pLast);
  });
});
