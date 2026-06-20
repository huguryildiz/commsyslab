import { describe, it, expect } from 'vitest';
import { differentialEncode, differentialDecode } from '@/lib/dsp/dpsk';

describe('differential encode/decode', () => {
  it('encodes as a running modulo-M sum of phase increments', () => {
    // ref=0: cumulative [1, 1+1, 2+0, 2+3] mod 4
    expect(differentialEncode([1, 1, 0, 3], 4)).toEqual([1, 2, 2, 1]);
  });
  it('decode is the exact inverse of encode (round-trips)', () => {
    const info = [0, 3, 2, 1, 1, 0, 3, 3, 2];
    expect(differentialDecode(differentialEncode(info, 4), 4)).toEqual(info);
  });
  it('binary: a 1 flips phase, a 0 holds it', () => {
    expect(differentialEncode([1, 0, 1, 1, 0], 2)).toEqual([1, 1, 0, 1, 1]);
  });
});
