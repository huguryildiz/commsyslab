import { describe, it, expect } from 'vitest';
import { quadratureBasis, fskBasis } from '@/lib/dsp/carrierbasis';

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

describe('quadratureBasis', () => {
  it('returns two unit-energy, mutually orthogonal carriers (integer cycles)', () => {
    const [c, s] = quadratureBasis(32, 4);
    expect(c).toHaveLength(32);
    expect(s).toHaveLength(32);
    expect(dot(c, c)).toBeCloseTo(1, 9);
    expect(dot(s, s)).toBeCloseTo(1, 9);
    expect(dot(c, s)).toBeCloseTo(0, 9);
  });
});

describe('fskBasis', () => {
  it('returns M unit-energy mutually orthogonal tones', () => {
    const b = fskBasis(4, 64, 2);
    expect(b).toHaveLength(4);
    for (const tone of b) {
      expect(tone).toHaveLength(64);
      expect(dot(tone, tone)).toBeCloseTo(1, 9);
    }
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        expect(dot(b[i], b[j])).toBeCloseTo(0, 9);
      }
    }
  });
});
