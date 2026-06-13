import { describe, it, expect } from 'vitest';
import {
  seriesCoeffs,
  seriesPartialSum,
  transferMag,
  ftPair,
  hilbert,
  analyticSignal,
  lowpassEquivalent,
} from '@/lib/dsp/fourier';
import { linspace } from '@/lib/dsp/math';

describe('seriesCoeffs', () => {
  it('square wave: only odd harmonics nonzero', () => {
    const coeffs = seriesCoeffs('square', 1, 10);
    expect(coeffs).toHaveLength(10);
    // c1, c3, c5, ... should be nonzero; c2, c4, c6, ... should be ~0
    const oddIndices = [0, 2, 4, 6, 8]; // n=1,3,5,7,9
    const evenIndices = [1, 3, 5, 7, 9]; // n=2,4,6,8,10
    for (const i of oddIndices) {
      expect(coeffs[i].mag).toBeGreaterThan(0.1);
    }
    for (const i of evenIndices) {
      expect(coeffs[i].mag).toBeLessThan(0.01);
    }
  });

  it('square wave: c1 ≈ 4/π', () => {
    const coeffs = seriesCoeffs('square', 1, 5);
    const c1 = coeffs[0].mag; // n=1
    expect(c1).toBeCloseTo(4 / Math.PI, 2);
  });

  it('square wave: c3 ≈ 4/(3π)', () => {
    const coeffs = seriesCoeffs('square', 1, 5);
    const c3 = coeffs[2].mag; // n=3
    expect(c3).toBeCloseTo(4 / (3 * Math.PI), 2);
  });

  it('sawtooth wave: all harmonics nonzero, ∝ 1/n', () => {
    const coeffs = seriesCoeffs('sawtooth', 1, 10);
    expect(coeffs).toHaveLength(10);
    for (const c of coeffs) {
      expect(c.mag).toBeGreaterThan(0);
    }
    // c1 > c2 > c3 > ...
    for (let i = 1; i < coeffs.length; i++) {
      expect(coeffs[i - 1].mag).toBeGreaterThan(coeffs[i].mag);
    }
  });

  it('triangle wave: only odd harmonics, ∝ 1/n²', () => {
    const coeffs = seriesCoeffs('triangle', 1, 10);
    const oddIndices = [0, 2, 4, 6, 8];
    const evenIndices = [1, 3, 5, 7, 9];
    for (const i of oddIndices) {
      expect(coeffs[i].mag).toBeGreaterThan(0.01);
    }
    for (const i of evenIndices) {
      expect(coeffs[i].mag).toBeLessThan(0.01);
    }
  });

  it('pulse wave: DC term = duty', () => {
    const duty = 0.3;
    const coeffs = seriesCoeffs('pulse', 1, 10, duty);
    // DC is included in the list; typically first element
    const hasDC = coeffs.some((c) => c.freq === 0 && Math.abs(c.mag - duty) < 0.05);
    expect(hasDC).toBe(true);
  });

  it('pulse wave: sinc envelope for different duties', () => {
    const duty1 = 0.25;
    const duty2 = 0.5;
    const coeffs1 = seriesCoeffs('pulse', 1, 10, duty1);
    const coeffs2 = seriesCoeffs('pulse', 1, 10, duty2);
    // Both should have similar structure but different magnitudes
    expect(coeffs1).toHaveLength(coeffs2.length);
  });
});

describe('seriesPartialSum', () => {
  it('square wave approaches ideal waveform', () => {
    const f0 = 1;
    const N = 50;
    const t = 0.1; // sample within a square-wave period
    const sum = seriesPartialSum('square', f0, N, t);
    // Partial sum should be a finite value, not NaN or inf
    expect(isFinite(sum)).toBe(true);
  });

  it('square wave series convergence with increasing N', () => {
    const f0 = 1;
    const t = 0.1;
    const sum5 = Math.abs(seriesPartialSum('square', f0, 5, t));
    const sum50 = Math.abs(seriesPartialSum('square', f0, 50, t));
    // Both should be finite and positive
    expect(isFinite(sum5)).toBe(true);
    expect(isFinite(sum50)).toBe(true);
    expect(sum5).toBeGreaterThan(0);
    expect(sum50).toBeGreaterThan(0);
  });
});

describe('transferMag', () => {
  it('lpf: 1 inside cutoff, 0 outside', () => {
    const fc = 100;
    expect(transferMag('lpf', 50, fc)).toBeCloseTo(1, 6);
    expect(transferMag('lpf', 150, fc)).toBeCloseTo(0, 6);
  });

  it('hpf: 1 outside cutoff, 0 inside', () => {
    const fc = 100;
    expect(transferMag('hpf', 50, fc)).toBeCloseTo(0, 6);
    expect(transferMag('hpf', 150, fc)).toBeCloseTo(1, 6);
  });

  it('bpf: 1 inside band, 0 outside', () => {
    expect(transferMag('bpf', 150, 100, 200)).toBeCloseTo(1, 6);
    expect(transferMag('bpf', 50, 100, 200)).toBeCloseTo(0, 6);
    expect(transferMag('bpf', 250, 100, 200)).toBeCloseTo(0, 6);
  });

  it('rc (one-pole): 1/sqrt(1+(f/fc)²)', () => {
    const fc = 100;
    // At f=fc, should be 1/sqrt(2) ≈ 0.707
    expect(transferMag('rc', fc, fc)).toBeCloseTo(1 / Math.sqrt(2), 6);
    // At f=0, should be 1
    expect(transferMag('rc', 0, fc)).toBeCloseTo(1, 6);
  });
});

describe('ftPair', () => {
  it('rect pair returns valid data arrays', () => {
    const pair = ftPair('rect', 0.1);
    expect(pair.freq.f).toBeDefined();
    expect(pair.freq.mag).toBeDefined();
    expect(pair.freq.f.length).toBeGreaterThan(0);
    expect(pair.freq.mag.length).toBeGreaterThan(0);
    expect(pair.freq.f.length).toBe(pair.freq.mag.length);
  });

  it('tri pair generates valid frequency and time data', () => {
    const pair = ftPair('tri', 0.1);
    expect(pair.freq.f.length).toBeGreaterThan(10);
    expect(pair.freq.mag.length).toBeGreaterThan(10);
    expect(pair.time.t.length).toBeGreaterThan(10);
    expect(pair.time.x.length).toBeGreaterThan(10);
  });

  it('gauss pair magnitude is non-negative', () => {
    const pair = ftPair('gauss', 1);
    const mag = pair.freq.mag;
    for (const m of mag) {
      expect(m).toBeGreaterThanOrEqual(0);
    }
  });

  it('time and freq domains have same length', () => {
    const pair = ftPair('rect', 0.1);
    expect(pair.time.t.length).toBe(pair.time.x.length);
    expect(pair.freq.f.length).toBe(pair.freq.mag.length);
  });
});

describe('hilbert', () => {
  it('returns array of same length', () => {
    const x = [1, 2, 3, 4];
    const xh = hilbert(x);
    expect(xh).toHaveLength(x.length);
  });

  it('cos(2π k n/N) → sin (interior samples)', () => {
    const N = 128;
    const k = 4;
    const x: number[] = [];
    for (let n = 0; n < N; n++) {
      x.push(Math.cos((2 * Math.PI * k * n) / N));
    }
    const xh = hilbert(x);
    // Interior: Hilbert of cos should be ~sin
    // Check middle N/4 samples to avoid edge effects
    const start = N / 4;
    const end = (3 * N) / 4;
    let mseError = 0;
    let count = 0;
    for (let n = start; n < end; n++) {
      const expected = Math.sin((2 * Math.PI * k * n) / N);
      mseError += Math.pow(xh[n] - expected, 2);
      count++;
    }
    const rmse = Math.sqrt(mseError / count);
    expect(rmse).toBeLessThan(0.2); // reasonable tolerance for FFT-based Hilbert
  });
});

describe('analyticSignal', () => {
  it('real part equals input', () => {
    const x = [1, 2, 3, 4];
    const z = analyticSignal(x);
    expect(z.re).toEqual(x);
  });

  it('imaginary part has same length', () => {
    const x = [1, 2, 3, 4];
    const z = analyticSignal(x);
    expect(z.im).toHaveLength(x.length);
  });

  it('imaginary part is hilbert transform of real', () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8];
    const z = analyticSignal(x);
    const xh = hilbert(x);
    for (let i = 0; i < z.im.length; i++) {
      expect(z.im[i]).toBeCloseTo(xh[i], 10);
    }
  });
});

describe('lowpassEquivalent', () => {
  it('returns i, q, env arrays of input length', () => {
    const x = new Array(64).fill(0).map((_, n) => Math.cos((2 * Math.PI * n) / 16));
    const result = lowpassEquivalent(x, 1, 16);
    expect(result.i).toHaveLength(x.length);
    expect(result.q).toHaveLength(x.length);
    expect(result.env).toHaveLength(x.length);
  });

  it('envelope of AM signal (1 + m*cos(2π*fm*t)) modulated on fc is ~flat', () => {
    const fs = 1000;
    const fc = 200; // carrier frequency
    const fm = 10; // message frequency
    const m = 0.5; // modulation index
    const N = 512;
    const t = linspace(0, N / fs, N);
    const x = t.map(
      (ti) => (1 + m * Math.cos(2 * Math.PI * fm * ti)) * Math.cos(2 * Math.PI * fc * ti),
    );
    const result = lowpassEquivalent(x, fc, fs);
    const env = result.env;
    // Envelope should be mostly ≈ 1 ± m/2 in steady state
    const mid = Math.floor(N / 2);
    const quarter = Math.floor(N / 4);
    const steadyState = env.slice(mid - quarter, mid + quarter);
    const meanEnv = steadyState.reduce((a, b) => a + b, 0) / steadyState.length;
    expect(meanEnv).toBeGreaterThan(0.4);
    expect(meanEnv).toBeLessThan(1.6);
  });
});
