import { describe, it, expect } from 'vitest';
import {
  lineCodeTemplate,
  isAntipodal,
  templateEnergy,
  lineCodeStream,
  correlatorRun,
  matchedFilterStream,
  decide,
  theoreticalPb,
  sampleNoiseSigma,
} from '@/lib/dsp/lcdetect';
import { qfunc } from '@/lib/dsp/math';

describe('lineCodeTemplate', () => {
  it('polar-nrz is a rectangular pulse of all ones', () => {
    expect(lineCodeTemplate('polar-nrz', 4)).toEqual([1, 1, 1, 1]);
  });
  it('manchester is +1 first half then -1 second half', () => {
    expect(lineCodeTemplate('manchester', 4)).toEqual([1, 1, -1, -1]);
  });
  it('polar-rz is +1 first half then 0', () => {
    expect(lineCodeTemplate('polar-rz', 4)).toEqual([1, 1, 0, 0]);
  });
  it('unipolar-nrz is a rectangular pulse of all ones', () => {
    expect(lineCodeTemplate('unipolar-nrz', 4)).toEqual([1, 1, 1, 1]);
  });
});

describe('isAntipodal', () => {
  it('is true for antipodal codes and false for OOK', () => {
    expect(isAntipodal('polar-nrz')).toBe(true);
    expect(isAntipodal('manchester')).toBe(true);
    expect(isAntipodal('polar-rz')).toBe(true);
    expect(isAntipodal('unipolar-nrz')).toBe(false);
  });
});

describe('templateEnergy', () => {
  it('equals sum of squared template samples', () => {
    expect(templateEnergy('polar-nrz', 4)).toBe(4);
    expect(templateEnergy('manchester', 4)).toBe(4);
    expect(templateEnergy('polar-rz', 4)).toBe(2);
  });
});

describe('lineCodeStream', () => {
  it('antipodal: bit 1 -> +template, bit 0 -> -template', () => {
    expect(lineCodeStream([1, 0], 'polar-nrz', 2)).toEqual([1, 1, -1, -1]);
    expect(lineCodeStream([1, 0], 'manchester', 2)).toEqual([1, -1, -1, 1]);
  });
  it('OOK: bit 1 -> +template, bit 0 -> zeros', () => {
    expect(lineCodeStream([1, 0], 'unipolar-nrz', 2)).toEqual([1, 1, 0, 0]);
  });
});

describe('correlatorRun', () => {
  it('clean antipodal signal reaches the symbol value at the sampling instant', () => {
    const x = lineCodeStream([1, 0], 'polar-nrz', 8);
    const { samples, sampleIdx, sampleT } = correlatorRun(x, 'polar-nrz', 8);
    expect(samples.length).toBe(2);
    expect(samples[0]).toBeCloseTo(1, 6);
    expect(samples[1]).toBeCloseTo(-1, 6);
    expect(sampleIdx).toEqual([7, 15]);
    expect(sampleT[0]).toBeCloseTo(7 / 8, 6);
  });
  it('manchester clean signal also resolves to +/-1', () => {
    const x = lineCodeStream([1, 0, 1], 'manchester', 8);
    const { samples } = correlatorRun(x, 'manchester', 8);
    expect(samples.map((s) => Math.round(s))).toEqual([1, -1, 1]);
  });
  it('OOK clean signal resolves to 1 and 0', () => {
    const x = lineCodeStream([1, 0], 'unipolar-nrz', 8);
    const { samples } = correlatorRun(x, 'unipolar-nrz', 8);
    expect(samples[0]).toBeCloseTo(1, 6);
    expect(samples[1]).toBeCloseTo(0, 6);
  });
});

describe('matchedFilterStream', () => {
  it('matched filter equals correlator at the sampling instants', () => {
    const x = lineCodeStream([1, 0, 1, 1], 'manchester', 8);
    const corr = correlatorRun(x, 'manchester', 8);
    const mf = matchedFilterStream(x, 'manchester', 8);
    expect(mf.samples.length).toBe(corr.samples.length);
    for (let k = 0; k < corr.samples.length; k++) {
      expect(mf.samples[k]).toBeCloseTo(corr.samples[k], 6);
    }
  });
});

describe('decide', () => {
  it('antipodal uses threshold 0; OOK uses threshold 0.5', () => {
    expect(decide([0.8, -0.3, 0.1], 'polar-nrz')).toEqual([1, 0, 1]);
    expect(decide([0.8, 0.3, 0.6], 'unipolar-nrz')).toEqual([1, 0, 1]);
  });
  it('recovers the transmitted bits from a clean correlator', () => {
    const bits = [1, 0, 0, 1, 1, 0, 1, 0];
    const x = lineCodeStream(bits, 'polar-rz', 8);
    const { samples } = correlatorRun(x, 'polar-rz', 8);
    expect(decide(samples, 'polar-rz')).toEqual(bits);
  });
});

describe('theoreticalPb', () => {
  it('antipodal uses sqrt(2 Eb/N0); OOK uses sqrt(Eb/N0)', () => {
    expect(theoreticalPb('polar-nrz', 7)).toBeCloseTo(qfunc(Math.sqrt(2 * 10 ** 0.7)), 9);
    expect(theoreticalPb('unipolar-nrz', 7)).toBeCloseTo(qfunc(Math.sqrt(10 ** 0.7)), 9);
  });
});

describe('sampleNoiseSigma', () => {
  it('is positive and decreases as Eb/N0 grows', () => {
    const hi = sampleNoiseSigma('polar-nrz', 12, 8);
    const lo = sampleNoiseSigma('polar-nrz', 4, 8);
    expect(hi).toBeGreaterThan(0);
    expect(lo).toBeGreaterThan(hi);
  });
});
