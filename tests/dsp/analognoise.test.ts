import { describe, it, expect } from 'vitest';
import {
  outputSnrDb,
  demodulationGainDb,
  fmThresholdCnrDb,
  addNoiseAtSnr,
  measuredSnrDb,
  DEEMPHASIS_F1_DEFAULT,
  lowpassMA,
  coherentDemod,
  quadratureNoise,
  angleNoisePsd,
} from '@/lib/dsp/analognoise';
import { emphasisSnrGainDb } from '@/lib/dsp/analog';
import { makeRng } from '@/lib/dsp/random';

const p = { amIndex: 0.5, beta: 5, messagePower: 0.5, emphasis: false, W: 15000 };

describe('outputSnrDb / demodulationGainDb', () => {
  it('DSB and SSB have unity gain (output SNR == channel SNR)', () => {
    expect(outputSnrDb('dsb', 20, p)).toBeCloseTo(20, 6);
    expect(outputSnrDb('ssb', 20, p)).toBeCloseTo(20, 6);
    expect(demodulationGainDb('dsb', p)).toBeCloseTo(0, 6);
    expect(demodulationGainDb('ssb', p)).toBeCloseTo(0, 6);
  });

  it('conventional AM loses SNR (gain < 0 dB) via modulation efficiency', () => {
    expect(demodulationGainDb('am', p)).toBeLessThan(0);
    // gain equals 10log10(efficiency); efficiency = a^2 P /(1 + a^2 P)
    const eff = (p.amIndex ** 2 * p.messagePower) / (1 + p.amIndex ** 2 * p.messagePower);
    expect(demodulationGainDb('am', p)).toBeCloseTo(10 * Math.log10(eff), 6);
  });

  it('FM output SNR scales as beta^2 (~+6 dB per doubling of beta)', () => {
    const a = outputSnrDb('fm', 30, { ...p, beta: 4 });
    const b = outputSnrDb('fm', 30, { ...p, beta: 8 });
    expect(b - a).toBeCloseTo(6.02, 1); // doubling beta → 4x SNR → +6.02 dB
  });

  it('FM gives a large positive demodulation gain at high beta', () => {
    expect(demodulationGainDb('fm', { ...p, beta: 5 })).toBeGreaterThan(10);
  });
});

describe('PM output SNR', () => {
  it('PM gain is beta^2 * P_Mn (no factor of 3)', () => {
    const gain = demodulationGainDb('pm', { ...p, beta: 5 });
    expect(gain).toBeCloseTo(10 * Math.log10(5 ** 2 * 0.5), 6);
  });

  it('FM is 3x PM (≈ +4.77 dB) at equal beta', () => {
    const fm = demodulationGainDb('fm', { ...p, beta: 5 });
    const pm = demodulationGainDb('pm', { ...p, beta: 5 });
    expect(fm - pm).toBeCloseTo(10 * Math.log10(3), 6);
  });
});

describe('FM threshold & emphasis (book formula)', () => {
  it('threshold CNR increases with beta (more bandwidth → higher threshold)', () => {
    expect(fmThresholdCnrDb(10)).toBeGreaterThan(fmThresholdCnrDb(2));
  });

  it('threshold = 10log10(20(beta+1))', () => {
    expect(fmThresholdCnrDb(5)).toBeCloseTo(10 * Math.log10(20 * 6), 6);
  });

  it('emphasis adds the analog.ts Eq. 6.2.42 gain to FM (independent of beta)', () => {
    const W = 15000;
    const expected = emphasisSnrGainDb(DEEMPHASIS_F1_DEFAULT, W);
    const withE = demodulationGainDb('fm', { ...p, W, emphasis: true });
    const without = demodulationGainDb('fm', { ...p, W, emphasis: false });
    expect(withE - without).toBeCloseTo(expected, 6);
  });

  it('default de-emphasis corner ≈ 2122 Hz (τ = 75 µs)', () => {
    expect(DEEMPHASIS_F1_DEFAULT).toBeCloseTo(1 / (2 * Math.PI * 75e-6), 6);
  });
});

describe('addNoiseAtSnr / measuredSnrDb', () => {
  const ref = Float64Array.from({ length: 4096 }, (_, n) => Math.sin((2 * Math.PI * 5 * n) / 256));

  it('measuredSnrDb of an identical signal is very high', () => {
    expect(measuredSnrDb(ref, ref)).toBeGreaterThan(100);
  });

  it('addNoiseAtSnr produces a signal whose measured SNR ~ target', () => {
    const rng = makeRng(7);
    const noisy = addNoiseAtSnr(ref, 10, rng);
    expect(noisy.length).toBe(ref.length);
    expect(measuredSnrDb(noisy, ref)).toBeCloseTo(10, 0); // within ~1 dB at this length
  });

  it('higher target SNR yields higher measured SNR', () => {
    const rng = makeRng(3);
    expect(measuredSnrDb(addNoiseAtSnr(ref, 20, rng), ref)).toBeGreaterThan(
      measuredSnrDb(addNoiseAtSnr(ref, 5, rng), ref),
    );
  });
});

describe('signal-chain helpers', () => {
  it('lowpassMA smooths and preserves length & DC', () => {
    const x = [0, 2, 0, 2, 0, 2, 0, 2];
    const y = lowpassMA(x, 4);
    expect(y.length).toBe(x.length);
    expect(y[5]).toBeCloseTo(1, 1); // averages toward the mean 1
  });

  it('coherentDemod recovers the baseband message from A·m·cos', () => {
    const fs = 2000,
      fc = 200,
      fm = 5;
    const rx = Array.from({ length: 1024 }, (_, i) => {
      const time = i / fs;
      return Math.cos(2 * Math.PI * fm * time) * Math.cos(2 * Math.PI * fc * time);
    });
    const y = coherentDemod(rx, fc, fs, 32);
    expect(Math.abs(y[512])).toBeLessThanOrEqual(1.2); // ~cos(2π fm t), bounded by ~1
    expect(Math.max(...y.slice(100, 900))).toBeGreaterThan(0.6); // recovers amplitude ~1
  });

  it('quadratureNoise returns two equal-length zero-mean sequences', () => {
    const { nc, ns } = quadratureNoise(2048, 1, makeRng(11));
    expect(nc.length).toBe(2048);
    expect(ns.length).toBe(2048);
    const mean = nc.reduce((a, b) => a + b, 0) / nc.length;
    expect(Math.abs(mean)).toBeLessThan(0.1);
  });
});

describe('angleNoisePsd', () => {
  it('PM PSD is flat = N0/Ac^2', () => {
    const psd = angleNoisePsd([1, 100, 1000], 'pm', 2, 1e-3);
    expect(psd[0]).toBeCloseTo(1e-3 / 4, 12);
    expect(psd[2]).toBeCloseTo(psd[0], 12);
  });

  it('FM PSD is parabolic = N0 f^2/Ac^2', () => {
    const psd = angleNoisePsd([10, 20], 'fm', 2, 1e-3);
    expect(psd[1] / psd[0]).toBeCloseTo(4, 6); // doubling f → 4× PSD
  });
});
