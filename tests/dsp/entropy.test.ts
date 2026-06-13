import { describe, it, expect } from 'vitest';
import { selfInfo, entropy, maxEntropy, binaryEntropy, extendedEntropy } from '@/lib/dsp/entropy';

describe('entropy', () => {
  it('self-information is −log2(p)', () => {
    expect(selfInfo(0.25)).toBeCloseTo(2, 10);
    expect(selfInfo(1)).toBeCloseTo(0, 10);
    expect(selfInfo(0)).toBe(0); // never-occurring symbol contributes no surprise (convention)
  });

  it('matches the slide entropy example {0.7,0.2,0.1} → 1.1568', () => {
    expect(entropy([0.7, 0.2, 0.1])).toBeCloseTo(1.1568, 3);
  });

  it('ignores zero-probability terms (0·log0 = 0)', () => {
    expect(entropy([0.5, 0.5, 0])).toBeCloseTo(1, 10);
  });

  it('binary entropy is 1 at p=0.5 and 0 at the endpoints', () => {
    expect(binaryEntropy(0.5)).toBeCloseTo(1, 10);
    expect(binaryEntropy(0)).toBe(0);
    expect(binaryEntropy(1)).toBe(0);
  });

  it('max entropy is log2(K)', () => {
    expect(maxEntropy(4)).toBeCloseTo(2, 10);
    expect(maxEntropy(8)).toBeCloseTo(3, 10);
  });

  it('extended-source entropy is n·H(S) (slide: 2.3136 for n=2)', () => {
    expect(extendedEntropy([0.7, 0.2, 0.1], 2)).toBeCloseTo(2.3136, 3);
  });
});
