import { describe, it, expect } from 'vitest';
import { convBerSoftBound, BOOK_CODE } from '@/lib/dsp/convcodes';
import {
  concatRate,
  concatDmin,
  burstErrorsPerCodeword,
  isCorrectable,
  concatOutputBer,
} from '@/lib/dsp/concatenated';

describe('concatenated codes', () => {
  it('composes rate and distance (Eq. 9.8.1, product distance)', () => {
    expect(concatRate(11 / 15, 1 / 2)).toBeCloseTo(11 / 30, 10);
    expect(concatDmin(5, 5)).toBe(25);
  });

  it('interleaving spreads a burst so each codeword stays correctable', () => {
    const inter = burstErrorsPerCodeword(15, 4, 0, 6, true);
    const plain = burstErrorsPerCodeword(15, 4, 0, 6, false);
    expect(inter).toEqual([2, 2, 1, 1]);
    expect(plain).toEqual([6, 0, 0, 0]);
    expect(isCorrectable(inter, 2)).toBe(true);
    expect(isCorrectable(plain, 2)).toBe(false);
  });

  it('concatOutputBer is monotone and below inner-only at high SNR', () => {
    expect(concatOutputBer(3, 15, 11, 4)).toBeGreaterThan(concatOutputBer(6, 15, 11, 4));
    expect(concatOutputBer(5, 15, 11, 4)).toBeGreaterThan(0);
    expect(concatOutputBer(5, 15, 11, 4)).toBeLessThan(convBerSoftBound(BOOK_CODE, 5));
  });
});
