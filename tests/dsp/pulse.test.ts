import { describe, it, expect } from 'vitest';
import {
  raisedCosine,
  rootRaisedCosine,
  pulseWaveform,
  raisedCosineSpectrum,
  raisedCosineBandwidth,
  nyquistOffCenterSamples,
} from '@/lib/dsp/pulse';
import { convolve } from '@/lib/dsp/matchedfilter';

describe('raisedCosine', () => {
  it('is normalized to 1 at t=0', () => {
    expect(raisedCosine(0, 0.5, 1)).toBeCloseTo(1, 12);
    expect(raisedCosine(0, 0, 1)).toBeCloseTo(1, 12);
  });
  it('is zero at non-zero integer multiples of T (zero ISI)', () => {
    for (const alpha of [0, 0.25, 0.5, 1]) {
      for (const n of [1, 2, 3]) {
        expect(Math.abs(raisedCosine(n, alpha, 1))).toBeLessThan(1e-9);
      }
    }
  });
  it('reduces to a sinc when alpha = 0', () => {
    expect(raisedCosine(0.5, 0, 1)).toBeCloseTo(2 / Math.PI, 6);
    expect(raisedCosine(1.5, 0, 1)).toBeCloseTo(-2 / (3 * Math.PI), 6);
  });
  it('handles the t = T/(2α) singularity without NaN', () => {
    expect(Number.isFinite(raisedCosine(1, 0.5, 1))).toBe(true);
  });
});

describe('raisedCosineBandwidth', () => {
  it('is the Nyquist bandwidth 1/2T at alpha=0', () => {
    expect(raisedCosineBandwidth(0, 1)).toBeCloseTo(0.5, 12);
    expect(raisedCosineBandwidth(0, 2)).toBeCloseTo(0.25, 12);
  });
  it('is 1/T at alpha=1 (100% excess bandwidth)', () => {
    expect(raisedCosineBandwidth(1, 1)).toBeCloseTo(1, 12);
  });
});

describe('raisedCosineSpectrum', () => {
  it('is 1 (flat) at f=0', () => {
    expect(raisedCosineSpectrum(0, 0.5, 1)).toBeCloseTo(1, 12);
  });
  it('is 0.5 at the Nyquist frequency 1/2T for any alpha (−6 dB point)', () => {
    for (const alpha of [0.1, 0.5, 1]) {
      expect(raisedCosineSpectrum(0.5, alpha, 1)).toBeCloseTo(0.5, 9);
    }
  });
  it('is 0 beyond (1+alpha)/2T', () => {
    expect(raisedCosineSpectrum(0.9, 0.5, 1)).toBeCloseTo(0, 12);
  });
  it('is flat (=1) below (1-alpha)/2T', () => {
    expect(raisedCosineSpectrum(0.2, 0.5, 1)).toBeCloseTo(1, 12);
  });
});

describe('pulseWaveform + nyquistOffCenterSamples', () => {
  it('returns a centered, odd-length sampled pulse with peak 1 at the center', () => {
    const p = pulseWaveform('rc', 0.5, 8, 4);
    expect(p.length).toBe(2 * 4 * 8 + 1);
    expect(p[4 * 8]).toBeCloseTo(1, 12);
  });
  it('has ~zero raised-cosine samples at every off-center symbol instant', () => {
    const p = pulseWaveform('rc', 0.35, 16, 5);
    for (const v of nyquistOffCenterSamples(p, 16)) {
      expect(Math.abs(v)).toBeLessThan(1e-9);
    }
  });
});

describe('rootRaisedCosine (RRC split = RC ⇒ zero ISI, concept C)', () => {
  it('has the known peak value 1 − α + 4α/π at t=0', () => {
    const alpha = 0.5;
    expect(rootRaisedCosine(0, alpha, 1)).toBeCloseTo(1 - alpha + (4 * alpha) / Math.PI, 9);
  });
  it('cascade of two RRC pulses is a Nyquist pulse: off-center symbol samples → ~0', () => {
    const sps = 16;
    const span = 6;
    const g = pulseWaveform('rrc', 0.5, sps, span);
    const casc = convolve(g, g);
    const mid = (casc.length - 1) / 2;
    const peak = casc[mid];
    for (const k of [1, 2, 3]) {
      const off = casc[mid + k * sps];
      expect(Math.abs(off / peak)).toBeLessThan(0.03);
    }
  });
});
