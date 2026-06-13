import { describe, it, expect } from 'vitest';
import {
  exponentialPdp,
  rmsDelaySpread,
  coherenceBandwidth,
  coherenceTime,
  channelFreqResponse,
  rayleighPdf,
  ricianPdf,
  envelopeSeries,
  type Tap,
} from '@/lib/dsp/fading';
import { makeRng } from '@/lib/dsp/random';

describe('exponentialPdp', () => {
  it('returns nTaps taps with unit total power and exponential decay', () => {
    const taps = exponentialPdp(4, 1.0, 1e-6); // nTaps, tauRms (us), tapSpacing (s)
    expect(taps).toHaveLength(4);
    const total = taps.reduce((s, t) => s + t.power, 0);
    expect(total).toBeCloseTo(1, 10); // normalized to unit power
    expect(taps[0].power).toBeGreaterThan(taps[3].power); // decaying
    expect(taps[0].delay).toBe(0);
  });
});

describe('rmsDelaySpread', () => {
  it('is zero for a single tap', () => {
    const taps: Tap[] = [{ delay: 0, power: 1 }];
    expect(rmsDelaySpread(taps)).toBeCloseTo(0, 12);
  });
  it('matches the std of a two-equal-tap profile', () => {
    const taps: Tap[] = [
      { delay: 0, power: 1 },
      { delay: 2e-6, power: 1 },
    ];
    // mean delay = 1us; spread = 1us
    expect(rmsDelaySpread(taps)).toBeCloseTo(1e-6, 12);
  });
});

describe('coherenceBandwidth / coherenceTime', () => {
  it('coherence bandwidth is inversely proportional to delay spread', () => {
    expect(coherenceBandwidth(1e-6)).toBeCloseTo(1 / (2 * Math.PI * 1e-6), 6);
    expect(coherenceBandwidth(2e-6)).toBeLessThan(coherenceBandwidth(1e-6));
  });
  it('coherence time is inversely proportional to Doppler', () => {
    expect(coherenceTime(100)).toBeCloseTo(1 / (2 * Math.PI * 100), 9);
    expect(coherenceTime(200)).toBeLessThan(coherenceTime(100));
  });
});

describe('channelFreqResponse', () => {
  it('a single tap gives a flat (constant) magnitude response', () => {
    const taps: Tap[] = [{ delay: 0, power: 1 }];
    const freqs = [-1e6, 0, 1e6];
    const mag = channelFreqResponse(taps, freqs, makeRng(1));
    expect(mag[0]).toBeCloseTo(mag[1], 10);
    expect(mag[1]).toBeCloseTo(mag[2], 10);
  });
  it('multiple taps produce frequency-selective notches (non-constant magnitude)', () => {
    const taps = exponentialPdp(5, 1e-6, 0.5e-6);
    const freqs = Array.from({ length: 256 }, (_, i) => (i - 128) * 1e4);
    const mag = channelFreqResponse(taps, freqs, makeRng(7));
    const max = Math.max(...mag);
    const min = Math.min(...mag);
    expect(max - min).toBeGreaterThan(0.1); // selective, not flat
  });
});

describe('rayleighPdf', () => {
  it('integrates to ~1 over a wide range', () => {
    const sigma = 1;
    let area = 0;
    const dr = 0.01;
    for (let r = 0; r < 12; r += dr) area += rayleighPdf(r, sigma) * dr;
    expect(area).toBeCloseTo(1, 2);
  });
  it('peaks at r = sigma', () => {
    const sigma = 1;
    expect(rayleighPdf(1, sigma)).toBeGreaterThan(rayleighPdf(0.5, sigma));
    expect(rayleighPdf(1, sigma)).toBeGreaterThan(rayleighPdf(1.5, sigma));
  });
});

describe('ricianPdf', () => {
  it('reduces to Rayleigh when K = 0 (s = 0)', () => {
    const sigma = 1;
    for (const r of [0.5, 1, 2]) {
      expect(ricianPdf(r, sigma, 0)).toBeCloseTo(rayleighPdf(r, sigma), 9);
    }
  });
});

describe('envelopeSeries', () => {
  it('is deterministic for a fixed seed', () => {
    const a = envelopeSeries({ fD: 100, K: 0, nSamples: 64, fs: 1000 }, makeRng(3));
    const b = envelopeSeries({ fD: 100, K: 0, nSamples: 64, fs: 1000 }, makeRng(3));
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(a).toHaveLength(64);
  });
  it('fD → 0 yields a (near) constant envelope', () => {
    const e = envelopeSeries({ fD: 0, K: 0, nSamples: 64, fs: 1000 }, makeRng(5));
    const max = Math.max(...e);
    const min = Math.min(...e);
    expect(max - min).toBeLessThan(1e-9);
  });
});
