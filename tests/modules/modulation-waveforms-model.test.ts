import { describe, it, expect } from 'vitest';
import { buildWaveforms, getSchemeInfo, SPS } from '@/modules/modulation/waveforms-model';
import type { Bit } from '@/lib/sim/sources';

describe('buildWaveforms — bit-driven symbols', () => {
  it('BPSK maps bit 1 → +1 and bit 0 → −1 (antipodal), Q ≈ 0', () => {
    const bits: Bit[] = [1, 0, 1, 0];
    const d = buildWaveforms({ scheme: 'bpsk', bits, ebN0Db: 30 });

    expect(d.symbols).toHaveLength(4);
    expect(d.symbols.map((s) => s.bitStr)).toEqual(['1', '0', '1', '0']);
    expect(d.N).toBe(4);

    // First sample of each symbol slot carries the clean I value
    expect(d.I[0 * SPS]).toBeCloseTo(+1, 6); // bit 1
    expect(d.I[1 * SPS]).toBeCloseTo(-1, 6); // bit 0
    expect(d.I[2 * SPS]).toBeCloseTo(+1, 6); // bit 1
    expect(d.I[3 * SPS]).toBeCloseTo(-1, 6); // bit 0
    for (let k = 0; k < 4; k++) expect(d.Q[k * SPS]).toBeCloseTo(0, 6);
  });

  it('QPSK groups 2 bits/symbol onto the unit circle', () => {
    const bits: Bit[] = [0, 0, 0, 1, 1, 0, 1, 1];
    const d = buildWaveforms({ scheme: 'qpsk', bits, ebN0Db: 30 });

    expect(d.symbols).toHaveLength(4);
    for (const s of d.symbols) expect(s.bitStr).toHaveLength(2);
    for (let k = 0; k < 4; k++) {
      const i = d.I[k * SPS];
      const q = d.Q[k * SPS];
      expect(Math.hypot(i, q)).toBeCloseTo(1, 6);
    }
  });

  it('16-QAM uses 4 bits/symbol and lands on {±1, ±1/3} levels', () => {
    expect(getSchemeInfo('16qam').bitsPerSymbol).toBe(4);
    const bits: Bit[] = [0, 0, 0, 0, 1, 1, 1, 1];
    const d = buildWaveforms({ scheme: '16qam', bits, ebN0Db: 40 });

    expect(d.symbols).toHaveLength(2);
    for (const s of d.symbols) expect(s.bitStr).toHaveLength(4);
    const levels = [-1, -1 / 3, 1 / 3, 1];
    for (let k = 0; k < 2; k++) {
      const i = d.I[k * SPS];
      const q = d.Q[k * SPS];
      expect(levels.some((l) => Math.abs(l - i) < 1e-6)).toBe(true);
      expect(levels.some((l) => Math.abs(l - q) < 1e-6)).toBe(true);
    }
  });

  it('2-FSK assigns distinct tone indices to bit 0 vs bit 1', () => {
    const d = buildWaveforms({ scheme: '2fsk', bits: [0, 1], ebN0Db: 40 });
    expect(d.symbols).toHaveLength(2);
    expect(d.symbols[0].index).not.toBe(d.symbols[1].index);
  });

  it('zero-pads a trailing partial symbol group', () => {
    // 3 bits with 2 bits/symbol → 2 symbols, last one padded
    const d = buildWaveforms({ scheme: 'qpsk', bits: [1, 0, 1], ebN0Db: 30 });
    expect(d.symbols).toHaveLength(2);
    expect(d.N).toBe(2);
    expect(d.symbols[1].bitStr).toBe('10'); // 1 + padded 0
  });

  it('symbols are independent of seed; noise (rf) is reproducible per seed', () => {
    const bits: Bit[] = [1, 1, 0, 0];
    const a = buildWaveforms({ scheme: 'bpsk', bits, ebN0Db: 5, seed: 7 });
    const b = buildWaveforms({ scheme: 'bpsk', bits, ebN0Db: 5, seed: 7 });
    const c = buildWaveforms({ scheme: 'bpsk', bits, ebN0Db: 5, seed: 9 });

    // Clean symbols identical regardless of seed
    expect(a.symbols.map((s) => s.bitStr)).toEqual(c.symbols.map((s) => s.bitStr));
    expect(a.I).toEqual(c.I);
    // Same seed → identical noisy RF; different seed → different
    expect(a.rf).toEqual(b.rf);
    expect(a.rf).not.toEqual(c.rf);
  });

  it('exposes a per-symbol detail string and mid-time for labels', () => {
    const d = buildWaveforms({ scheme: 'bpsk', bits: [1, 0], ebN0Db: 30 });
    expect(d.symbols[0].detail.length).toBeGreaterThan(0);
    expect(d.symbols[0].midT).toBeCloseTo(0.5, 6); // center of symbol 0 in symbol units
    expect(d.symbols[1].midT).toBeCloseTo(1.5, 6);
  });
});
