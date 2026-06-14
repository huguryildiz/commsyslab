import { describe, it, expect } from 'vitest';
import {
  weight,
  hammingDistance,
  encode,
  syndrome,
  allCodewords,
  minDistance,
  errorCorrectionT,
  CODES,
  makeHamming,
  syndromeTable,
  decode,
} from '@/lib/dsp/blockcodes';

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

describe('codewords & minimum distance', () => {
  it('allCodewords enumerates 2^k words; rep(3,1) gives {000,111}', () => {
    const cws = allCodewords([[1, 1, 1]]).map((c) => c.join(''));
    expect(cws.sort()).toEqual(['000', '111']);
  });
  it('minDistance = min nonzero weight (Thm 9.5.1)', () => {
    expect(minDistance([[1, 1, 1]])).toBe(3);
  });
  it('errorCorrectionT = floor((dmin-1)/2)', () => {
    expect(errorCorrectionT(3)).toBe(1);
    expect(errorCorrectionT(1)).toBe(0);
    expect(errorCorrectionT(5)).toBe(2);
  });
});

function gHtTimesZero(G: number[][], H: number[][]): boolean {
  // GHᵀ must be all zeros (mod 2).
  for (const g of G)
    for (const h of H) {
      let s = 0;
      for (let j = 0; j < g.length; j++) s ^= g[j] & h[j];
      if (s & 1) return false;
    }
  return true;
}

describe('code definitions', () => {
  it('exposes the three codes', () => {
    expect(CODES.map((c) => c.id)).toEqual(['hamming74', 'hamming1511', 'rep31']);
  });
  it('every code satisfies GHᵀ=0 and the declared d_min equals the computed one', () => {
    for (const c of CODES) {
      expect(gHtTimesZero(c.G, c.H)).toBe(true);
      expect(c.G.length).toBe(c.k);
      expect(c.G[0].length).toBe(c.n);
      expect(c.H.length).toBe(c.n - c.k);
      expect(minDistance(c.G)).toBe(c.dmin);
    }
  });
  it('makeHamming(4) builds a (15,11,3) code with GHᵀ=0', () => {
    const { G, H, n, k } = makeHamming(4);
    expect([n, k]).toEqual([15, 11]);
    expect(gHtTimesZero(G, H)).toBe(true);
    expect(minDistance(G)).toBe(3);
  });
});

describe('syndrome decoding', () => {
  it('corrects every single-bit error on (7,4) Hamming', () => {
    const code = CODES[0]; // hamming74
    const table = syndromeTable(code.H);
    const x = [1, 0, 1, 1];
    const c = encode(x, code.G);
    for (let pos = 0; pos < code.n; pos++) {
      const r = c.slice();
      r[pos] ^= 1;
      const dec = decode(r, code, table);
      expect(dec.errorPos).toBe(pos);
      expect(dec.message).toEqual(x);
    }
  });
  it('does NOT recover a weight-2 error on (7,4) Hamming (t=1)', () => {
    const code = CODES[0];
    const table = syndromeTable(code.H);
    const x = [1, 0, 1, 1];
    const c = encode(x, code.G);
    const r = c.slice();
    r[0] ^= 1;
    r[1] ^= 1;
    const dec = decode(r, code, table);
    expect(dec.message).not.toEqual(x);
  });
  it('error-free word decodes to itself with zero syndrome', () => {
    const code = CODES[0];
    const table = syndromeTable(code.H);
    const x = [0, 1, 1, 0];
    const c = encode(x, code.G);
    const dec = decode(c, code, table);
    expect(dec.syndrome.every((b) => b === 0)).toBe(true);
    expect(dec.errorPos).toBe(-1);
    expect(dec.message).toEqual(x);
  });
});
