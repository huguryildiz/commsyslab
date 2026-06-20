import { describe, it, expect } from 'vitest';
import {
  psk8,
  psk8Distance,
  minIntraDistance,
  SET_PARTITION,
  partitionDistances,
  asymptoticGainDb,
  MOD_LOSS_DB,
} from '@/lib/dsp/tcm';

describe('trellis-coded modulation set partitioning (§13.7.2)', () => {
  it('8-PSK points have unit energy', () => {
    for (let i = 0; i < 8; i++) {
      const p = psk8(i);
      expect(Math.hypot(p.x, p.y)).toBeCloseTo(1, 10);
    }
  });

  it('adjacent 8-PSK distance is 2·sin(π/8)', () => {
    expect(psk8Distance(0, 1)).toBeCloseTo(2 * Math.sin(Math.PI / 8), 10);
  });

  it('set partition halves subset count and doubles per level (8→2×4→4×2→8×1)', () => {
    expect(SET_PARTITION.map((l) => l.subsets.length)).toEqual([1, 2, 4, 8]);
    // every level partitions all 8 points exactly once
    for (const lvl of SET_PARTITION) {
      expect(lvl.subsets.flat().sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    }
  });

  it('intra-subset minimum distance grows: Δ0 < Δ1 < Δ2 = [2sin(π/8), √2, 2]', () => {
    const [d0, d1, d2] = partitionDistances();
    expect(d0).toBeCloseTo(2 * Math.sin(Math.PI / 8), 10);
    expect(d1).toBeCloseTo(Math.SQRT2, 10);
    expect(d2).toBeCloseTo(2, 10);
    expect(d0).toBeLessThan(d1);
    expect(d1).toBeLessThan(d2);
  });

  it('minIntraDistance of a singleton is infinite', () => {
    expect(minIntraDistance([3])).toBe(Infinity);
  });

  it('QPSK→8-PSK modulation loss is ≈ 5.33 dB; gain helper is 10log10 ratio', () => {
    expect(MOD_LOSS_DB).toBeCloseTo(5.33, 1);
    expect(asymptoticGainDb(4, 2)).toBeCloseTo(3.01, 2);
  });
});
