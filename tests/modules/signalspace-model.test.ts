import { describe, it, expect } from 'vitest';
import { buildSignalSpaceView, SIGSPACE_PRESETS } from '@/modules/modulation/signalspace-model';

const SPS = 48;
const build = (presetId: string, customAmplitudes: number[][] = [[1, 1], [-1, -1]]) =>
  buildSignalSpaceView({ presetId, customAmplitudes, sps: SPS });

describe('buildSignalSpaceView', () => {
  it('exposes presets including a custom sentinel last', () => {
    expect(SIGSPACE_PRESETS.length).toBeGreaterThanOrEqual(4);
    expect(SIGSPACE_PRESETS[SIGSPACE_PRESETS.length - 1].id).toBe('custom');
  });

  it('1-D antipodal set → kind "axis", dim 1, second signal dependent', () => {
    const v = build('antipodal');
    expect(v.kind).toBe('axis');
    expect(v.dim).toBe(1);
    expect(v.dependent[1]).toBe(true);
    expect(v.coeffs).toHaveLength(v.M);
  });

  it('2-D QPSK-like set → kind "plane", dim 2', () => {
    const v = build('qpsk');
    expect(v.kind).toBe('plane');
    expect(v.dim).toBe(2);
  });

  it('Proakis Ex. 7.1.1 → kind "bars", dim 3, 4th signal dependent', () => {
    const v = build('example711');
    expect(v.kind).toBe('bars');
    expect(v.dim).toBe(3);
    expect(v.dependent[3]).toBe(true);
  });

  it('builds frames: first is "consider", last reaches full basisCount = dim', () => {
    const v = build('qpsk');
    expect(v.frames.length).toBeGreaterThan(0);
    expect(v.frames[0].phase).toBe('consider');
    expect(v.frames[v.frames.length - 1].basisCount).toBe(v.dim);
    // every frame's residual is a full-length waveform
    for (const f of v.frames) expect(f.residual).toHaveLength(SPS);
  });

  it('custom path runs through gramSchmidtTrace without throwing', () => {
    const v = build('custom', [[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
    expect(v.kind).toBe('bars');
    expect(v.dim).toBe(3);
  });

  it('all-zero custom set → kind "degenerate", dim 0', () => {
    const v = build('custom', [[0, 0], [0, 0]]);
    expect(v.kind).toBe('degenerate');
    expect(v.dim).toBe(0);
  });
});
