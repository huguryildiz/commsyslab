import { describe, it, expect } from 'vitest';
import { DEFAULT_CPM_PARAMS, deriveCpm } from '@/modules/wireless/cpm-model';

describe('deriveCpm', () => {
  it('builds 2^depth phase-tree trajectories aligned to the time axis', () => {
    const d = deriveCpm(DEFAULT_CPM_PARAMS);
    expect(d.phaseTree.length).toBe(2 ** DEFAULT_CPM_PARAMS.treeDepth);
    expect(d.phaseTree[0].length).toBe(d.treeTime.length);
  });
  it('PSD arrays share the frequency axis and peak at 0 dB', () => {
    const d = deriveCpm(DEFAULT_CPM_PARAMS);
    expect(d.mskPsd.length).toBe(d.psdFreqT.length);
    expect(d.qpskPsd.length).toBe(d.psdFreqT.length);
    expect(d.mskPsd[0]).toBeCloseTo(0, 6);
    expect(d.qpskPsd[0]).toBeCloseTo(0, 6);
  });
  it('flags MSK at h=0.5 with a 90° per-symbol phase change', () => {
    const d = deriveCpm(DEFAULT_CPM_PARAMS);
    expect(d.isMsk).toBe(true);
    expect(d.peakPhaseDeg).toBeCloseTo(90, 6);
    expect(deriveCpm({ ...DEFAULT_CPM_PARAMS, modIndexH: 0.75 }).isMsk).toBe(false);
  });
});
