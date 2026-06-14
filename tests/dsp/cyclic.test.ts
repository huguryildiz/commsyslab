import { describe, it, expect } from 'vitest';
import { polyDeg, polyAdd, polyMul, polyMod, polyToString } from '@/lib/dsp/cyclic';

describe('GF(2) polynomial primitives', () => {
  it('polyDeg returns the highest set index, -1 for zero', () => {
    expect(polyDeg([1, 0, 1, 1])).toBe(3);
    expect(polyDeg([0, 0, 0])).toBe(-1);
  });
  it('polyAdd is coefficientwise XOR', () => {
    expect(polyAdd([1, 1, 0], [0, 1, 1])).toEqual([1, 0, 1]);
  });
  it('polyMul convolves over GF(2)', () => {
    // (1+p)(1+p) = 1 + p^2  (mod 2)
    expect(polyMul([1, 1], [1, 1])).toEqual([1, 0, 1]);
  });
  it('polyMod computes the GF(2) remainder', () => {
    // (p^3+p^6) mod (p^3+p^2+1) = 1 + p   →  [1,1,0]
    expect(polyMod([0, 0, 0, 1, 0, 0, 1], [1, 0, 1, 1])).toEqual([1, 1, 0]);
  });
  it('polyToString renders descending terms', () => {
    expect(polyToString([1, 0, 1, 1])).toBe('p³+p²+1');
  });
});
