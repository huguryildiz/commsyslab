import { describe, it, expect } from 'vitest';
import { outputSnrDb, demodulationGainDb, fmThresholdCnrDb, emphasisGainDb, addNoiseAtSnr, measuredSnrDb } from '@/lib/dsp/analognoise';
import { makeRng } from '@/lib/dsp/random';

const p = { amIndex: 0.5, beta: 5, messagePower: 0.5, emphasis: false, W: 15000 };

describe('outputSnrDb / demodulationGainDb', () => {
  it('DSB and SSB have unity gain (output SNR == channel SNR)', () => {
    expect(outputSnrDb('dsb', 20, p)).toBeCloseTo(20, 6);
    expect(outputSnrDb('ssb', 20, p)).toBeCloseTo(20, 6);
    expect(demodulationGainDb('dsb', p)).toBeCloseTo(0, 6);
    expect(demodulationGainDb('ssb', p)).toBeCloseTo(0, 6);
  });

  it('conventional AM loses SNR (gain < 0 dB) via modulation efficiency', () => {
    expect(demodulationGainDb('am', p)).toBeLessThan(0);
    // gain equals 10log10(efficiency); efficiency = a^2 P /(1 + a^2 P)
    const eff = (p.amIndex ** 2 * p.messagePower) / (1 + p.amIndex ** 2 * p.messagePower);
    expect(demodulationGainDb('am', p)).toBeCloseTo(10 * Math.log10(eff), 6);
  });

  it('FM output SNR scales as beta^2 (~+6 dB per doubling of beta)', () => {
    const a = outputSnrDb('fm', 30, { ...p, beta: 4 });
    const b = outputSnrDb('fm', 30, { ...p, beta: 8 });
    expect(b - a).toBeCloseTo(6.02, 1); // doubling beta → 4x SNR → +6.02 dB
  });

  it('FM gives a large positive demodulation gain at high beta', () => {
    expect(demodulationGainDb('fm', { ...p, beta: 5 })).toBeGreaterThan(10);
  });
});

describe('FM threshold & emphasis', () => {
  it('threshold CNR increases with beta (more bandwidth → higher threshold)', () => {
    expect(fmThresholdCnrDb(10)).toBeGreaterThan(fmThresholdCnrDb(2));
  });

  it('threshold CNR is a sane positive dB value', () => {
    const t = fmThresholdCnrDb(5);
    expect(t).toBeGreaterThan(5);
    expect(t).toBeLessThan(40);
  });

  it('pre/de-emphasis provides a positive SNR gain that grows with beta', () => {
    expect(emphasisGainDb(2, 15000)).toBeGreaterThan(0);
    expect(emphasisGainDb(10, 15000)).toBeGreaterThan(emphasisGainDb(2, 15000));
  });
});

describe('addNoiseAtSnr / measuredSnrDb', () => {
  const ref = Float64Array.from({ length: 4096 }, (_, n) => Math.sin((2 * Math.PI * 5 * n) / 256));

  it('measuredSnrDb of an identical signal is very high', () => {
    expect(measuredSnrDb(ref, ref)).toBeGreaterThan(100);
  });

  it('addNoiseAtSnr produces a signal whose measured SNR ~ target', () => {
    const rng = makeRng(7);
    const noisy = addNoiseAtSnr(ref, 10, rng);
    expect(noisy.length).toBe(ref.length);
    expect(measuredSnrDb(noisy, ref)).toBeCloseTo(10, 0); // within ~1 dB at this length
  });

  it('higher target SNR yields higher measured SNR', () => {
    const rng = makeRng(3);
    expect(measuredSnrDb(addNoiseAtSnr(ref, 20, rng), ref)).toBeGreaterThan(
      measuredSnrDb(addNoiseAtSnr(ref, 5, rng), ref),
    );
  });
});
