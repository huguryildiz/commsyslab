import { describe, it, expect } from 'vitest';
import { mSequence } from '@/lib/dsp/spread';
import { searchProfile, meanAcqTimeCells, dllSCurve } from '@/lib/dsp/ssync';

describe('ssync', () => {
  it('serial-search correlation profile peaks at zero offset = N', () => {
    const pn = mSequence(5);
    const prof = searchProfile(pn);
    expect(prof[0]).toBe(31);
    for (let k = 1; k < prof.length; k++) expect(prof[k]).toBeLessThan(prof[0]);
  });
  it('mean acquisition time grows with code length', () => {
    const tShort = meanAcqTimeCells(31, 0.9, 0.01, 1);
    const tLong = meanAcqTimeCells(127, 0.9, 0.01, 1);
    expect(tLong).toBeGreaterThan(tShort);
  });
  it('DLL S-curve crosses zero at τ=0 with restoring (negative) slope', () => {
    const taus = [-1, -0.5, 0, 0.5, 1];
    const s = dllSCurve(taus, 0.5);
    expect(Math.abs(s[2])).toBeLessThan(1e-9); // zero at τ=0
    expect(s[1]).toBeGreaterThan(0); // pulls back from negative error
    expect(s[3]).toBeLessThan(0); // pulls back from positive error
  });
});
