import { describe, it, expect } from 'vitest';
import { eyeTraces, eyeMetrics, isiEyePatterns } from '@/lib/dsp/eye';
import { convolve } from '@/lib/dsp/matchedfilter';

// A clean 2-PAM signal: symbols ±1 held for sps samples each.
function heldSignal(levels: number[], sps: number): number[] {
  const out: number[] = [];
  for (const a of levels) for (let i = 0; i < sps; i++) out.push(a);
  return out;
}

describe('eyeTraces', () => {
  it('slices the signal into overlapping symbol-spaced windows', () => {
    const sig = heldSignal([1, -1, 1, -1, 1, -1], 4);
    const traces = eyeTraces(sig, 4, 2);
    expect(traces.length).toBeGreaterThan(1);
    expect(traces[0].samples.length).toBe(8);
  });
});

describe('eyeMetrics', () => {
  it('measures a wide-open eye (~2) for a clean ±1 signal', () => {
    const sig = heldSignal([1, -1, 1, -1, 1, -1, 1, -1], 4);
    const m = eyeMetrics(eyeTraces(sig, 4, 2), 4);
    expect(m.eyeHeight).toBeCloseTo(2, 6);
    expect(m.noiseMargin).toBeCloseTo(1, 6);
  });
  it('reports a smaller eye height once an ISI channel smears the signal', () => {
    const sig = heldSignal([1, -1, 1, -1, 1, -1, 1, -1], 4);
    const clean = eyeMetrics(eyeTraces(sig, 4, 2), 4).eyeHeight;
    const isi = convolve(sig, [1, 0.6]);
    const isiHeight = eyeMetrics(eyeTraces(isi, 4, 2), 4).eyeHeight;
    expect(isiHeight).toBeLessThan(clean);
  });
});

describe('isiEyePatterns', () => {
  it('enumerates every symbol sequence of length 2K+1', () => {
    expect(isiEyePatterns(16, 2, 2, 0).length).toBe(2 ** 5); // binary, K=2 → 32
    expect(isiEyePatterns(16, 4, 1, 0).length).toBe(4 ** 3); // 4-PAM, K=1 → 64
  });

  it('produces a 2-symbol display window per trace and a pattern label', () => {
    const traces = isiEyePatterns(16, 2, 2, 0);
    expect(traces[0].samples.length).toBe(2 * 16);
    expect(traces[0].label).toMatch(/^[01]( [01]){4}$/); // e.g. "0 0 0 0 0"
  });

  it('opens the eye at isiGain=0 and closes it as ISI grows', () => {
    const open = eyeMetrics(isiEyePatterns(16, 2, 2, 0), 16).eyeHeight;
    const mid = eyeMetrics(isiEyePatterns(16, 2, 2, 0.4), 16).eyeHeight;
    const heavy = eyeMetrics(isiEyePatterns(16, 2, 2, 0.8), 16).eyeHeight;
    expect(open).toBeGreaterThan(0);
    expect(mid).toBeLessThan(open);
    expect(heavy).toBeLessThan(mid);
  });
});
