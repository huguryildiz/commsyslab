import { describe, it, expect } from 'vitest';
import { bscCapacity, shannonCapacity, gaussianCapacity, snrDbToLinear } from '@/lib/dsp/capacity';

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
