import { describe, it, expect } from 'vitest';
import {
  sample,
  sincReconstruct,
  aliasFrequency,
  nyquistRate,
  samplingRegime,
} from '@/lib/dsp/sampling';

describe('sample', () => {
  it('produces samples at multiples of Ts across the interval', () => {
    const s = sample([{ freq: 1, amp: 1 }], 4, 0, 1); // Ts = 0.25
    expect(s.Ts).toBeCloseTo(0.25, 12);
    expect(s.times).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(s.values.length).toBe(5);
  });
});

describe('sincReconstruct', () => {
  it('reproduces the sample value exactly at a sampling instant', () => {
    const s = sample([{ freq: 1, amp: 1 }], 4, 0, 1);
    expect(sincReconstruct(s, s.times[2])).toBeCloseTo(s.values[2], 6);
  });
});

describe('aliasFrequency', () => {
  it('returns the input frequency when below Nyquist', () => {
    expect(aliasFrequency(3, 8)).toBeCloseTo(3, 12);
  });
  it('folds frequencies above Nyquist', () => {
    expect(aliasFrequency(5, 8)).toBeCloseTo(3, 12); // |5 - 8|
    expect(aliasFrequency(1, 1.5)).toBeCloseTo(0.5, 12); // |1 - 1.5|
  });
});

describe('nyquistRate', () => {
  it('is twice the bandwidth', () => {
    expect(nyquistRate([{ freq: 3, amp: 1 }, { freq: 7, amp: 1 }])).toBe(14);
  });
});

describe('samplingRegime', () => {
  it('classifies relative to 2W', () => {
    expect(samplingRegime(8, 3)).toBe('oversampling'); // 8 > 6
    expect(samplingRegime(6, 3)).toBe('nyquist'); // == 6
    expect(samplingRegime(4, 3)).toBe('undersampling'); // 4 < 6
  });
});
