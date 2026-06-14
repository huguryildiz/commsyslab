import { describe, it, expect } from 'vitest';
import { squareWave, bandpassFilterFFT } from '@/lib/dsp/am-impl';
import { powerLawModulator, switchingModulator, balancedModulator, ringModulator } from '@/lib/dsp/am-impl';

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
    // In-band 1000 Hz tone preserved: power ≈ 0.5 (amplitude 1).
    const power = y.reduce((s, v) => s + v * v, 0) / N;
    expect(power).toBeGreaterThan(0.4);
    expect(power).toBeLessThan(0.6);
    // Out-of-band 200 Hz tone independently rejected to near zero.
    const outOnly = Array.from({ length: N }, (_, n) => Math.cos((2 * Math.PI * fOut * n) / fs));
    const yOut = bandpassFilterFFT(outOnly, fs, 600, 1400);
    const outPower = yOut.reduce((s, v) => s + v * v, 0) / N;
    expect(outPower).toBeLessThan(0.01);
  });
});

const FS = 160_000, FC = 20_000, FM = 1_000;
function timeAxis(n: number): number[] { return Array.from({ length: n }, (_, i) => i / FS); }
function carrierLevel(sig: number[], fs: number, fc: number): number {
  let re = 0, im = 0;
  for (let n = 0; n < sig.length; n++) {
    re += sig[n] * Math.cos((2 * Math.PI * fc * n) / fs);
    im += sig[n] * Math.sin((2 * Math.PI * fc * n) / fs);
  }
  return (2 * Math.hypot(re, im)) / sig.length;
}

describe('modulator chains', () => {
  const msg = [{ freq: FM, amp: 1 }];
  const t = timeAxis(2048);
  it('powerLawModulator BPF output contains a carrier (conventional AM)', () => {
    expect(carrierLevel(powerLawModulator(msg, FC, 1, 1, 0.3, t).uBpf, FS, FC)).toBeGreaterThan(0.1);
  });
  it('switchingModulator BPF output contains a carrier (conventional AM)', () => {
    expect(carrierLevel(switchingModulator(msg, FC, 1, t, 15).uBpf, FS, FC)).toBeGreaterThan(0.1);
  });
  it('balancedModulator cancels the carrier (DSB-SC output)', () => {
    expect(carrierLevel(balancedModulator(msg, FC, 1, t).uOut, FS, FC)).toBeLessThan(0.05);
  });
  it('ringModulator BPF output is DSB-SC (carrier suppressed)', () => {
    expect(carrierLevel(ringModulator(msg, FC, t, 15).uBpf, FS, FC)).toBeLessThan(0.05);
  });
});

import { envelopeDetect } from '@/lib/dsp/am-impl';

describe('envelopeDetect', () => {
  it('tracks the envelope of a conventional-AM signal when RC is well chosen', () => {
    const fs = 200_000, fc = 20_000, fm = 1_000, a = 0.5, N = 4096;
    const u: number[] = [], env: number[] = [];
    for (let n = 0; n < N; n++) {
      const tt = n / fs;
      const e = 1 + a * Math.cos(2 * Math.PI * fm * tt);
      env.push(e);
      u.push(e * Math.cos(2 * Math.PI * fc * tt));
    }
    const rc = 1 / Math.sqrt(fc * fm);
    const out = envelopeDetect(u, fs, rc);
    let err = 0, ref = 0;
    for (let n = N / 2; n < N; n++) { err += (out[n] - env[n]) ** 2; ref += env[n] ** 2; }
    expect(Math.sqrt(err / ref)).toBeLessThan(0.2);
  });
});

import { fdmCompose, fdmSeparate } from '@/lib/dsp/am-impl';

describe('FDM', () => {
  const FS2 = 200_000;
  const t2 = Array.from({ length: 4096 }, (_, i) => i / FS2);
  const W = 3000;
  const msgs = [[{ freq: 1000, amp: 1 }], [{ freq: 1500, amp: 1 }], [{ freq: 2000, amp: 1 }]];
  const carriers = [20_000, 40_000, 60_000];

  it('separates each channel back to its own message frequency', () => {
    const { composite } = fdmCompose(msgs, carriers, t2);
    for (let ch = 0; ch < carriers.length; ch++) {
      const rec = fdmSeparate(composite, FS2, carriers[ch], W, t2);
      const fm = msgs[ch][0].freq;
      const corr = rec.reduce((s, v, i) => s + v * Math.cos(2 * Math.PI * fm * t2[i]), 0);
      const cross = rec.reduce(
        (s, v, i) => s + v * Math.cos(2 * Math.PI * msgs[(ch + 1) % 3][0].freq * t2[i]),
        0,
      );
      expect(Math.abs(corr)).toBeGreaterThan(Math.abs(cross) * 3);
    }
  });
});

