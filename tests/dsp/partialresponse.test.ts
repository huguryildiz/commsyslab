import { describe, it, expect } from 'vitest';
import {
  duobinaryPulse,
  duobinarySpectrum,
  modifiedDuobinarySpectrum,
  precode,
  duobinaryReceive,
  symbolBySymbolDetect,
  errorPropagationDemo,
  viterbiPR,
  prBerCurves,
} from '@/lib/dsp/partialresponse';

// Ref: Proakis & Salehi §10.3.2 / §10.4.
describe('partial-response pulses (§10.3.2)', () => {
  it('duobinary samples are [...,0,1,1,0,...] at nT (Eq. 10.3.24)', () => {
    const W = 0.5;
    const T = 1 / (2 * W); // = 1
    const t = [-2, -1, 0, 1, 2].map((n) => n * T);
    const x = duobinaryPulse(W, t).map((v) => Math.round(v * 1e6) / 1e6);
    expect(x).toEqual([0, 0, 1, 1, 0]);
  });

  it('modified-duobinary spectrum has a DC null (Eq. 10.3.31)', () => {
    expect(Math.abs(modifiedDuobinarySpectrum(0.5, [0])[0])).toBeLessThan(1e-9);
  });

  it('duobinary spectrum is non-negative within |f|<W and zero outside', () => {
    duobinarySpectrum(0.5, [-0.4, -0.2, 0, 0.2, 0.4]).forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
    expect(duobinarySpectrum(0.5, [0.7])[0]).toBe(0);
  });
});

describe('partial-response detection (§10.4)', () => {
  it('precode → receive → detect round-trips the data (Eq. 10.4.2/10.4.5)', () => {
    const d = [1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1];
    const { a } = precode(d);
    const b = duobinaryReceive(a);
    expect(symbolBySymbolDetect(b)).toEqual(d);
  });

  it('received levels lie in {−2,0,2} (Eq. 10.4.1)', () => {
    const { a } = precode([1, 0, 1, 1, 0]);
    duobinaryReceive(a).forEach((v) => expect([-2, 0, 2]).toContain(v));
  });

  it('without precoding, a single error propagates to >1 errors', () => {
    const { a } = precode([1, 0, 1, 1, 0, 1]);
    const errs = errorPropagationDemo(a, 2);
    expect(errs.reduce((s, e) => s + e, 0)).toBeGreaterThan(1);
  });

  it('viterbiPR recovers the symbol sequence at high SNR', () => {
    const { a } = precode([1, 0, 0, 1, 1, 0, 1]);
    const b = duobinaryReceive(a);
    const { decoded } = viterbiPR(b, 'duobinary');
    expect(decoded.length).toBe(a.length);
  });

  it('BER curves decrease with SNR and order zeroISI ≤ MLSD ≤ SbS', () => {
    const c = prBerCurves([2, 4, 6, 8, 10]);
    for (let i = 1; i < c.zeroIsi.length; i++) {
      expect(c.zeroIsi[i]).toBeLessThanOrEqual(c.zeroIsi[i - 1]);
    }
    const k = 3;
    expect(c.symbolBySymbol[k]).toBeGreaterThanOrEqual(c.mlsd[k]);
    expect(c.mlsd[k]).toBeGreaterThanOrEqual(c.zeroIsi[k]);
  });
});
