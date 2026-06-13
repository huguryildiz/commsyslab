import { describe, it, expect } from 'vitest';
import {
  evalSignal,
  signalBandwidth,
  signalPeak,
  signalPower,
  PRESETS,
} from '@/lib/dsp/signals';

describe('evalSignal', () => {
  it('single cosine at t=0 equals its amplitude', () => {
    expect(evalSignal([{ freq: 1, amp: 2 }], 0)).toBeCloseTo(2, 12);
  });
  it('cosine is zero at a quarter period', () => {
    expect(evalSignal([{ freq: 1, amp: 1 }], 0.25)).toBeCloseTo(0, 12);
  });
  it('sums components', () => {
    expect(evalSignal([{ freq: 1, amp: 1 }, { freq: 2, amp: 3 }], 0)).toBeCloseTo(4, 12);
  });
});

describe('signalBandwidth', () => {
  it('is the maximum component frequency', () => {
    expect(signalBandwidth([{ freq: 3, amp: 1 }, { freq: 7, amp: 1 }])).toBe(7);
  });
});

describe('signalPeak', () => {
  it('is the sum of absolute amplitudes', () => {
    expect(signalPeak([{ freq: 1, amp: 2 }, { freq: 2, amp: 3 }])).toBe(5);
  });
});

describe('signalPower', () => {
  it('is sum of amp^2/2 for cosines', () => {
    expect(signalPower([{ freq: 1, amp: 2 }])).toBeCloseTo(2, 12); // 4/2
    expect(signalPower([{ freq: 1, amp: 5 }])).toBeCloseTo(12.5, 12); // 25/2
  });
});

describe('PRESETS', () => {
  it('provides named tone sets', () => {
    expect(Array.isArray(PRESETS.singleTone)).toBe(true);
    expect(PRESETS.singleTone.length).toBeGreaterThan(0);
  });
});
