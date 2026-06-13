import { describe, it, expect } from 'vitest';
import { ebN0Linear, n0FromEbN0Db, sigmaFromN0, gaussian, addAwgn } from '@/lib/dsp/awgn';
import { makeRng } from '@/lib/sim/sources';

describe('Eb/N0 helpers', () => {
  it('converts dB to linear', () => {
    expect(ebN0Linear(0)).toBeCloseTo(1, 12);
    expect(ebN0Linear(10)).toBeCloseTo(10, 9);
    expect(ebN0Linear(3)).toBeCloseTo(1.9953, 3);
  });
  it('N0 = Eb / (Eb/N0)_lin', () => {
    expect(n0FromEbN0Db(0, 1)).toBeCloseTo(1, 12);
    expect(n0FromEbN0Db(10, 1)).toBeCloseTo(0.1, 9);
  });
  it('sigma = sqrt(N0/2)', () => {
    expect(sigmaFromN0(2)).toBeCloseTo(1, 12);
    expect(sigmaFromN0(0.5)).toBeCloseTo(0.5, 12);
  });
});

describe('gaussian (Box-Muller, standard normal)', () => {
  it('has mean ~0 and variance ~1 over many seeded draws', () => {
    const rng = makeRng(12345);
    const N = 20000;
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < N; i++) {
      const z = gaussian(rng);
      sum += z;
      sumSq += z * z;
    }
    const mean = sum / N;
    const varr = sumSq / N - mean * mean;
    expect(Math.abs(mean)).toBeLessThan(0.05);
    expect(Math.abs(varr - 1)).toBeLessThan(0.06);
  });
});

describe('addAwgn', () => {
  it('returns a vector of the same dimension', () => {
    const rng = makeRng(7);
    const out = addAwgn([1, -1], 0.3, rng);
    expect(out).toHaveLength(2);
  });
  it('with sigma=0 returns the input unchanged', () => {
    const rng = makeRng(7);
    expect(addAwgn([2, -3, 0.5], 0, rng)).toEqual([2, -3, 0.5]);
  });
});
