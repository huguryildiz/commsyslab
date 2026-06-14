import { describe, it, expect } from 'vitest';
import { cpfskPhase, cpfskPhaseTree, mskPsdDb, qpskPsdDb } from '@/lib/dsp/cpm';

describe('cpfskPhase', () => {
  it('changes phase by exactly ±πh per symbol and stays continuous', () => {
    const sps = 16;
    const h = 0.5;
    const phi = cpfskPhase([1, -1], h, sps);
    expect(phi.length).toBe(2 * sps);
    // After the first symbol the accumulated terminal phase is πh·(+1).
    const startSym2 = phi[sps];
    expect(startSym2).toBeCloseTo(Math.PI * h, 6);
    // No sample-to-sample jump exceeds the per-sample increment (continuity).
    const maxStep = (Math.PI * h) / sps;
    for (let i = 1; i < phi.length; i++) {
      expect(Math.abs(phi[i] - phi[i - 1])).toBeLessThanOrEqual(maxStep + 1e-9);
    }
  });
  it('MSK (h=0.5) terminal phase per symbol is a multiple of π/2', () => {
    const sps = 8;
    const phi = cpfskPhase([1, 1, -1, 1], 0.5, sps);
    // Terminal phase after k symbols is at index k·sps (start of next symbol).
    for (let k = 1; k < 4; k++) {
      const term = phi[k * sps] ?? phi[phi.length - 1];
      const ratio = term / (Math.PI / 2);
      expect(Math.abs(ratio - Math.round(ratio))).toBeLessThan(1e-6);
    }
  });
});

describe('cpfskPhaseTree', () => {
  it('has 2^depth trajectories', () => {
    expect(cpfskPhaseTree(0.5, 8, 3)).toHaveLength(8);
    expect(cpfskPhaseTree(0.5, 8, 1)).toHaveLength(2);
  });
});

describe('PSD comparison', () => {
  it('both peak at 0 dB at f=0', () => {
    expect(mskPsdDb(0)).toBeCloseTo(0, 6);
    expect(qpskPsdDb(0)).toBeCloseTo(0, 6);
  });
  it('MSK out-of-band sidelobe energy is far below QPSK (faster roll-off)', () => {
    // Integrate the linear PSD tail (fT in [1, 5]); pointwise comparison is
    // unfair because the two have nulls at different frequencies.
    let mskTail = 0;
    let qpskTail = 0;
    for (let fT = 1; fT <= 5; fT += 0.01) {
      mskTail += 10 ** (mskPsdDb(fT) / 10);
      qpskTail += 10 ** (qpskPsdDb(fT) / 10);
    }
    expect(mskTail).toBeLessThan(qpskTail);
    expect(mskTail * 5).toBeLessThan(qpskTail); // MSK tail is several times smaller
  });
  it('MSK PSD is finite at the fT=1/4 removable singularity', () => {
    expect(Number.isFinite(mskPsdDb(0.25))).toBe(true);
    expect(mskPsdDb(0.25)).toBeCloseTo(10 * Math.log10((Math.PI / 4) ** 2), 4);
  });
});
