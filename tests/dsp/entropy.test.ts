import { describe, it, expect } from 'vitest';
import {
  selfInfo,
  entropy,
  maxEntropy,
  binaryEntropy,
  extendedEntropy,
  jointEntropy,
  marginals,
  conditionalEntropies,
  mutualInformationJoint,
} from '@/lib/dsp/entropy';

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

describe('joint / conditional / mutual information', () => {
  // Book Example 12.1.6: pxy[x][y], P(0,0)=1/4, P(0,1)=1/4, P(1,0)=0, P(1,1)=1/2.
  const ex616 = [
    [0.25, 0.25],
    [0, 0.5],
  ];
  // Book Example 12.1.7: uniform on (0,0),(1,0),(0,1).
  const ex617 = [
    [1 / 3, 1 / 3],
    [1 / 3, 0],
  ];

  it('joint entropy matches Example 12.1.6 (H(X,Y)=1.5)', () => {
    expect(jointEntropy(ex616)).toBeCloseTo(1.5, 6);
  });

  it('marginals match Example 12.1.6', () => {
    const { px, py } = marginals(ex616);
    expect(px).toEqual([0.5, 0.5]);
    expect(py[0]).toBeCloseTo(0.25, 6);
    expect(py[1]).toBeCloseTo(0.75, 6);
  });

  it('conditional entropies match Example 12.1.6 (H(Y|X)=0.5, H(X|Y)=0.6887)', () => {
    const { hXgivenY, hYgivenX } = conditionalEntropies(ex616);
    expect(hYgivenX).toBeCloseTo(0.5, 4);
    expect(hXgivenY).toBeCloseTo(0.6887, 4);
  });

  it('mutual information matches Example 12.1.6 (I=0.3113) and 12.1.7 (I=0.2516)', () => {
    expect(mutualInformationJoint(ex616)).toBeCloseTo(0.3113, 4);
    expect(mutualInformationJoint(ex617)).toBeCloseTo(0.2516, 4);
  });

  it('mutual information is zero for an independent joint', () => {
    const indep = [
      [0.25, 0.25],
      [0.25, 0.25],
    ];
    expect(mutualInformationJoint(indep)).toBeCloseTo(0, 10);
  });
});
