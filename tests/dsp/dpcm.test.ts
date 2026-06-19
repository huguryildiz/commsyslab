import { describe, it, expect } from 'vitest';
import { dpcmEncode, dpcmDecode, predictionGainDb } from '@/lib/dsp/dpcm';

function sine(n: number, f: number): number[] {
  return Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * f * i) / n));
}

describe('dpcmEncode / dpcmDecode', () => {
  it('decoder reconstructs the encoder staircase exactly (closed loop)', () => {
    const sig = sine(64, 2);
    const coeffs = [0.95];
    const enc = dpcmEncode(sig, coeffs, 4, 0.5);
    const dec = dpcmDecode(enc.predError, coeffs);
    for (let i = 0; i < sig.length; i++) {
      expect(dec[i]).toBeCloseTo(enc.reconstructed[i], 9);
    }
  });
  it('emits one prediction-error and one reconstructed sample per input', () => {
    const sig = sine(32, 1);
    const enc = dpcmEncode(sig, [0.9], 3, 1);
    expect(enc.predError).toHaveLength(32);
    expect(enc.reconstructed).toHaveLength(32);
    expect(enc.rawError).toHaveLength(32);
  });
});

describe('predictionGainDb', () => {
  it('is positive for a correlated (smooth) source — error variance < signal variance', () => {
    const sig = sine(256, 3);
    const enc = dpcmEncode(sig, [0.97], 6, 1);
    expect(predictionGainDb(sig, enc.rawError)).toBeGreaterThan(0);
  });
});
