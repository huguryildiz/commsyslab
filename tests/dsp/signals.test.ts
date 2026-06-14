import { describe, it, expect } from 'vitest';
import {
  evalSignal,
  signalBandwidth,
  signalPeak,
  signalPower,
  periodicWave,
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
    expect(
      evalSignal(
        [
          { freq: 1, amp: 1 },
          { freq: 2, amp: 3 },
        ],
        0,
      ),
    ).toBeCloseTo(4, 12);
  });
});

describe('signalBandwidth', () => {
  it('is the maximum component frequency', () => {
    expect(
      signalBandwidth([
        { freq: 3, amp: 1 },
        { freq: 7, amp: 1 },
      ]),
    ).toBe(7);
  });
});

describe('signalPeak', () => {
  it('is the sum of absolute amplitudes', () => {
    expect(
      signalPeak([
        { freq: 1, amp: 2 },
        { freq: 2, amp: 3 },
      ]),
    ).toBe(5);
  });
});

describe('signalPower', () => {
  it('is sum of amp^2/2 for cosines', () => {
    expect(signalPower([{ freq: 1, amp: 2 }])).toBeCloseTo(2, 12); // 4/2
    expect(signalPower([{ freq: 1, amp: 5 }])).toBeCloseTo(12.5, 12); // 25/2
  });
});

describe('periodicWave', () => {
  const f0 = 1; // period = 1 s

  it('square is +1 in the first half-period and -1 in the second', () => {
    expect(periodicWave('square', f0, 0.1)).toBeCloseTo(1, 12);
    expect(periodicWave('square', f0, 0.6)).toBeCloseTo(-1, 12);
  });

  it('square is periodic', () => {
    expect(periodicWave('square', f0, 1.1)).toBeCloseTo(periodicWave('square', f0, 0.1), 12);
  });

  it('sawtooth is 0 at t=0, rises to 1 at T₀/2, then jumps to -1 — matches (2/π) Σ (-1)^{n+1}/n sin', () => {
    expect(periodicWave('sawtooth', f0, 0)).toBeCloseTo(0, 6);
    expect(periodicWave('sawtooth', f0, 0.25)).toBeCloseTo(0.5, 6);
    expect(periodicWave('sawtooth', f0, 0.5)).toBeCloseTo(-1, 6); // ph=0.5 is the post-jump side
    expect(periodicWave('sawtooth', f0, 0.75)).toBeCloseTo(-0.5, 6);
  });

  it('triangle is +1 at t=0, -1 at T₀/2, 0 at T₀/4 — matches (8/π²) Σ_{odd} cos/n²', () => {
    expect(periodicWave('triangle', f0, 0)).toBeCloseTo(1, 6);
    expect(periodicWave('triangle', f0, 0.25)).toBeCloseTo(0, 6);
    expect(periodicWave('triangle', f0, 0.5)).toBeCloseTo(-1, 6);
    expect(periodicWave('triangle', f0, 0.75)).toBeCloseTo(0, 6);
  });

  it('pulse respects its duty cycle', () => {
    expect(periodicWave('pulse', f0, 0.1, 0.25)).toBeCloseTo(1, 12); // within duty
    expect(periodicWave('pulse', f0, 0.5, 0.25)).toBeCloseTo(0, 12); // outside duty
  });
});

describe('PRESETS', () => {
  it('provides named tone sets', () => {
    expect(Array.isArray(PRESETS.singleTone)).toBe(true);
    expect(PRESETS.singleTone.length).toBeGreaterThan(0);
  });
});
