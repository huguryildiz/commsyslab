import { describe, it, expect } from 'vitest';
import { makeConstellation } from '@/lib/dsp/modulation';
import { bitsToSymbols, symbolsToBits, transmit, SMILEY } from '@/modules/modulation/codec';
import { textToBits, bitsToText, type Bit } from '@/lib/sim/sources';

describe('bit<->symbol mapping', () => {
  it('round-trips bits through symbols for k=2', () => {
    const bits: Bit[] = [0, 1, 1, 0, 1, 1, 0, 0];
    const syms = bitsToSymbols(bits, 2);
    expect(syms).toEqual([1, 2, 3, 0]);
    expect(symbolsToBits(syms, 2)).toEqual(bits);
  });

  it('zero-pads a trailing partial group', () => {
    const bits: Bit[] = [1, 0, 1]; // k=2 -> [10, 1_] -> [2, 2]
    const syms = bitsToSymbols(bits, 2);
    expect(syms).toEqual([2, 2]);
  });
});

describe('transmit', () => {
  it('recovers text exactly at very high Eb/N0 (noiseless limit)', () => {
    const c = makeConstellation('mqam', 16);
    const bits = textToBits('EE413');
    const r = transmit(bits, c, { ebN0Db: 50, decision: 'ml', seed: 7 });
    expect(r.bitErrors).toBe(0);
    expect(bitsToText(r.rxBits.slice(0, bits.length))).toBe('EE413');
  });

  it('produces some errors at low Eb/N0', () => {
    const c = makeConstellation('mpsk', 8);
    const bits = textToBits('the quick brown fox');
    const r = transmit(bits, c, { ebN0Db: 0, decision: 'ml', seed: 3 });
    expect(r.bitErrors).toBeGreaterThan(0);
    expect(r.totalBits).toBe(bits.length);
  });

  it('SMILEY bitmap is 256 bits (16x16)', () => {
    expect(SMILEY).toHaveLength(256);
  });
});
