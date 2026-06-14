import { describe, it, expect } from 'vitest';
import {
  expandPiecewise,
  signalLabels,
  DEFAULT_CUSTOM_AMPLITUDES,
  CUSTOM_PRESETS,
} from '@/modules/modulation/custom-signals';

describe('expandPiecewise', () => {
  it('expands each row to exactly sps samples, holding each segment constant', () => {
    const out = expandPiecewise([[1, -1]], 6);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual([1, 1, 1, -1, -1, -1]);
  });

  it('puts the remainder on the last segment when sps is not divisible by L', () => {
    const out = expandPiecewise([[2, 5]], 5); // base=2, last gets 3
    expect(out[0]).toEqual([2, 2, 5, 5, 5]);
  });

  it('preserves total energy proportional to segment amplitudes', () => {
    const out = expandPiecewise([[1, 1, 0]], 9);
    expect(out[0]).toHaveLength(9);
    expect(out[0].reduce((s, x) => s + x * x, 0)).toBe(6); // six samples of 1
  });
});

describe('signalLabels', () => {
  it('produces subscripted s-labels', () => {
    expect(signalLabels(3)).toEqual(['s₁', 's₂', 's₃']);
  });
});

describe('presets', () => {
  it('default amplitudes are Proakis Example 7.1.1 (4 signals, 3 segments)', () => {
    expect(DEFAULT_CUSTOM_AMPLITUDES).toEqual([
      [1, 1, 0],
      [1, -1, 0],
      [-1, 1, 1],
      [1, 1, 1],
    ]);
    expect(CUSTOM_PRESETS.find((p) => p.id === 'example711')?.amplitudes).toEqual(
      DEFAULT_CUSTOM_AMPLITUDES,
    );
  });
});
