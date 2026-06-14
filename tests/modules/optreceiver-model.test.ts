import { describe, it, expect } from 'vitest';
import {
  OPT_RX_SIGNAL_SETS,
  buildOptRxView,
  simulateReception,
  monteCarloPe,
  type OptRxParams,
} from '@/modules/modulation/model';
import { makeRng } from '@/lib/sim/sources';

const base: OptRxParams = {
  signalSetId: 'binary',
  ebN0Db: 8,
  symbolIndex: 0,
  sps: 32,
  cycles: 4,
};

describe('buildOptRxView (1-D)', () => {
  it('lists the three 1-D signal sets', () => {
    expect(OPT_RX_SIGNAL_SETS.filter((s) => s.kind === '1d').map((s) => s.id)).toEqual([
      'binary',
      'pam4',
      'pam8',
    ]);
  });

  it('binary set: 2 points ascending, one threshold at 0, dim 1', () => {
    const v = buildOptRxView(base);
    expect(v.kind).toBe('1d');
    expect(v.dim).toBe(1);
    expect(v.M).toBe(2);
    expect(v.points).toHaveLength(2);
    expect(v.points[0][0]).toBeLessThan(v.points[1][0]);
    expect(v.thresholds).toHaveLength(1);
    expect(v.thresholds[0]).toBeCloseTo(0, 12);
  });

  it('4-PAM set: 4 points and 3 thresholds', () => {
    const v = buildOptRxView({ ...base, signalSetId: 'pam4' });
    expect(v.M).toBe(4);
    expect(v.points).toHaveLength(4);
    expect(v.thresholds).toHaveLength(3);
  });

  it('1-D basis is a single unit-energy pulse of length sps', () => {
    const v = buildOptRxView(base);
    expect(v.basis).toHaveLength(1);
    expect(v.basis[0]).toHaveLength(32);
    const energy = v.basis[0].reduce((s, x) => s + x * x, 0);
    expect(energy).toBeCloseTo(1, 12);
  });

  it('symbol energy = ‖point‖²; peakSnr = 2E/N0', () => {
    const v = buildOptRxView({ ...base, symbolIndex: 1 });
    const expectedEnergy = v.points[1][0] * v.points[1][0];
    expect(v.symbolEnergy).toBeCloseTo(expectedEnergy, 10);
    expect(v.peakSnr).toBeCloseTo((2 * v.symbolEnergy) / v.n0, 10);
  });

  it('theoretical Pe decreases as Eb/N0 grows', () => {
    const lo = buildOptRxView({ ...base, ebN0Db: 2 });
    const hi = buildOptRxView({ ...base, ebN0Db: 12 });
    expect(hi.theoreticalPe).toBeLessThan(lo.theoreticalPe);
  });
});

describe('simulateReception (1-D)', () => {
  it('branch statistic equals running-correlator end and matched-filter peak', () => {
    const v = buildOptRxView({ ...base, signalSetId: 'pam4', ebN0Db: 6, symbolIndex: 2, sps: 16 });
    const rx = simulateReception(v, 2, makeRng(5));
    expect(rx.received).toHaveLength(16);
    expect(rx.statistic).toHaveLength(1);
    expect(rx.branchMf).not.toBeNull();
    expect(rx.statistic[0]).toBeCloseTo(rx.branchCorr[0][rx.branchCorr[0].length - 1], 10);
    expect(rx.statistic[0]).toBeCloseTo(rx.branchMf![0][v.basis[0].length - 1], 10);
  });

  it('decides the transmitted symbol at very high SNR', () => {
    const v = buildOptRxView({ ...base, signalSetId: 'pam4', ebN0Db: 40, symbolIndex: 1, sps: 16 });
    const rx = simulateReception(v, 1, makeRng(9));
    expect(rx.decided).toBe(1);
  });
});

describe('monteCarloPe', () => {
  it('counts the requested number of trials', () => {
    const v = buildOptRxView({ ...base, signalSetId: 'binary', sps: 8 });
    const r = monteCarloPe(v, 500, makeRng(1));
    expect(r.total).toBe(500);
    expect(r.errors).toBeGreaterThanOrEqual(0);
    expect(r.errors).toBeLessThanOrEqual(500);
  });

  it('produces fewer errors at higher Eb/N0', () => {
    const lo = buildOptRxView({ ...base, ebN0Db: 2, sps: 8 });
    const hi = buildOptRxView({ ...base, ebN0Db: 12, sps: 8 });
    const peLo = monteCarloPe(lo, 5000, makeRng(3)).errors;
    const peHi = monteCarloPe(hi, 5000, makeRng(3)).errors;
    expect(peHi).toBeLessThan(peLo);
  });
});

describe('buildOptRxView (2-D PSK/QAM)', () => {
  it('QPSK: kind 2d, dim 2, 4 points, two orthonormal carrier basis', () => {
    const v = buildOptRxView({
      signalSetId: 'qpsk',
      ebN0Db: 8,
      symbolIndex: 0,
      sps: 64,
      cycles: 4,
    });
    expect(v.kind).toBe('2d');
    expect(v.dim).toBe(2);
    expect(v.M).toBe(4);
    expect(v.points).toHaveLength(4);
    expect(v.points[0]).toHaveLength(2);
    expect(v.thresholds).toHaveLength(0);
    const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
    expect(dot(v.basis[0], v.basis[0])).toBeCloseTo(1, 9);
    expect(dot(v.basis[0], v.basis[1])).toBeCloseTo(0, 9);
  });

  it('QPSK reception: 2-component statistic, correct decision at high SNR', () => {
    const v = buildOptRxView({
      signalSetId: 'qpsk',
      ebN0Db: 40,
      symbolIndex: 2,
      sps: 64,
      cycles: 4,
    });
    const rx = simulateReception(v, 2, makeRng(7));
    expect(rx.statistic).toHaveLength(2);
    expect(rx.branchMf).toBeNull();
    expect(rx.decided).toBe(2);
  });

  it('16-QAM: kind 2d, 16 points; Monte-Carlo Pe drops with Eb/N0', () => {
    const lo = buildOptRxView({ signalSetId: 'qam16', ebN0Db: 4, symbolIndex: 0, sps: 64, cycles: 4 });
    const hi = buildOptRxView({ signalSetId: 'qam16', ebN0Db: 16, symbolIndex: 0, sps: 64, cycles: 4 });
    expect(lo.M).toBe(16);
    expect(lo.kind).toBe('2d');
    const peLo = monteCarloPe(lo, 4000, makeRng(2)).errors;
    const peHi = monteCarloPe(hi, 4000, makeRng(2)).errors;
    expect(peHi).toBeLessThan(peLo);
  });
});

describe('buildOptRxView (orthogonal FSK)', () => {
  it('4-FSK: kind orthogonal, dim 4, 4 orthonormal tone basis', () => {
    const v = buildOptRxView({ signalSetId: 'fsk4', ebN0Db: 8, symbolIndex: 0, sps: 64, cycles: 2 });
    expect(v.kind).toBe('orthogonal');
    expect(v.dim).toBe(4);
    expect(v.M).toBe(4);
    expect(v.basis).toHaveLength(4);
    const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
    expect(dot(v.basis[0], v.basis[0])).toBeCloseTo(1, 9);
    expect(dot(v.basis[0], v.basis[1])).toBeCloseTo(0, 9);
  });

  it('4-FSK reception: M-component statistic, decision = argmax at high SNR', () => {
    const v = buildOptRxView({ signalSetId: 'fsk4', ebN0Db: 40, symbolIndex: 3, sps: 64, cycles: 2 });
    const rx = simulateReception(v, 3, makeRng(11));
    expect(rx.statistic).toHaveLength(4);
    let argmax = 0;
    for (let k = 1; k < 4; k++) if (rx.statistic[k] > rx.statistic[argmax]) argmax = k;
    expect(rx.decided).toBe(3);
    expect(argmax).toBe(3);
  });

  it('BFSK: kind orthogonal, dim 2; Monte-Carlo Pe drops with Eb/N0', () => {
    const lo = buildOptRxView({ signalSetId: 'bfsk', ebN0Db: 2, symbolIndex: 0, sps: 64, cycles: 2 });
    const hi = buildOptRxView({ signalSetId: 'bfsk', ebN0Db: 12, symbolIndex: 0, sps: 64, cycles: 2 });
    expect(lo.dim).toBe(2);
    const peLo = monteCarloPe(lo, 5000, makeRng(4)).errors;
    const peHi = monteCarloPe(hi, 5000, makeRng(4)).errors;
    expect(peHi).toBeLessThan(peLo);
  });
});

describe('buildOptRxView (custom / Gram-Schmidt)', () => {
  it('default custom set reproduces Example 7.1.1: M=4, dim=3, s₄ dependent', () => {
    const v = buildOptRxView({ ...base, signalSetId: 'custom' });
    expect(v.kind).toBe('custom');
    expect(v.M).toBe(4);
    expect(v.dim).toBe(3);
    expect(v.points).toHaveLength(4);
    expect(v.points[0]).toHaveLength(3);
    expect(v.labels).toEqual(['s₁', 's₂', 's₃', 's₄']);
    expect(v.dependent).toEqual([false, false, false, true]);
    expect(v.basis).toHaveLength(3);
    expect(v.basis[0]).toHaveLength(base.sps);
  });

  it('derives Eb/N0 from the set energy and a valid union-bound Pₑ', () => {
    const v = buildOptRxView({ ...base, signalSetId: 'custom', ebN0Db: 8 });
    expect(v.sigmaW).toBeGreaterThan(0);
    expect(v.theoreticalPe).toBeGreaterThan(0);
    expect(v.theoreticalPe).toBeLessThanOrEqual(1);
  });

  it('explicit orthogonal pair → dim 2 and a constellation-plane view', () => {
    const v = buildOptRxView({
      ...base,
      signalSetId: 'custom',
      custom: {
        amplitudes: [
          [1, 1],
          [1, -1],
        ],
      },
    });
    expect(v.dim).toBe(2);
    expect(v.M).toBe(2);
    expect(v.dependent).toEqual([false, false]);
  });

  it('1-D custom set sorts points ascending with midpoint thresholds', () => {
    const v = buildOptRxView({
      ...base,
      signalSetId: 'custom',
      custom: {
        amplitudes: [
          [2, 2],
          [-2, -2],
        ],
      },
    });
    expect(v.dim).toBe(1);
    expect(v.points[0][0]).toBeLessThan(v.points[1][0]);
    expect(v.thresholds).toHaveLength(1);
    expect(v.thresholds[0]).toBeCloseTo(0, 10);
  });

  it('Monte-Carlo runs on the derived constellation', () => {
    const v = buildOptRxView({ ...base, signalSetId: 'custom' });
    const r = monteCarloPe(v, 200, makeRng(7));
    expect(r.total).toBe(200);
    expect(r.errors).toBeGreaterThanOrEqual(0);
    const rec = simulateReception(v, 0, makeRng(3));
    expect(rec.statistic).toHaveLength(v.dim);
  });
});
