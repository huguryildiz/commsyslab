import { describe, it, expect } from 'vitest';
import { buildSignalExplorer, buildConvolution } from '@/modules/fourier/model';

describe('Tab 1 builders', () => {
  it('buildSignalExplorer returns original + transformed + classification', () => {
    const v = buildSignalExplorer('rect', { shift: 0, scale: 1, amp: 1, reverse: false });
    expect(v.time.length).toBe(v.original.length);
    expect(v.time.length).toBe(v.transformed.length);
    expect(v.classification.even).toBe(true);
  });

  it('buildSignalExplorer applies amplitude scaling', () => {
    const base = buildSignalExplorer('rect', { shift: 0, scale: 1, amp: 1, reverse: false });
    const scaled = buildSignalExplorer('rect', { shift: 0, scale: 1, amp: 2, reverse: false });
    const i = Math.floor(base.time.length / 2);
    expect(scaled.transformed[i]).toBeCloseTo(2 * base.transformed[i], 6);
  });

  it('buildConvolution returns y longer than x (linear convolution)', () => {
    const v = buildConvolution('rect', 'rect', 0);
    expect(v.y.length).toBe(v.t.length);
    expect(v.x.length).toBe(v.t.length);
    expect(Math.max(...v.y)).toBeGreaterThan(0);
  });
});
