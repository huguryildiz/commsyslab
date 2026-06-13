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
  awgnHardCrossover,
  awgnSoftCapacityPerUse,
  biAwgnCapacityPerUse,
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

describe('awgnHardCrossover = Q(√(2·Eb/N0)) (Eq. 9.1.2)', () => {
  it('is 0.5 at Eb/N0=0 and decreases as Eb/N0 grows', () => {
    expect(awgnHardCrossover(0)).toBeCloseTo(0.5, 10);
    expect(awgnHardCrossover(4)).toBeLessThan(awgnHardCrossover(1));
  });
});

describe('awgnSoftCapacityPerUse = ½log2(1+2·Eb/N0) (Eq. 9.2.15)', () => {
  it('is 0 at Eb/N0=0 and 0.5 bit/use at Eb/N0=0.5', () => {
    expect(awgnSoftCapacityPerUse(0)).toBeCloseTo(0, 12);
    expect(awgnSoftCapacityPerUse(0.5)).toBeCloseTo(0.5, 12);
  });
});

describe('biAwgnCapacityPerUse (binary-input AWGN capacity, Problem 9.5)', () => {
  it('is ~0 at Eb/N0=0 and approaches 1 bit/use at high Eb/N0', () => {
    expect(biAwgnCapacityPerUse(0)).toBeCloseTo(0, 4);
    expect(biAwgnCapacityPerUse(100)).toBeGreaterThan(0.99);
  });
  it('is monotone increasing in Eb/N0', () => {
    expect(biAwgnCapacityPerUse(2)).toBeGreaterThan(biAwgnCapacityPerUse(1));
    expect(biAwgnCapacityPerUse(1)).toBeGreaterThan(biAwgnCapacityPerUse(0.5));
  });
  it('never exceeds the unconstrained Gaussian capacity', () => {
    expect(biAwgnCapacityPerUse(1)).toBeLessThan(awgnSoftCapacityPerUse(1));
    expect(biAwgnCapacityPerUse(1)).toBeGreaterThan(0);
  });
});
