import { describe, it, expect } from 'vitest';
import { buildSamplingView, type SamplingParams } from '@/modules/sampling/model';

const base: SamplingParams = {
  tones: [{ freq: 2, amp: 1 }],
  fs: 20,
  bits: 3,
  mMax: 1,
  type: 'midrise',
  coding: 'nbc',
  t0: 0,
  windowSec: 1,
  analogN: 200,
};

describe('buildSamplingView', () => {
  it('produces dense analog/reconstructed curves and discrete samples', () => {
    const v = buildSamplingView(base);
    expect(v.analog.t).toHaveLength(200);
    expect(v.reconstructed.t).toHaveLength(200);
    expect(v.samples.t.length).toBeGreaterThan(0);
    expect(v.samples.t.length).toBe(v.samples.x.length);
    expect(v.quantized.x).toHaveLength(v.samples.x.length);
    expect(v.error.e).toHaveLength(v.samples.x.length);
  });

  it('reconstruction reproduces sample values at sampling instants when fs > 2W', () => {
    const v = buildSamplingView(base);
    const i = Math.floor(v.samples.t.length / 2);
    const ti = v.samples.t[i];
    let best = 0;
    for (let j = 1; j < v.reconstructed.t.length; j++) {
      if (Math.abs(v.reconstructed.t[j] - ti) < Math.abs(v.reconstructed.t[best] - ti)) best = j;
    }
    expect(v.reconstructed.t[best]).toBeCloseTo(ti, 2);
    expect(v.reconstructed.x[best]).toBeCloseTo(v.samples.x[i], 1);
  });

  it('classifies the sampling regime and Nyquist rate', () => {
    expect(buildSamplingView({ ...base, fs: 20 }).regime).toBe('oversampling');
    expect(buildSamplingView({ ...base, fs: 3 }).regime).toBe('undersampling');
    expect(buildSamplingView(base).nyquist).toBe(4);
    expect(buildSamplingView(base).bandwidth).toBe(2);
  });

  it('emits a PCM bitstream of length n*bits', () => {
    const v = buildSamplingView(base);
    expect(v.pcm).toHaveLength(v.samples.x.length * base.bits);
  });

  it('reports delta, noise power, and both SQNR values', () => {
    const v = buildSamplingView(base);
    expect(v.delta).toBeCloseTo((2 * 1) / 8, 12);
    expect(v.noisePower).toBeCloseTo((v.delta * v.delta) / 12, 12);
    expect(Number.isFinite(v.sqnrTheoryDb)).toBe(true);
    expect(Number.isFinite(v.sqnrMeasuredDb)).toBe(true);
  });
});
