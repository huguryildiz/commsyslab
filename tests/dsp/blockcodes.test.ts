import { describe, it, expect } from 'vitest';
import { weight, hammingDistance, encode, syndrome } from '@/lib/dsp/blockcodes';

describe('GF(2) primitives', () => {
  it('weight counts ones', () => {
    expect(weight([1, 0, 1, 1])).toBe(3);
    expect(weight([0, 0, 0])).toBe(0);
  });
  it('hammingDistance = weight of XOR', () => {
    expect(hammingDistance([1, 0, 1], [1, 1, 0])).toBe(2);
  });
  it('encode computes c = xG mod 2', () => {
    // G = [[1,0,1],[0,1,1]] → x=[1,1] → c = [1,1,0]
    expect(encode([1, 1], [[1, 0, 1], [0, 1, 1]])).toEqual([1, 1, 0]);
  });
  it('syndrome computes s = rHᵀ mod 2', () => {
    // H = [[1,1,0],[1,0,1]] → r=[1,1,0] → s=[0,1]
    expect(syndrome([1, 1, 0], [[1, 1, 0], [1, 0, 1]])).toEqual([0, 1]);
  });
});
