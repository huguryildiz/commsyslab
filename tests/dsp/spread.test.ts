import { describe, it, expect } from 'vitest';
import { mSequence, pnAutocorrelation } from '@/lib/dsp/spread';

describe('mSequence', () => {
  it('has maximal length N = 2^n - 1 with entries of ±1', () => {
    for (const n of [3, 4, 5]) {
      const seq = mSequence(n);
      expect(seq).toHaveLength((1 << n) - 1);
      expect(seq.every((c) => c === 1 || c === -1)).toBe(true);
    }
  });
  it('is balanced: exactly one more -1 than +1 (or vice versa)', () => {
    const seq = mSequence(5); // N = 31
    const ones = seq.filter((c) => c === 1).length;
    const negs = seq.filter((c) => c === -1).length;
    expect(Math.abs(ones - negs)).toBe(1);
  });
});

describe('pnAutocorrelation', () => {
  it('is the two-valued m-sequence autocorrelation: N at 0, -1 elsewhere', () => {
    const n = 5;
    const seq = mSequence(n);
    const N = (1 << n) - 1;
    const ac = pnAutocorrelation(seq);
    expect(ac).toHaveLength(N);
    expect(ac[0]).toBe(N);
    for (let k = 1; k < N; k++) expect(ac[k]).toBe(-1);
  });
});
