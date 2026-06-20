import { describe, it, expect } from 'vitest';
import {
  autocorrelation,
  levinsonDurbin,
  lpcAnalyze,
  predictionError,
  lpcSynthesize,
  predictionGainDb,
  impulseTrain,
  whiteNoise,
  estimatePitch,
  lpcSpectrum,
  lpcBitRate,
  synthSpeechFrame,
} from '@/lib/dsp/lpc';

/** Generate a known order-2 AR process x_n = a1 x_{n-1} + a2 x_{n-2} + w_n. */
function arProcess(a1: number, a2: number, N: number, seed = 7): number[] {
  const w = whiteNoise(N, seed);
  const x = new Array<number>(N).fill(0);
  for (let n = 0; n < N; n++) {
    x[n] = w[n] + a1 * (x[n - 1] ?? 0) + a2 * (x[n - 2] ?? 0);
  }
  return x;
}

describe('autocorrelation', () => {
  it('R_0 equals the signal energy and lags decay', () => {
    const x = [1, 2, 3, 4];
    const R = autocorrelation(x, 2);
    expect(R[0]).toBeCloseTo(1 + 4 + 9 + 16, 9);
    expect(R[1]).toBeCloseTo(1 * 2 + 2 * 3 + 3 * 4, 9);
    expect(R[2]).toBeCloseTo(1 * 3 + 2 * 4, 9);
    expect(R).toHaveLength(3);
  });
});

describe('levinsonDurbin', () => {
  it('recovers the coefficients of a known AR(2) process', () => {
    const a1 = 0.7;
    const a2 = -0.2;
    const x = arProcess(a1, a2, 4000);
    const { a, error } = levinsonDurbin(autocorrelation(x, 2), 2);
    expect(a[0]).toBeCloseTo(a1, 1);
    expect(a[1]).toBeCloseTo(a2, 1);
    expect(error).toBeGreaterThan(0);
  });

  it('produces a stable filter (|reflection| < 1) for a real signal', () => {
    const x = arProcess(0.5, 0.3, 2000);
    const { reflection } = levinsonDurbin(autocorrelation(x, 8), 8);
    for (const k of reflection) expect(Math.abs(k)).toBeLessThan(1);
  });

  it('E_min equals R_0 − Σ a_k R_k (Eq. 7.5.11)', () => {
    const x = arProcess(0.6, -0.1, 1500);
    const R = autocorrelation(x, 4);
    const { a, error } = levinsonDurbin(R, 4);
    const expected = R[0] - a.reduce((s, ak, k) => s + ak * R[k + 1], 0);
    expect(error).toBeCloseTo(expected, 4);
  });
});

describe('predictionError / predictionGainDb', () => {
  it('prediction reduces energy on a correlated source (gain > 0 dB)', () => {
    const x = arProcess(0.8, -0.1, 1000);
    const { a } = lpcAnalyze(x, 6);
    const e = predictionError(x, a);
    expect(e).toHaveLength(x.length);
    expect(predictionGainDb(x, e)).toBeGreaterThan(0);
  });
});

describe('lpcSynthesize', () => {
  it('analysis → synthesis with the residual reproduces the original signal', () => {
    const x = arProcess(0.7, -0.25, 600);
    const { a } = lpcAnalyze(x, 4);
    const e = predictionError(x, a);
    // Driving the all-pole filter with the exact residual (gain 1) inverts the
    // analysis filter and reconstructs x.
    const xhat = lpcSynthesize(e, a, 1);
    for (let n = 0; n < x.length; n++) expect(xhat[n]).toBeCloseTo(x[n], 6);
  });
});

describe('impulseTrain / whiteNoise', () => {
  it('impulse train is unit-energy and periodic', () => {
    const w = impulseTrain(100, 25);
    const energy = w.reduce((s, z) => s + z * z, 0);
    expect(energy).toBeCloseTo(1, 9);
    expect(w[0]).toBeGreaterThan(0);
    expect(w[25]).toBeGreaterThan(0);
    expect(w[1]).toBe(0);
  });

  it('white noise is unit-energy and deterministic per seed', () => {
    const a = whiteNoise(256, 42);
    const b = whiteNoise(256, 42);
    expect(a).toEqual(b);
    const energy = a.reduce((s, z) => s + z * z, 0);
    expect(energy).toBeCloseTo(1, 6);
  });
});

describe('estimatePitch', () => {
  it('detects the fundamental of a voiced (impulse-excited) frame', () => {
    const fs = 8000;
    const f0 = 125; // 8000 / 64
    const frame = synthSpeechFrame({
      fs,
      N: 640,
      voiced: true,
      pitchHz: f0,
      formants: [{ freq: 700, bw: 80 }, { freq: 1220, bw: 90 }],
    });
    const est = estimatePitch(frame, fs);
    expect(est.voiced).toBe(true);
    expect(est.pitchHz).toBeCloseTo(f0, -1); // within ~ a few Hz
  });

  it('reports unvoiced for a white-noise frame', () => {
    const frame = whiteNoise(640, 3);
    const est = estimatePitch(frame, 8000, { threshold: 0.5 });
    expect(est.voiced).toBe(false);
    expect(est.pitchHz).toBe(0);
  });
});

describe('lpcSpectrum', () => {
  it('all-pole envelope peaks near the formant frequencies', () => {
    const fs = 8000;
    const formants = [{ freq: 700, bw: 80 }, { freq: 1800, bw: 120 }];
    const frame = synthSpeechFrame({ fs, N: 640, voiced: true, pitchHz: 120, formants });
    const { a, gain } = lpcAnalyze(frame, 10);
    const { freqNorm, magDb } = lpcSpectrum(a, gain, 256);
    // The global maximum of the envelope should sit near the first formant.
    let peakIdx = 0;
    for (let i = 1; i < magDb.length; i++) if (magDb[i] > magDb[peakIdx]) peakIdx = i;
    const peakHz = freqNorm[peakIdx] * fs;
    expect(peakHz).toBeGreaterThan(400);
    expect(peakHz).toBeLessThan(1100);
  });
});

describe('lpcBitRate', () => {
  it('order-10 / 20 ms frame lands near the textbook ~2400 bps figure', () => {
    const { rate, pcmRate, compression } = lpcBitRate(10, 20);
    // (1 + 6 + 5 + 10·10) bits × 50 frames/s = 5600 bps with 10-bit coeffs.
    expect(rate).toBe(5600);
    expect(pcmRate).toBe(64000);
    expect(compression).toBeGreaterThan(1);
  });

  it('8-bit coefficients on a 30 ms frame approach 2400 bps', () => {
    const { rate } = lpcBitRate(10, 30, { coeffBits: 7 });
    // (1 + 6 + 5 + 70) × 33.3 ≈ 2733 bps — the right order of magnitude.
    expect(rate).toBeGreaterThan(2000);
    expect(rate).toBeLessThan(3200);
  });
});
