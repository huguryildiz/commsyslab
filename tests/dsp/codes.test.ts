import { describe, it, expect } from 'vitest';
import {
  kraftSum,
  isPrefixFree,
  avgLength,
  efficiency,
  isUniquelyDecodable,
  decodePrefix,
} from '@/lib/dsp/codes';

const CODE_I = ['0', '1', '00', '11'];
const CODE_II = ['0', '10', '110', '111'];
const CODE_III = ['0', '01', '011', '0111'];

describe('kraftSum', () => {
  it('matches the slide values for Code-I/II/III', () => {
    expect(kraftSum([1, 1, 2, 2])).toBeCloseTo(1.5, 10); // Code-I
    expect(kraftSum([1, 2, 3, 3])).toBeCloseTo(1.0, 10); // Code-II
    expect(kraftSum([1, 2, 3, 4])).toBeCloseTo(0.9375, 10); // Code-III
  });
});

describe('isPrefixFree', () => {
  it('Code-I and Code-III are not prefix-free; Code-II is', () => {
    expect(isPrefixFree(CODE_I)).toBe(false);
    expect(isPrefixFree(CODE_II)).toBe(true);
    expect(isPrefixFree(CODE_III)).toBe(false);
  });
});

describe('isUniquelyDecodable (Sardinas–Patterson)', () => {
  it('Code-I is not UD, Code-II is UD, Code-III is UD (but non-prefix)', () => {
    expect(isUniquelyDecodable(CODE_I)).toBe(false);
    expect(isUniquelyDecodable(CODE_II)).toBe(true);
    expect(isUniquelyDecodable(CODE_III)).toBe(true);
  });
  it('catches a classic non-UD code {0,01,10}', () => {
    expect(isUniquelyDecodable(['0', '01', '10'])).toBe(false);
  });
});

describe('avgLength & efficiency', () => {
  it('computes L̄ and η for a dyadic Code-II (η = 1)', () => {
    const p = [0.5, 0.25, 0.125, 0.125];
    const L = avgLength(p, [1, 2, 3, 3]);
    expect(L).toBeCloseTo(1.75, 10);
    expect(efficiency(1.75, L)).toBeCloseTo(1, 10);
  });
});

describe('decodePrefix', () => {
  const map = { '0': 's0', '10': 's1', '110': 's2', '111': 's3' };
  it('decodes a valid Code-II stream', () => {
    expect(decodePrefix('010110111', map)).toBe('s0s1s2s3');
  });
  it('returns null on an undecodable tail', () => {
    expect(decodePrefix('01', map)).toBeNull();
  });
});
