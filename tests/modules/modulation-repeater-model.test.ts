import { describe, it, expect } from 'vitest';
import { buildRepeaterView } from '@/modules/modulation/repeater-model';
import { regenerativeBer, analogBer, requiredEbN0DbRegen } from '@/lib/dsp/repeater';

describe('buildRepeaterView', () => {
  it('exposes the now-BER for both repeater types', () => {
    const v = buildRepeaterView({ K: 50, ebN0Db: 9, targetBer: 1e-5 });
    expect(v.regenNow).toBeCloseTo(regenerativeBer(50, 9), 12);
    expect(v.analogNow).toBeCloseTo(analogBer(50, 9), 12);
  });
  it('exposes required Eb/N0 and the regenerative advantage (dB gap)', () => {
    const v = buildRepeaterView({ K: 100, ebN0Db: 9, targetBer: 1e-5 });
    expect(v.reqRegenDb).toBeCloseTo(requiredEbN0DbRegen(100, 1e-5), 9);
    expect(v.gapDb).toBeCloseTo(v.reqAnalogDb - v.reqRegenDb, 9);
    expect(v.gapDb).toBeGreaterThan(0);
  });
  it('hop-noise: analog grows linearly across hops, regenerative stays flat', () => {
    const v = buildRepeaterView({ K: 6, ebN0Db: 9, targetBer: 1e-5 });
    expect(v.hops).toHaveLength(6);
    // analog noise accumulates (strictly increasing), regen resets each hop (constant)
    expect(v.hops[5].analog).toBeGreaterThan(v.hops[0].analog);
    expect(v.hops[0].regen).toBeCloseTo(v.hops[5].regen, 12);
  });
  it('analog ≥ regen in the valid low-BER regime (the K·Q bound saturates at low SNR)', () => {
    const v = buildRepeaterView({ K: 20, ebN0Db: 9, targetBer: 1e-5 });
    expect(v.regenCurve.length).toBe(v.analogCurve.length);
    for (let i = 0; i < v.regenCurve.length; i++) {
      // Eq. 8.10.1 (K·Q) assumes rare errors; below the operating regime the linear
      // K factor dominates. The regenerative advantage holds once BERs are low.
      if (v.regenCurve[i].pe >= 1e-2) continue;
      expect(v.analogCurve[i].pe).toBeGreaterThanOrEqual(v.regenCurve[i].pe * 0.999);
    }
  });
});
