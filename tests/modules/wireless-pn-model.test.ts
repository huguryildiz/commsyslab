import { describe, it, expect } from 'vitest';
import { DEFAULT_PN_PARAMS, derivePn } from '@/modules/wireless/pn-model';

describe('derivePn', () => {
  it('exposes a period-(2^n-1) sequence with thumbtack autocorrelation', () => {
    const d = derivePn(DEFAULT_PN_PARAMS); // n=5
    expect(d.period).toBe(31);
    expect(d.seq).toHaveLength(31);
    expect(d.states).toHaveLength(31);
    expect(d.autocorr[0]).toBe(31);
    expect(d.autocorr[1]).toBe(-1);
  });
  it('Gold cross-correlation magnitude stays bounded (three-valued)', () => {
    const d = derivePn({ n: 5, goldShift: 1 });
    expect(d.crossPeak).toBeLessThanOrEqual(9); // n=5 → t(n)=9
  });
});
