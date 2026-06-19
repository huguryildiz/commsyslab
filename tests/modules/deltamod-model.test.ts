import { describe, it, expect } from 'vitest';
import {
  buildDeltaModView,
  type DeltaModParams,
} from '@/modules/sampling-quantization/sections/waveform/deltamod-model';

const base: DeltaModParams = {
  toneFreq: 2,
  toneAmp: 1,
  fs: 40,
  step: 0.1,
  t0: 0,
  windowSec: 1,
  analogN: 200,
};

describe('buildDeltaModView', () => {
  it('produces a dense analog curve and one-per-sample windowed arrays', () => {
    const v = buildDeltaModView(base);
    expect(v.analog.t).toHaveLength(200);
    expect(v.analog.x).toHaveLength(200);
    expect(v.sampleTimes).toHaveLength(41); // n = 0..floor(1 / (1/40)) = 0..40
    expect(v.sampleValues).toHaveLength(v.sampleTimes.length);
    expect(v.staircase).toHaveLength(v.sampleTimes.length);
    expect(v.bits).toHaveLength(v.sampleTimes.length);
    expect(v.error).toHaveLength(v.sampleTimes.length);
    expect(v.overload).toHaveLength(v.sampleTimes.length);
  });

  it('computes the slope-overload limit and the analog peak slope (2*pi*f*A)', () => {
    const v = buildDeltaModView(base);
    expect(v.slopeLimit).toBeCloseTo(0.1 * 40, 12); // 4
    expect(v.maxSignalSlope).toBeCloseTo(2 * Math.PI * 2 * 1, 9); // ~12.566
    expect(v.overloading).toBe(true); // 12.566 > 4
  });

  it('clears the overloading flag when the step is large enough to track the signal', () => {
    const v = buildDeltaModView({ ...base, step: 0.5 }); // limit 20 > 12.566
    expect(v.overloading).toBe(false);
  });

  it('keeps the staircase continuous across a scrolled window', () => {
    const full = buildDeltaModView({ ...base, t0: 0, windowSec: 1.5 });
    const scrolled = buildDeltaModView({ ...base, t0: 0.5, windowSec: 1.0 });
    const Ts = 1 / base.fs;
    const nStart = Math.ceil(0.5 / Ts); // 20
    expect(scrolled.staircase[0]).toBeCloseTo(full.staircase[nStart], 9);
    expect(scrolled.sampleValues[0]).toBeCloseTo(full.sampleValues[nStart], 9);
  });

  it('reports a finite SNR in dB', () => {
    const v = buildDeltaModView(base);
    expect(Number.isFinite(v.snrDb)).toBe(true);
  });
});
