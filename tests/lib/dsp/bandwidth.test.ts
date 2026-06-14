import { describe, it, expect } from 'vitest';
import { nullToNullBandwidth, halfPowerBandwidth } from '@/lib/dsp/bandwidth';

describe('bandwidth', () => {
  const f = Array.from({ length: 101 }, (_, i) => i); // 0..100 Hz
  // Triangle magnitude peaking at f=20, zero at f=0 and f=40
  const mag = f.map((x) => Math.max(0, 1 - Math.abs(x - 20) / 20));

  it('nullToNullBandwidth spans the first nulls around the peak', () => {
    const bw = nullToNullBandwidth(f, mag);
    expect(bw.fLo).toBeCloseTo(0, 0);
    expect(bw.fHi).toBeCloseTo(40, 0);
    expect(bw.W).toBeCloseTo(40, 0);
  });

  it('halfPowerBandwidth uses the −3 dB (0.707·peak) crossings', () => {
    const bw = halfPowerBandwidth(f, mag);
    // 0.707 crossings of the triangle: 20 ± 0.293*20 ≈ [14.1, 25.9]
    expect(bw.W).toBeGreaterThan(10);
    expect(bw.W).toBeLessThan(14);
  });
});
