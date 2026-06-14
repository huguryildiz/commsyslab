import { describe, it, expect } from 'vitest';
import { mSequence, pnAutocorrelation, spreadBits, despreadChips, processingGainDb } from '@/lib/dsp/spread';

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

describe('spreadBits / despreadChips', () => {
  it('round-trips bits through spreading and despreading with no channel error', () => {
    const pn = mSequence(4); // N = 15
    const bits = [1, -1, -1, 1];
    const chips = spreadBits(bits, pn);
    expect(chips).toHaveLength(bits.length * pn.length);
    const recovered = despreadChips(chips, pn);
    expect(recovered).toEqual(bits);
  });
  it('each data bit multiplies the whole PN period (BPSK ±1)', () => {
    const pn = mSequence(3); // N = 7
    const chips = spreadBits([1], pn);
    expect(chips).toEqual(pn); // +1 bit reproduces the PN sequence
    const chipsNeg = spreadBits([-1], pn);
    expect(chipsNeg).toEqual(pn.map((c) => -c));
  });
});

describe('processingGainDb', () => {
  it('is 10*log10(N)', () => {
    expect(processingGainDb(31)).toBeCloseTo(10 * Math.log10(31), 12);
  });
});
