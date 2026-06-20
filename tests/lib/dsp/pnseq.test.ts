import { describe, it, expect } from 'vitest';
import { mSequence, pnAutocorrelation } from '@/lib/dsp/spread';
import { balance, goldCode, crossCorrelation, goldThreeValuedSet } from '@/lib/dsp/pnseq';

describe('pnseq', () => {
  it('m-sequence has period 2^n-1 and balance (#ones = #zeros + 1)', () => {
    const s = mSequence(5); // period 31, ±1
    expect(s).toHaveLength(31);
    const b = balance(s);
    expect(b.ones).toBe(16);
    expect(b.zeros).toBe(15);
  });
  it('m-sequence autocorrelation is the thumbtack {N, -1}', () => {
    const ac = pnAutocorrelation(mSequence(5));
    expect(ac[0]).toBe(31);
    for (let k = 1; k < 31; k++) expect(ac[k]).toBe(-1);
  });
  it('Gold-code cross-correlation takes only the three-valued set', () => {
    const g0 = goldCode(5, 0);
    const g1 = goldCode(5, 1);
    const allowed = new Set(goldThreeValuedSet(5)); // n=5 → {-1, -9, 7}
    for (const v of crossCorrelation(g0, g1)) expect(allowed.has(v)).toBe(true);
  });
});
