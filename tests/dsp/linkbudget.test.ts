import { describe, it, expect } from 'vitest';
import {
  freeSpacePathLossDb,
  logDistancePathLossDb,
  hataUrbanPathLossDb,
  thermalNoiseDbm,
  noiseFloorDbm,
  receivedPowerDbm,
  fadeMarginDb,
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

describe('thermalNoiseDbm', () => {
  it('is ≈ −174 dBm/Hz at 290 K and scales 10·log10(B)', () => {
    expect(thermalNoiseDbm(1, 290)).toBeCloseTo(-173.98, 1);
    expect(thermalNoiseDbm(1e6, 290)).toBeCloseTo(-113.98, 1);
  });
});

describe('noiseFloorDbm', () => {
  it('adds the noise figure on top of thermal noise', () => {
    expect(noiseFloorDbm(1e6, 290, 7)).toBeCloseTo(thermalNoiseDbm(1e6, 290) + 7, 9);
  });
});

describe('receivedPowerDbm', () => {
  it('is Tx + gains − path loss − other losses', () => {
    expect(receivedPowerDbm(43, 15, 0, 130, 2)).toBeCloseTo(43 + 15 + 0 - 130 - 2, 9);
  });
});

describe('fadeMarginDb', () => {
  it('is 0 for σ = 0 and for a 50% outage target', () => {
    expect(fadeMarginDb(0, 0.1)).toBe(0);
    expect(fadeMarginDb(8, 0.5)).toBeCloseTo(0, 6);
  });
  it('is σ·Q⁻¹(P_out) (~10.25 dB at σ=8, P_out=0.1) and grows as outage tightens', () => {
    expect(fadeMarginDb(8, 0.1)).toBeCloseTo(10.25, 1);
    expect(fadeMarginDb(8, 0.01)).toBeGreaterThan(fadeMarginDb(8, 0.1));
  });
});
