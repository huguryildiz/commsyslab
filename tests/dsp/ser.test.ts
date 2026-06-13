import { describe, it, expect } from 'vitest';
import { theoreticalSer, simulateSer, unionBoundSer } from '@/lib/dsp/ser';
import { makeConstellation } from '@/lib/dsp/modulation';
import { qfunc } from '@/lib/dsp/math';

describe('theoreticalSer (slide Pe formulas)', () => {
  it('BPSK = Q(sqrt(2*Eb/N0))', () => {
    const g = 10 ** (4 / 10);
    expect(theoreticalSer('bpsk', 2, 4)).toBeCloseTo(qfunc(Math.sqrt(2 * g)), 12);
  });
  it('BPSK is in a sane band at 4 dB and decreases with SNR', () => {
    const p4 = theoreticalSer('bpsk', 2, 4);
    expect(p4).toBeGreaterThan(0.011);
    expect(p4).toBeLessThan(0.014);
    expect(theoreticalSer('bpsk', 2, 8)).toBeLessThan(p4);
  });
  it('BASK/BFSK = Q(sqrt(Eb/N0))', () => {
    const g = 10 ** (6 / 10);
    expect(theoreticalSer('bask', 2, 6)).toBeCloseTo(qfunc(Math.sqrt(g)), 12);
    expect(theoreticalSer('bfsk', 2, 6)).toBeCloseTo(qfunc(Math.sqrt(g)), 12);
  });
  it('M-PSK = 2 Q(sqrt(2 log2M Eb/N0) sin(pi/M))', () => {
    const g = 10 ** (8 / 10);
    expect(theoreticalSer('mpsk', 8, 8)).toBeCloseTo(
      2 * qfunc(Math.sqrt(2 * 3 * g) * Math.sin(Math.PI / 8)),
      12,
    );
  });
  it('M-FSK = (M-1) Q(sqrt(log2M Eb/N0))', () => {
    const g = 10 ** (6 / 10);
    expect(theoreticalSer('mfsk', 4, 6)).toBeCloseTo((4 - 1) * qfunc(Math.sqrt(2 * g)), 12);
  });
  it('M-ASK = (2(M-1)/M) Q(sqrt(6 log2M Eb/N0 / (M^2-1)))', () => {
    const g = 10 ** (10 / 10);
    expect(theoreticalSer('mask', 4, 10)).toBeCloseTo(
      ((2 * 3) / 4) * qfunc(Math.sqrt((6 * 2 * g) / 15)),
      12,
    );
  });
  it('M-QAM = (4(sqrtM-1)/sqrtM) Q(sqrt(3 log2M Eb/N0 / (M-1)))', () => {
    const g = 10 ** (12 / 10);
    expect(theoreticalSer('mqam', 16, 12)).toBeCloseTo(
      ((4 * (4 - 1)) / 4) * qfunc(Math.sqrt((3 * 4 * g) / 15)),
      12,
    );
  });
});

describe('simulateSer (Monte-Carlo)', () => {
  it('BPSK simulated SER tracks the theoretical value', () => {
    const c = makeConstellation('bpsk', 2, 1);
    const r = simulateSer({
      constellation: c,
      ebN0Db: 4,
      numSymbols: 40000,
      decision: 'ml',
      seed: 12345,
    });
    expect(r.total).toBe(40000);
    expect(r.ser).toBeGreaterThan(0.009);
    expect(r.ser).toBeLessThan(0.017);
  });
  it('QPSK simulated SER is finite and below 1', () => {
    const c = makeConstellation('mpsk', 4, 1);
    const r = simulateSer({
      constellation: c,
      ebN0Db: 6,
      numSymbols: 20000,
      decision: 'ml',
      seed: 99,
    });
    expect(r.ser).toBeGreaterThanOrEqual(0);
    expect(r.ser).toBeLessThan(1);
  });
  it('MAP with equal priors matches ML detection counts', () => {
    const c = makeConstellation('bpsk', 2, 1);
    const common = { constellation: c, ebN0Db: 3, numSymbols: 10000, seed: 2024 } as const;
    const ml = simulateSer({ ...common, decision: 'ml' });
    const map = simulateSer({ ...common, decision: 'map', priors: [0.5, 0.5] });
    expect(map.errors).toBe(ml.errors);
  });
});

describe('unionBoundSer', () => {
  it('antipodal points reduce to Q(d/√(2N₀))', () => {
    // points ±1 ⇒ d = 2, d² = 4; with n0 = 1 ⇒ Q(√(4/2)) = Q(√2)
    expect(unionBoundSer([[1], [-1]], 1)).toBeCloseTo(qfunc(Math.sqrt(2)), 12);
  });

  it('matches the BPSK closed form for ±√Eb', () => {
    const eb = 1;
    const n0 = 0.5;
    const expected = qfunc(Math.sqrt((2 * eb) / n0)); // Q(√(2Eb/N0))
    expect(unionBoundSer([[Math.sqrt(eb)], [-Math.sqrt(eb)]], n0)).toBeCloseTo(expected, 12);
  });

  it('is clamped to at most 1 and 0 for a single point', () => {
    expect(unionBoundSer([[0]], 1)).toBe(0);
    expect(unionBoundSer([[0.01], [-0.01]], 1e-6)).toBeLessThanOrEqual(1);
  });
});
