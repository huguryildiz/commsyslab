import { describe, it, expect } from 'vitest';
import {
  polyDeg,
  polyAdd,
  polyMul,
  polyMod,
  polyToString,
  dividesPn1,
  crcRemainder,
  encodeCyclic,
  syndrome,
  cyclicShiftRight,
  lfsrTrace,
  CYCLIC_PRESETS,
} from '@/lib/dsp/cyclic';

describe('GF(2) polynomial primitives', () => {
  it('polyDeg returns the highest set index, -1 for zero', () => {
    expect(polyDeg([1, 0, 1, 1])).toBe(3);
    expect(polyDeg([0, 0, 0])).toBe(-1);
  });
  it('polyAdd is coefficientwise XOR', () => {
    expect(polyAdd([1, 1, 0], [0, 1, 1])).toEqual([1, 0, 1]);
  });
  it('polyMul convolves over GF(2)', () => {
    // (1+p)(1+p) = 1 + p^2  (mod 2)
    expect(polyMul([1, 1], [1, 1])).toEqual([1, 0, 1]);
  });
  it('polyMod computes the GF(2) remainder', () => {
    // (p^3+p^6) mod (p^3+p^2+1) = 1 + p   →  [1,1,0]
    expect(polyMod([0, 0, 0, 1, 0, 0, 1], [1, 0, 1, 1])).toEqual([1, 1, 0]);
  });
  it('polyToString renders descending terms', () => {
    expect(polyToString([1, 0, 1, 1])).toBe('p³+p²+1');
  });
});

describe('cyclic encoding, syndrome, divisibility, shift', () => {
  const g = [1, 0, 1, 1]; // p^3+p^2+1

  it('dividesPn1: deg-3 divisors of p^7+1', () => {
    expect(dividesPn1([1, 0, 1, 1], 7)).toBe(true); // p^3+p^2+1
    expect(dividesPn1([1, 1, 0, 1], 7)).toBe(true); // p^3+p+1
    expect(dividesPn1([1, 1, 1, 1], 7)).toBe(false); // p^3+p^2+p+1 does not divide p^7+1
  });
  it('crcRemainder / encodeCyclic (7,4) fixture', () => {
    expect(crcRemainder([1, 0, 0, 1], g)).toEqual([1, 1, 0]);
    expect(encodeCyclic([1, 0, 0, 1], g)).toEqual([1, 1, 0, 1, 0, 0, 1]);
  });
  it('syndrome of a valid codeword is zero; a single error is nonzero', () => {
    const cw = encodeCyclic([1, 0, 0, 1], g);
    expect(syndrome(cw, g).every((b) => b === 0)).toBe(true);
    const bad = cw.slice();
    bad[2] ^= 1;
    expect(syndrome(bad, g).some((b) => b === 1)).toBe(true);
  });
  it('a cyclic shift of a codeword is still a codeword (syndrome 0)', () => {
    const cw = encodeCyclic([1, 0, 0, 1], g);
    const shifted = cyclicShiftRight(cw);
    expect(syndrome(shifted, g).every((b) => b === 0)).toBe(true);
  });
});

describe('LFSR trace + presets', () => {
  it('lfsrTrace final register equals crcRemainder (7,4)', () => {
    const g = [1, 0, 1, 1];
    const trace = lfsrTrace([1, 0, 0, 1], g);
    expect(trace[trace.length - 1].reg).toEqual(crcRemainder([1, 0, 0, 1], g));
    // one snapshot per message bit, plus the initial state
    expect(trace.length).toBe(4 + 1);
  });
  it('lfsrTrace agrees with crcRemainder for CRC-8 too', () => {
    const crc8 = CYCLIC_PRESETS.find((p) => p.id === 'crc8')!;
    const msg = [1, 0, 1, 1, 0, 0, 1, 0];
    const trace = lfsrTrace(msg, crc8.g);
    expect(trace[trace.length - 1].reg).toEqual(crcRemainder(msg, crc8.g));
  });
  it('presets: cyclic ones divide p^n+1; ids are stable', () => {
    expect(CYCLIC_PRESETS.map((p) => p.id)).toEqual([
      'c74a',
      'c74h',
      'c1511',
      'crc4',
      'crc8',
    ]);
    const c74a = CYCLIC_PRESETS.find((p) => p.id === 'c74a')!;
    expect(dividesPn1(c74a.g, 7)).toBe(true);
  });
});
