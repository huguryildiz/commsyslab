import { describe, it, expect } from 'vitest';
import {
  bscCapacity,
  shannonCapacity,
  gaussianCapacity,
  snrDbToLinear,
  becCapacity,
  bscTransition,
  becTransition,
  mutualInformation,
} from '@/lib/dsp/capacity';

describe('bscCapacity = 1 − H_b(ε)', () => {
  it('is 1 at ε=0 and ε=1, and 0 at ε=0.5 (book Fig. 9.7)', () => {
    expect(bscCapacity(0)).toBeCloseTo(1, 10);
    expect(bscCapacity(1)).toBeCloseTo(1, 10);
    expect(bscCapacity(0.5)).toBeCloseTo(0, 10);
  });
  it('is symmetric about ε=0.5', () => {
    expect(bscCapacity(0.1)).toBeCloseTo(bscCapacity(0.9), 10);
  });
});

describe('shannonCapacity = B·log2(1+SNR)', () => {
  it('equals B at SNR=1 (one bit per Hz)', () => {
    expect(shannonCapacity(1, 1)).toBeCloseTo(1, 10);
    expect(shannonCapacity(1000, 1)).toBeCloseTo(1000, 10);
  });
  it('increases monotonically with SNR', () => {
    expect(shannonCapacity(1, 10)).toBeGreaterThan(shannonCapacity(1, 1));
  });
});

describe('gaussianCapacity = 0.5·log2(1+P/Pn)', () => {
  it('is 0.5 bit/use at P=Pn', () => {
    expect(gaussianCapacity(1, 1)).toBeCloseTo(0.5, 10);
  });
});

describe('snrDbToLinear', () => {
  it('converts dB to linear power ratio', () => {
    expect(snrDbToLinear(0)).toBeCloseTo(1, 10);
    expect(snrDbToLinear(10)).toBeCloseTo(10, 10);
    expect(snrDbToLinear(20)).toBeCloseTo(100, 10);
  });
});

describe('becCapacity = 1 − p (binary erasure channel, Problem 9.2)', () => {
  it('is 1 with no erasures and 0 with certain erasure', () => {
    expect(becCapacity(0)).toBeCloseTo(1, 12);
    expect(becCapacity(1)).toBeCloseTo(0, 12);
    expect(becCapacity(0.2)).toBeCloseTo(0.8, 12);
  });
});

describe('mutualInformation I(X;Y) = H(Y) − H(Y|X) (Eq. 9.2.5)', () => {
  it('equals BSC capacity at a uniform input', () => {
    for (const eps of [0.05, 0.1, 0.25]) {
      const I = mutualInformation([0.5, 0.5], bscTransition(eps));
      expect(I).toBeCloseTo(bscCapacity(eps), 10);
    }
  });
  it('equals 1 − p for the BEC at a uniform input', () => {
    expect(mutualInformation([0.5, 0.5], becTransition(0.2))).toBeCloseTo(0.8, 10);
  });
  it('is 0 for a deterministic input', () => {
    expect(mutualInformation([1, 0], bscTransition(0.1))).toBeCloseTo(0, 12);
  });
  it('is maximized at P(X=0)=0.5 for the BSC', () => {
    const P = bscTransition(0.1);
    let best = 0;
    let bestVal = -1;
    for (let i = 0; i <= 100; i++) {
      const a = i / 100;
      const v = mutualInformation([a, 1 - a], P);
      if (v > bestVal) {
        bestVal = v;
        best = a;
      }
    }
    expect(best).toBeCloseTo(0.5, 2);
  });
});
