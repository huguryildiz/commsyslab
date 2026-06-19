import { describe, it, expect } from 'vitest';
import {
  freeSpacePathLossDb,
  logDistancePathLossDb,
  hataUrbanPathLossDb,
  thermalNoiseDbm,
  noiseFloorDbm,
  receivedPowerDbm,
  fadeMarginDb,
  noiseFloorN0,
  thermalNoisePower,
  noiseFigureToTemp,
  tempToNoiseFigure,
  friisCascade,
  cableLossDb,
  repeaterChainSnrDb,
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

// ── Analog-noise Ch 6.4: thermal noise, noise figure/Friis, repeaters ─────────

describe('thermal noise — linear power (§6.4.1)', () => {
  it('N0 = kT ≈ 4.0e-21 W/Hz at 290 K', () => {
    expect(noiseFloorN0(290) / 1e-21).toBeCloseTo(4.0, 1);
  });
  it('P_n = kTB scales linearly with B', () => {
    expect(thermalNoisePower(290, 2000)).toBeCloseTo(2 * thermalNoisePower(290, 1000), 30);
  });
});

describe('noise figure / temperature (§6.4.2)', () => {
  it('Te = T0(F-1): F=2 → 290 K', () => {
    expect(noiseFigureToTemp(2)).toBeCloseTo(290, 6);
  });
  it('F = 1 + Te/T0 inverts noiseFigureToTemp', () => {
    expect(tempToNoiseFigure(290)).toBeCloseTo(2, 6);
  });
  it('Friis: 3 stages of G=5 (≈6.99 dB), F=6 (≈7.78 dB) → F=7.2', () => {
    const g = 10 * Math.log10(5);
    const f = 10 * Math.log10(6);
    const r = friisCascade([
      { gainDb: g, noiseFigureDb: f },
      { gainDb: g, noiseFigureDb: f },
      { gainDb: g, noiseFigureDb: f },
    ]);
    expect(r.F).toBeCloseTo(7.2, 4);
  });
  it('Friis is first-stage dominated', () => {
    const lo = { gainDb: 20, noiseFigureDb: 1 };
    const hi = { gainDb: 20, noiseFigureDb: 10 };
    expect(friisCascade([lo, hi]).F).toBeLessThan(friisCascade([hi, lo]).F);
  });
});

describe('transmission loss & repeaters (§6.4.3–§6.4.4)', () => {
  it('free-space loss rises 6 dB per doubling of distance', () => {
    expect(freeSpacePathLossDb(1e6, 2000) - freeSpacePathLossDb(1e6, 1000)).toBeCloseTo(6.02, 1);
  });
  it('cable loss is linear in length', () => {
    expect(cableLossDb(20, 2)).toBeCloseTo(40, 6);
  });
  it('repeater SNR drops with more segments; +3 dB Pt offsets doubling K', () => {
    const base = { perSegLossDb: 20, faDb: 5, tempK: 290, bandwidthHz: 4000 };
    const s1 = repeaterChainSnrDb({ ...base, ptDbW: -100, segments: 10 });
    const s2 = repeaterChainSnrDb({ ...base, ptDbW: -100, segments: 20 });
    expect(s2).toBeLessThan(s1);
    // doubling K costs 10·log10(2) ≈ 3.01 dB, so ~+3 dB of Pt roughly restores the SNR
    expect(repeaterChainSnrDb({ ...base, ptDbW: -97, segments: 20 })).toBeCloseTo(s1, 1);
  });
});
