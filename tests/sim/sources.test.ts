import { describe, it, expect } from 'vitest';
import { textToBits, bitsToText, randomBitSource, bitsToSymbols, symbolsToBits } from '@/lib/sim/sources';

describe('textToBits', () => {
  it("encodes 'A' (65) as 8 MSB-first bits", () => {
    expect(textToBits('A')).toEqual([0, 1, 0, 0, 0, 0, 0, 1]);
  });
});

describe('text <-> bits roundtrip', () => {
  it('recovers the original ASCII text', () => {
    const s = 'Hello, DigiComm!';
    expect(bitsToText(textToBits(s))).toBe(s);
  });
});

describe('randomBitSource', () => {
  it('is reproducible for a fixed seed', () => {
    const a = randomBitSource(42);
    const b = randomBitSource(42);
    const seqA = Array.from({ length: 16 }, () => a());
    const seqB = Array.from({ length: 16 }, () => b());
    expect(seqA).toEqual(seqB);
  });
  it('only emits 0 or 1', () => {
    const src = randomBitSource(7);
    for (let i = 0; i < 100; i++) {
      const bit = src();
      expect(bit === 0 || bit === 1).toBe(true);
    }
  });
});

describe('bitsToSymbols / symbolsToBits', () => {
  it('round-trips a bit array on whole-symbol boundaries (k=2)', () => {
    const bits = [1, 0, 1, 1, 0, 0] as const;
    const syms = bitsToSymbols([...bits], 2);
    expect(syms).toEqual([2, 3, 0]);
    expect(symbolsToBits(syms, 2)).toEqual([...bits]);
  });
});
