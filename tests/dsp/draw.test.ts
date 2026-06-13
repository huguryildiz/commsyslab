import { describe, it, expect } from 'vitest';
import { logScale, regionColors } from '@/lib/plot/draw';

describe('logScale', () => {
  it('maps decade endpoints to the pixel range', () => {
    const s = logScale([1e-4, 1], [200, 0]); // y-pixels: bottom=200 at 1e-4, top=0 at 1
    expect(s(1)).toBeCloseTo(0, 6);
    expect(s(1e-4)).toBeCloseTo(200, 6);
  });

  it('places a mid-decade value proportionally in log space', () => {
    const s = logScale([1e-2, 1], [100, 0]); // 2 decades over 100px
    expect(s(1e-1)).toBeCloseTo(50, 6); // one decade up = halfway
  });

  it('clamps inputs at or below zero to the domain floor', () => {
    const s = logScale([1e-3, 1], [90, 0]);
    expect(s(0)).toBeCloseTo(90, 6);
    expect(s(-5)).toBeCloseTo(90, 6);
  });
});

describe('regionColors', () => {
  it('returns one translucent color per symbol', () => {
    const cols = regionColors(4);
    expect(cols).toHaveLength(4);
    for (const c of cols) expect(c).toMatch(/^hsla\(/);
  });
});
