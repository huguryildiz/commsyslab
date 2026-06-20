import { describe, it, expect } from 'vitest';
import { DEFAULT_SYNC_PARAMS, deriveSync } from '@/modules/wireless/sync-model';

describe('deriveSync', () => {
  it('search profile peaks at the true offset', () => {
    const d = deriveSync(DEFAULT_SYNC_PARAMS);
    expect(d.profile[d.trueOffset]).toBe(Math.max(...d.profile));
  });
  it('S-curve has a stable zero crossing at zero error', () => {
    const d = deriveSync(DEFAULT_SYNC_PARAMS);
    const zero = d.sCurve.find((p) => Math.abs(p.tau) < 1e-9);
    expect(zero).toBeDefined();
    expect(Math.abs(zero!.disc)).toBeLessThan(1e-9);
  });
});
