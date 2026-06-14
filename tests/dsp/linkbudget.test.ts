import { describe, it, expect } from 'vitest';
import {
  freeSpacePathLossDb,
  logDistancePathLossDb,
  hataUrbanPathLossDb,
} from '@/lib/dsp/linkbudget';

describe('freeSpacePathLossDb', () => {
  it('matches the 32.45 + 20log10(d_km) + 20log10(f_MHz) form (~91.5 dB at 1 km, 900 MHz)', () => {
    expect(freeSpacePathLossDb(900e6, 1000)).toBeCloseTo(91.53, 1);
  });
  it('increases 6 dB per doubling of distance', () => {
    const a = freeSpacePathLossDb(2.4e9, 1000);
    const b = freeSpacePathLossDb(2.4e9, 2000);
    expect(b - a).toBeCloseTo(6.02, 1);
  });
});

describe('logDistancePathLossDb', () => {
  it('equals free-space when the exponent n = 2', () => {
    expect(logDistancePathLossDb(900e6, 5000, 2, 1000)).toBeCloseTo(
      freeSpacePathLossDb(900e6, 5000),
      6,
    );
  });
  it('is higher than free-space for n > 2', () => {
    expect(logDistancePathLossDb(900e6, 5000, 3.5, 1000)).toBeGreaterThan(
      freeSpacePathLossDb(900e6, 5000),
    );
  });
});

describe('hataUrbanPathLossDb', () => {
  it('is in a sane band (~126 dB at 900 MHz, 1 km, hb=30, hm=1.5) and grows with distance', () => {
    const near = hataUrbanPathLossDb(900, 1, 30, 1.5);
    const far = hataUrbanPathLossDb(900, 10, 30, 1.5);
    expect(near).toBeGreaterThan(120);
    expect(near).toBeLessThan(132);
    expect(far).toBeGreaterThan(near);
  });
});
