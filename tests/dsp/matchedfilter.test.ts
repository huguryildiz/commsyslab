import { describe, it, expect } from 'vitest';
import {
  convolve,
  matchedFilter,
  matchedFilterOutput,
  correlate,
  pulseEnergy,
  peakSnr,
} from '@/lib/dsp/matchedfilter';

describe('convolve', () => {
  it('does full linear convolution', () => {
    expect(convolve([1, 2], [1, 1])).toEqual([1, 3, 2]);
  });
});

describe('matchedFilter', () => {
  it('time-reverses the pulse: h[n]=p[N-1-n]', () => {
    expect(matchedFilter([1, 2, 3])).toEqual([3, 2, 1]);
  });
});

describe('matchedFilterOutput', () => {
  it('peaks at the center sample with value E for p ⋆ matched(p)', () => {
    const p = [1, 1, 1];
    const out = matchedFilterOutput(p, p);
    const peak = Math.max(...out);
    expect(peak).toBeCloseTo(pulseEnergy(p), 12);
    expect(out[(out.length - 1) / 2]).toBeCloseTo(3, 12);
  });
});

describe('correlate ≡ matched filter at t=T (correlation receiver equivalence)', () => {
  it('correlate(r,p) equals the matched-filter output sampled when fully overlapped', () => {
    const p = [0.4, 0.8, -0.2, 0.6];
    const r = [0.5, 0.7, -0.1, 0.9];
    const mf = matchedFilterOutput(r, p);
    expect(correlate(r, p)).toBeCloseTo(mf[p.length - 1], 12);
  });
});

describe('pulseEnergy & peakSnr', () => {
  it('energy is the sum of squares', () => {
    expect(pulseEnergy([1, 1, 1])).toBeCloseTo(3, 12);
  });
  it('peak SNR is 2E/N0', () => {
    expect(peakSnr(3, 2)).toBeCloseTo(3, 12);
  });
});
