import { describe, it, expect } from 'vitest';
import {
  makeField,
  gfAdd,
  gfMul,
  gfPow,
  gfInv,
  elemToBits,
  gfPolyMod,
  gfPolyEval,
  cyclotomicCoset,
  minimalPoly,
} from '@/lib/dsp/gf2m';

describe('GF(2^m) field + arithmetic', () => {
  it('GF(8) with p^3+p+1 has exp table [1,2,4,3,6,7,5]', () => {
    const f = makeField(3);
    expect(f.n).toBe(7);
    expect(f.exp).toEqual([1, 2, 4, 3, 6, 7, 5]);
  });
  it('gfAdd is XOR; gfMul/gfPow/gfInv obey field laws in GF(8)', () => {
    const f = makeField(3);
    expect(gfAdd(3, 6)).toBe(5);
    expect(gfMul(f, 3, 7)).toBe(2); // α³·α⁵ = α⁸ = α¹
    expect(gfMul(f, 0, 5)).toBe(0);
    expect(gfPow(f, 2, 7)).toBe(1); // α^(2^m−1) = 1
    expect(gfMul(f, 5, gfInv(f, 5))).toBe(1);
  });
  it('elemToBits gives LSB-first coefficient bits', () => {
    expect(elemToBits(3, 3)).toEqual([1, 1, 0]); // p+1
    expect(elemToBits(4, 3)).toEqual([0, 0, 1]); // p²
  });
});

describe('GF(2^m) polynomials + minimal polynomials', () => {
  it('gfPolyEval evaluates with Horner over the field', () => {
    const f = makeField(3);
    // poly = α^j as constants: (x + α¹) at x = α¹ → 0
    expect(gfPolyEval(f, [f.exp[1], 1], f.exp[1])).toBe(0);
  });
  it('cyclotomic cosets mod 15 (m=4)', () => {
    expect(cyclotomicCoset(15, 1)).toEqual([1, 2, 4, 8]);
    expect(cyclotomicCoset(15, 3).slice().sort((a, b) => a - b)).toEqual([3, 6, 9, 12]);
    expect(cyclotomicCoset(15, 5).slice().sort((a, b) => a - b)).toEqual([5, 10]);
  });
  it('minimal polynomials over GF(16) are binary and match the book', () => {
    const f = makeField(4);
    expect(minimalPoly(f, 1)).toEqual([1, 1, 0, 0, 1]); // p⁴+p+1
    expect(minimalPoly(f, 3)).toEqual([1, 1, 1, 1, 1]); // p⁴+p³+p²+p+1
    expect(minimalPoly(f, 5)).toEqual([1, 1, 1]); // p²+p+1
  });
  it('gfPolyMod reduces over the field', () => {
    const f = makeField(3);
    // (x² + 1) mod (x + 1) over GF(8): remainder constant; sanity: degree < 1
    expect(gfPolyMod(f, [1, 0, 1], [1, 1]).length).toBe(1);
  });
});
