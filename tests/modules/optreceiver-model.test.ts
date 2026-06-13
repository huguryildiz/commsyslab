import { describe, it, expect } from 'vitest';
import {
  OPT_RX_SIGNAL_SETS,
  buildOptRxView,
  simulateReception,
  monteCarloPe,
  type OptRxParams,
} from '@/modules/modulation/model';
import { makeRng } from '@/lib/sim/sources';

const base: OptRxParams = { signalSetId: 'binary', ebN0Db: 8, symbolIndex: 0, sps: 32 };

describe('buildOptRxView', () => {
  it('exposes three 1-D signal sets', () => {
    expect(OPT_RX_SIGNAL_SETS.map((s) => s.id)).toEqual(['binary', 'pam4', 'pam8']);
  });

  it('binary set has 2 amplitudes ascending and one threshold at 0', () => {
    const v = buildOptRxView(base);
    expect(v.M).toBe(2);
    expect(v.amplitudes).toHaveLength(2);
    expect(v.amplitudes[0]).toBeLessThan(v.amplitudes[1]);
    expect(v.thresholds).toHaveLength(1);
    expect(v.thresholds[0]).toBeCloseTo(0, 12);
  });

  it('4-PAM set has 4 amplitudes and 3 thresholds', () => {
    const v = buildOptRxView({ ...base, signalSetId: 'pam4' });
    expect(v.M).toBe(4);
    expect(v.amplitudes).toHaveLength(4);
    expect(v.thresholds).toHaveLength(3);
  });

  it('basis is unit energy and length sps', () => {
    const v = buildOptRxView(base);
    expect(v.basis).toHaveLength(32);
    const energy = v.basis.reduce((s, x) => s + x * x, 0);
    expect(energy).toBeCloseTo(1, 12);
  });

  it('symbol waveform = amplitude × basis; peakSnr = 2E/N0', () => {
    const v = buildOptRxView({ ...base, symbolIndex: 1 });
    const expectedEnergy = v.amplitudes[1] * v.amplitudes[1];
    expect(v.symbolEnergy).toBeCloseTo(expectedEnergy, 10);
    expect(v.peakSnr).toBeCloseTo((2 * v.symbolEnergy) / v.n0, 10);
  });

  it('theoretical Pe decreases as Eb/N0 grows', () => {
    const lo = buildOptRxView({ ...base, ebN0Db: 2 });
    const hi = buildOptRxView({ ...base, ebN0Db: 12 });
    expect(hi.theoreticalPe).toBeLessThan(lo.theoreticalPe);
  });
});

describe('simulateReception', () => {
  it('statistic equals running-correlator end and matched-filter peak', () => {
    const v = buildOptRxView({ signalSetId: 'pam4', ebN0Db: 6, symbolIndex: 2, sps: 16 });
    const rx = simulateReception(v, 2, makeRng(5));
    expect(rx.received).toHaveLength(16);
    expect(rx.statistic).toBeCloseTo(rx.runningCorr[rx.runningCorr.length - 1], 10);
    expect(rx.statistic).toBeCloseTo(rx.mfOutput[v.basis.length - 1], 10);
  });

  it('decides the transmitted symbol at very high SNR', () => {
    const v = buildOptRxView({ signalSetId: 'pam4', ebN0Db: 40, symbolIndex: 1, sps: 16 });
    const rx = simulateReception(v, 1, makeRng(9));
    expect(rx.decided).toBe(1);
  });
});

describe('monteCarloPe', () => {
  it('counts the requested number of trials', () => {
    const v = buildOptRxView({ signalSetId: 'binary', ebN0Db: 8, symbolIndex: 0, sps: 8 });
    const r = monteCarloPe(v, 500, makeRng(1));
    expect(r.total).toBe(500);
    expect(r.errors).toBeGreaterThanOrEqual(0);
    expect(r.errors).toBeLessThanOrEqual(500);
  });

  it('produces fewer errors at higher Eb/N0', () => {
    const lo = buildOptRxView({ signalSetId: 'binary', ebN0Db: 2, symbolIndex: 0, sps: 8 });
    const hi = buildOptRxView({ signalSetId: 'binary', ebN0Db: 12, symbolIndex: 0, sps: 8 });
    const peLo = monteCarloPe(lo, 5000, makeRng(3)).errors;
    const peHi = monteCarloPe(hi, 5000, makeRng(3)).errors;
    expect(peHi).toBeLessThan(peLo);
  });
});
