import { describe, it, expect } from 'vitest';
import { encodeAnalog, decodeAnalog, analogSqnrDb, type AnalogSourceParams } from '@/lib/sim/analogSource';

const PARAMS: AnalogSourceParams = {
  tones: [{ freq: 2, amp: 0.8 }],
  fs: 32,
  tEnd: 1,
  mMax: 1,
  bits: 4,
  type: 'midrise',
  coding: 'gray',
};

describe('analog source', () => {
  it('encodes one R-bit codeword per sample', () => {
    const enc = encodeAnalog(PARAMS);
    expect(enc.bits.length).toBe(enc.meta.sampleCount * 4);
    expect(enc.original.length).toBe(enc.meta.sampleCount);
  });

  it('decoding the clean bitstream reproduces the tx quantized levels', () => {
    const enc = encodeAnalog(PARAMS);
    expect(decodeAnalog(enc.bits, enc.meta)).toEqual(enc.quantized);
  });

  it('reports a finite, positive SQNR for a non-trivial signal', () => {
    const enc = encodeAnalog(PARAMS);
    const sqnr = analogSqnrDb(enc.original, enc.quantized);
    expect(Number.isFinite(sqnr)).toBe(true);
    expect(sqnr).toBeGreaterThan(10);
  });
});
