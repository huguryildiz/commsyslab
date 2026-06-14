import { describe, it, expect } from 'vitest';
import { shadowingPdfDb, rayleighOutage, compositeOutage } from '@/lib/dsp/shadowing';

describe('shadowingPdfDb', () => {
  it('is a normal PDF in the dB domain (peaks at the mean, integrates to ~1)', () => {
    const muDb = 0;
    const sigmaDb = 8;
    // peak at the mean
    expect(shadowingPdfDb(0, muDb, sigmaDb)).toBeGreaterThan(shadowingPdfDb(8, muDb, sigmaDb));
    // numeric integral over a wide range ≈ 1
    let area = 0;
    const dx = 0.05;
    for (let x = -40; x < 40; x += dx) area += shadowingPdfDb(x, muDb, sigmaDb) * dx;
    expect(area).toBeCloseTo(1, 2);
  });
});

describe('rayleighOutage', () => {
  it('equals 1 - exp(-gamma_th/gamma_bar) in linear ratios', () => {
    const gammaThDb = 3;
    const gammaBarDb = 10;
    const gth = 10 ** (gammaThDb / 10);
    const gbar = 10 ** (gammaBarDb / 10);
    expect(rayleighOutage(gammaThDb, gammaBarDb)).toBeCloseTo(1 - Math.exp(-gth / gbar), 12);
  });
  it('drops toward 0 as the average SNR rises far above the threshold', () => {
    expect(rayleighOutage(0, 30)).toBeLessThan(rayleighOutage(0, 10));
    expect(rayleighOutage(0, 30)).toBeGreaterThan(0);
  });
});

describe('compositeOutage', () => {
  it('reduces to the plain Rayleigh outage when sigmaDb = 0', () => {
    expect(compositeOutage(3, 10, 0)).toBeCloseTo(rayleighOutage(3, 10), 6);
  });
  it('is a probability in [0,1] for typical shadowing', () => {
    const p = compositeOutage(5, 12, 8);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });
  it('shadowing raises outage when the median margin over threshold is modest', () => {
    // median average SNR only ~5 dB above threshold: shadowing variability hurts
    const noShadow = compositeOutage(5, 10, 0);
    const shadow = compositeOutage(5, 10, 8);
    expect(shadow).toBeGreaterThan(noShadow);
  });
});
