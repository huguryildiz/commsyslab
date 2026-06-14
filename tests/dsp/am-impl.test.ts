import { describe, it, expect } from 'vitest';
import { squareWave, bandpassFilterFFT } from '@/lib/dsp/am-impl';

describe('squareWave', () => {
  const fc = 100;
  it('unipolar form averages to ~0.5 and stays within [−0.2, 1.2]', () => {
    const fs = 8000, N = 800;
    const vals: number[] = [];
    for (let n = 0; n < N; n++) vals.push(squareWave(fc, n / fs, 15, false));
    const mean = vals.reduce((s, v) => s + v, 0) / N;
    expect(mean).toBeCloseTo(0.5, 1);
    expect(Math.min(...vals)).toBeGreaterThan(-0.2);
    expect(Math.max(...vals)).toBeLessThan(1.2);
  });
  it('bipolar form averages to ~0 and swings roughly ±1', () => {
    const fs = 8000, N = 800;
    const vals: number[] = [];
    for (let n = 0; n < N; n++) vals.push(squareWave(fc, n / fs, 15, true));
    const mean = vals.reduce((s, v) => s + v, 0) / N;
    expect(Math.abs(mean)).toBeLessThan(0.1);
    expect(Math.max(...vals)).toBeGreaterThan(0.8);
    expect(Math.min(...vals)).toBeLessThan(-0.8);
  });
});

describe('bandpassFilterFFT', () => {
  it('passes an in-band tone and rejects an out-of-band tone', () => {
    const fs = 8000, N = 1024, fIn = 1000, fOut = 200;
    const x: number[] = [];
    for (let n = 0; n < N; n++) x.push(Math.cos((2*Math.PI*fIn*n)/fs) + Math.cos((2*Math.PI*fOut*n)/fs));
    const y = bandpassFilterFFT(x, fs, 600, 1400);
    const power = y.reduce((s, v) => s + v * v, 0) / N;
    expect(power).toBeGreaterThan(0.3);
    expect(power).toBeLessThan(0.7);
  });
});
