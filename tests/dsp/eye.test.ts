import { describe, it, expect } from 'vitest';
import { eyeTraces, eyeMetrics } from '@/lib/dsp/eye';
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
