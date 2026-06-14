import { describe, it, expect } from 'vitest';
import { buildSignalExplorer } from '@/modules/fourier/model';

const DEF = { amp: 1, t0: 0, F: 1, tau: 0.5, reverse: false, tMin: -10, tMax: 10, N: 2000 };

describe('Tab 1 builders', () => {
  it('buildSignalExplorer returns original + transformed + classification', () => {
    const v = buildSignalExplorer('rect', { ...DEF });
    expect(v.time.length).toBe(v.original.length);
    expect(v.time.length).toBe(v.transformed.length);
    expect(v.classification.even).toBe(true);
  });

  it('buildSignalExplorer applies amplitude scaling', () => {
    const base = buildSignalExplorer('rect', { ...DEF, amp: 1 });
    const scaled = buildSignalExplorer('rect', { ...DEF, amp: 2 });
    const i = Math.floor(base.time.length / 2);
    expect(scaled.transformed[i]).toBeCloseTo(2 * base.transformed[i], 6);
  });

  it('buildSignalExplorer uses axis N for sample count', () => {
    const v = buildSignalExplorer('sine', { ...DEF, N: 800 });
    expect(v.time.length).toBe(800);
    expect(v.original.length).toBe(800);
  });

  it('audioWavetable is always 201 samples regardless of axis N', () => {
    const v = buildSignalExplorer('sine', { ...DEF });
    expect(v.audioWavetable.length).toBe(201);
  });
});
