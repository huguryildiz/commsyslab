import { describe, it, expect } from 'vitest';
import { shadowingPdfDb, rayleighOutage } from '@/lib/dsp/shadowing';

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
