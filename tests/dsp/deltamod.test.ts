import { describe, it, expect } from 'vitest';
import {
  deltaModulate,
  deltaDemodulate,
  slopeOverloadLimit,
  adaptiveDeltaModulate,
  adaptiveDeltaDemodulate,
} from '@/lib/dsp/deltamod';

describe('deltaModulate', () => {
  it('steps up on rising input, down on falling (x0=0, step=0.5)', () => {
    const r = deltaModulate([0.4, 0.9, 0.3], 0.5, 0);
    expect(r.bits).toEqual([1, 1, 0]);
    expect(r.staircase).toEqual([0.5, 1.0, 0.5]);
  });
  it('produces 1010 granular hunting on a flat (zero) input', () => {
    const r = deltaModulate([0, 0, 0, 0], 0.5, 0);
    expect(r.bits).toEqual([1, 0, 1, 0]);
    expect(r.staircase).toEqual([0.5, 0, 0.5, 0]);
  });
  it('emits exactly one bit and one staircase value per input sample', () => {
    const r = deltaModulate([0.1, 0.2, 0.3, 0.2, 0.1], 0.25, 0);
    expect(r.bits).toHaveLength(5);
    expect(r.staircase).toHaveLength(5);
  });
  it('honors a nonzero predictor start x0', () => {
    const r = deltaModulate([1], 0.5, 0.8);
    expect(r.bits).toEqual([1]); // 1 >= 0.8
    expect(r.staircase).toEqual([1.3]);
  });
});

describe('deltaDemodulate', () => {
  it('reconstructs the same staircase from the bits', () => {
    const { bits, staircase } = deltaModulate([0.4, 0.9, 0.3], 0.5, 0);
    expect(deltaDemodulate(bits, 0.5, 0)).toEqual(staircase);
  });
  it('integrates +/- step from x0', () => {
    expect(deltaDemodulate([1, 1, 0], 0.5, 0)).toEqual([0.5, 1.0, 0.5]);
  });
});

describe('slopeOverloadLimit', () => {
  it('equals step * fs', () => {
    expect(slopeOverloadLimit(0.1, 8000)).toBe(800);
    expect(slopeOverloadLimit(0.05, 100)).toBeCloseTo(5, 12);
  });
});

describe('adaptiveDeltaModulate', () => {
  it('emits one bit, one staircase value, and one step per input sample', () => {
    const r = adaptiveDeltaModulate([0.1, 0.5, 1.2, 2.0], 0.25, 1.5, 0);
    expect(r.bits).toHaveLength(4);
    expect(r.staircase).toHaveLength(4);
    expect(r.steps).toHaveLength(4);
  });
  it('grows the step while the input keeps rising (slope-overload response)', () => {
    const ramp = Array.from({ length: 8 }, (_, i) => i); // steep, persistent climb
    const r = adaptiveDeltaModulate(ramp, 0.25, 1.5, 0);
    expect(r.steps[5]).toBeGreaterThan(r.steps[1]); // step adapted upward
  });
  it('tracks a steep ramp better than fixed-step DM (lower total |error|)', () => {
    const ramp = Array.from({ length: 12 }, (_, i) => i);
    const adm = adaptiveDeltaModulate(ramp, 0.25, 1.5, 0);
    const dm = deltaModulate(ramp, 0.25, 0);
    const err = (st: number[]) => st.reduce((s, v, i) => s + Math.abs(ramp[i] - v), 0);
    expect(err(adm.staircase)).toBeLessThan(err(dm.staircase));
  });
});

describe('adaptiveDeltaDemodulate', () => {
  it('reconstructs the same staircase from the bits', () => {
    const ramp = Array.from({ length: 10 }, (_, i) => Math.sin(i / 2));
    const { bits, staircase } = adaptiveDeltaModulate(ramp, 0.2, 1.5, 0);
    const rec = adaptiveDeltaDemodulate(bits, 0.2, 1.5, 0);
    for (let i = 0; i < staircase.length; i++) {
      expect(rec[i]).toBeCloseTo(staircase[i], 9);
    }
  });
});
