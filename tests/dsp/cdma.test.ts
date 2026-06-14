import { describe, it, expect } from 'vitest';
import { cdmaSir, cdmaBer, userCapacity } from '@/lib/dsp/cdma';
import { qfunc } from '@/lib/dsp/math';

describe('cdmaSir', () => {
  it('is 3·Lc/((Nu−1)·Γ), infinite for one user, falling with users', () => {
    expect(cdmaSir(63, 1, 1)).toBe(Infinity);
    expect(cdmaSir(63, 11, 1)).toBeCloseTo((3 * 63) / 10, 9);
    expect(cdmaSir(63, 21, 1)).toBeLessThan(cdmaSir(63, 11, 1));
    expect(cdmaSir(63, 11, 4)).toBeLessThan(cdmaSir(63, 11, 1)); // near-far hurts
  });
});

describe('cdmaBer', () => {
  it('a single user reduces to AWGN BPSK Q(√(2γ_b))', () => {
    const ebN0Db = 8;
    const g = 10 ** (ebN0Db / 10);
    expect(cdmaBer(63, 1, ebN0Db, 1)).toBeCloseTo(qfunc(Math.sqrt(2 * g)), 9);
  });
  it('rises with users and falls with processing gain', () => {
    expect(cdmaBer(63, 30, 12, 1)).toBeGreaterThan(cdmaBer(63, 10, 12, 1));
    expect(cdmaBer(127, 30, 12, 1)).toBeLessThan(cdmaBer(63, 30, 12, 1));
  });
  it('near-far (Γ>1) is worse than perfect power control (Γ=1)', () => {
    expect(cdmaBer(63, 20, 12, 8)).toBeGreaterThan(cdmaBer(63, 20, 12, 1));
  });
});

describe('userCapacity', () => {
  it('grows with processing gain and shrinks under near-far', () => {
    const base = userCapacity(63, 15, 1e-3, 1);
    expect(userCapacity(127, 15, 1e-3, 1)).toBeGreaterThan(base);
    expect(userCapacity(63, 15, 1e-3, 8)).toBeLessThan(base);
    expect(base).toBeGreaterThanOrEqual(1);
  });
});
