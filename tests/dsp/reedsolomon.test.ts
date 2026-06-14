import { describe, it, expect } from 'vitest';
import { makeField } from '@/lib/dsp/gf2m';
import {
  rsParams,
  rsGenerator,
  rsEncode,
  rsSyndromes,
  bitsToSymbols,
  symbolsToBits,
} from '@/lib/dsp/reedsolomon';

describe('Reed-Solomon over GF(2^m) (Proakis §9.6, Eq. 9.6.20–23)', () => {
  it('RS(7,3) parameters: MDS distance N−K+1', () => {
    expect(rsParams(3, 3)).toEqual({ m: 3, N: 7, K: 3, parity: 4, dmin: 5, t: 2, rate: 3 / 7 });
  });
  it('generator has degree = parity and encode is systematic', () => {
    const f = makeField(3);
    expect(rsGenerator(f, 4).length - 1).toBe(4);
    expect(rsEncode(f, [5, 2, 7], 3)).toEqual([6, 4, 0, 3, 5, 2, 7]);
  });
  it('syndromes vanish for a codeword and not for a single symbol error', () => {
    const f = makeField(3);
    const cw = rsEncode(f, [5, 2, 7], 3);
    expect(rsSyndromes(f, cw, 4).every((s) => s === 0)).toBe(true);
    const bad = cw.slice();
    bad[2] ^= 3;
    expect(rsSyndromes(f, bad, 4).some((s) => s !== 0)).toBe(true);
  });
  it('bit↔symbol round-trips and a ≤m-bit burst hits ≤2 symbols', () => {
    const f = makeField(3);
    const cw = rsEncode(f, [5, 2, 7], 3);
    const bits = symbolsToBits(cw, 3);
    expect(bitsToSymbols(bits, 3)).toEqual(cw);
    // flip 3 adjacent bits starting at bit 2 → affects at most 2 symbols
    const flipped = bits.slice();
    for (let i = 2; i < 5; i++) flipped[i] ^= 1;
    const errSyms = bitsToSymbols(flipped, 3)
      .map((s, i) => (s !== cw[i] ? i : -1))
      .filter((i) => i >= 0);
    expect(errSyms.length).toBeLessThanOrEqual(2);
  });
});
