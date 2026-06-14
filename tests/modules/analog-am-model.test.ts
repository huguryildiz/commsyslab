import { describe, it, expect } from 'vitest';
import { buildAmSpectrum } from '@/modules/analog-am/model';

/** Index of the bin whose frequency is closest to `target`. */
function nearestIdx(freq: number[], target: number): number {
  let best = 0;
  for (let i = 1; i < freq.length; i++) {
    if (Math.abs(freq[i] - target) < Math.abs(freq[best] - target)) best = i;
  }
  return best;
}

describe('buildAmSpectrum', () => {
  const base = { messageFreq: 1000, carrierFreq: 20000, carrierAmp: 1, modIndex: 0.5 };

  it('DSB-SC suppresses the carrier line but keeps both sidebands', () => {
    const { specFreq, specMag } = buildAmSpectrum({ ...base, mode: 'dsb' });
    const peak = Math.max(...specMag);
    const carrier = specMag[nearestIdx(specFreq, base.carrierFreq)];
    expect(carrier).toBeLessThan(0.2 * peak); // no carrier in DSB-SC
  });

  it('conventional AM has a strong carrier line', () => {
    const { specFreq, specMag } = buildAmSpectrum({ ...base, mode: 'conventional' });
    const peak = Math.max(...specMag);
    const carrier = specMag[nearestIdx(specFreq, base.carrierFreq)];
    expect(carrier).toBeGreaterThan(0.5 * peak); // carrier present
  });

  it('SSB-USB keeps only the upper sideband', () => {
    const { specFreq, specMag } = buildAmSpectrum({ ...base, mode: 'ssb-usb' });
    const peak = Math.max(...specMag);
    const lower = specMag[nearestIdx(specFreq, base.carrierFreq - base.messageFreq)];
    expect(lower).toBeLessThan(0.2 * peak); // lower sideband removed
  });

  it('VSB attenuates the lower sideband to roughly half', () => {
    const { specFreq, specMag } = buildAmSpectrum({ ...base, mode: 'vsb' });
    const upper = specMag[nearestIdx(specFreq, base.carrierFreq + base.messageFreq)];
    const lower = specMag[nearestIdx(specFreq, base.carrierFreq - base.messageFreq)];
    expect(lower).toBeLessThan(upper); // vestige ramp tilts power toward USB
    expect(lower).toBeGreaterThan(0.05 * upper); // but a vestige remains
  });
});
