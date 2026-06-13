import { describe, it, expect } from 'vitest';
import { detectML, detectMAP, mapThreshold1D } from '@/lib/dsp/detector';

const pts = [[-1], [1]];

describe('detectML', () => {
  it('picks the nearest point', () => {
    expect(detectML([-0.3], pts)).toBe(0);
    expect(detectML([0.3], pts)).toBe(1);
  });
  it('works in 2-D', () => {
    const qpsk = [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ];
    expect(detectML([0.9, 0.1], qpsk)).toBe(0);
    expect(detectML([-0.1, 0.9], qpsk)).toBe(1);
  });
});

describe('detectMAP', () => {
  it('equals ML when priors are equal', () => {
    const priors = [0.5, 0.5];
    expect(detectMAP([-0.3], pts, priors, 1)).toBe(detectML([-0.3], pts));
    expect(detectMAP([0.3], pts, priors, 1)).toBe(detectML([0.3], pts));
  });
  it('biases toward the more-likely symbol', () => {
    const priors = [0.95, 0.05];
    expect(detectML([0.3], pts)).toBe(1);
    expect(detectMAP([0.3], pts, priors, 4)).toBe(0);
  });
});

describe('mapThreshold1D', () => {
  it('is the midpoint for equal priors', () => {
    expect(mapThreshold1D(-1, 1, 0.5, 0.5, 1)).toBeCloseTo(0, 12);
  });
  it('shifts toward the less-likely symbol as its prior shrinks', () => {
    const thr = mapThreshold1D(-1, 1, 0.8, 0.2, 1);
    expect(thr).toBeGreaterThan(0);
  });
});
