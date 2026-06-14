import { describe, it, expect } from 'vitest';
import { bchGenerator, bchParams, bchEncode, bchSyndromes, genToOctal } from '@/lib/dsp/bch';
import { polyToString } from '@/lib/dsp/cyclic';

describe('BCH construction (Proakis §9.6, Table 9.1)', () => {
  it('(15,5,t=3) generator equals octal 2467 = p^10+p^8+p^5+p^4+p^2+p+1', () => {
    const g = bchGenerator(4, 3);
    expect(genToOctal(g)).toBe('2467');
    expect(polyToString(g)).toBe('p¹⁰+p⁸+p⁵+p⁴+p²+p+1');
    const p = bchParams(4, 3);
    expect([p.n, p.k, p.dmin]).toEqual([15, 5, 7]);
  });
  it('(7,4,t=1) is the Hamming code g = p^3+p+1', () => {
    expect(bchGenerator(3, 1)).toEqual([1, 1, 0, 1]); // 1+p+p³
    const p = bchParams(3, 1);
    expect([p.n, p.k, p.dmin]).toEqual([7, 4, 3]);
  });
  it('syndromes vanish for a valid codeword and not for a single-bit error', () => {
    const cw = bchEncode([1, 0, 1, 1, 0], 4, 3); // 5 message bits → (15,5)
    expect(cw.length).toBe(15);
    expect(bchSyndromes(cw, 4, 3).every((s) => s === 0)).toBe(true);
    const bad = cw.slice();
    bad[0] ^= 1;
    expect(bchSyndromes(bad, 4, 3).some((s) => s !== 0)).toBe(true);
  });
});
