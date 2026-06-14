import { describe, it, expect } from 'vitest';
import { DEFAULT_LINK_BUDGET_PARAMS, deriveLinkBudget } from '@/modules/wireless/linkbudget-model';

describe('deriveLinkBudget', () => {
  it('computes a consistent budget: received power below Tx, and margins chained', () => {
    const d = deriveLinkBudget(DEFAULT_LINK_BUDGET_PARAMS);
    expect(d.rxPowerDbm).toBeLessThan(DEFAULT_LINK_BUDGET_PARAMS.txPowerDbm);
    expect(d.linkMarginDb).toBeCloseTo(d.ebN0Db - d.requiredEbN0Db, 6);
    expect(d.effectiveMarginDb).toBeCloseTo(d.linkMarginDb - d.fadeMarginDb, 6);
    expect(d.linkCloses).toBe(d.effectiveMarginDb >= 0);
  });
  it('the waterfall ends at the received power and the sensitivity relation holds', () => {
    const d = deriveLinkBudget(DEFAULT_LINK_BUDGET_PARAMS);
    expect(d.waterfall.length).toBeGreaterThan(2);
    expect(d.waterfall[d.waterfall.length - 1].cumDbm).toBeCloseTo(d.rxPowerDbm, 6);
    expect(d.linkCloses).toBe(d.rxPowerDbm >= d.sensitivityDbm + d.fadeMarginDb);
  });
  it('more transmit power widens the effective margin', () => {
    const base = deriveLinkBudget(DEFAULT_LINK_BUDGET_PARAMS);
    const hot = deriveLinkBudget({ ...DEFAULT_LINK_BUDGET_PARAMS, txPowerDbm: DEFAULT_LINK_BUDGET_PARAMS.txPowerDbm + 20 });
    expect(hot.effectiveMarginDb).toBeGreaterThan(base.effectiveMarginDb);
  });
  it('exposes a finite positive max range and a distance sweep', () => {
    const d = deriveLinkBudget(DEFAULT_LINK_BUDGET_PARAMS);
    expect(d.maxRangeKm).toBeGreaterThan(0);
    expect(d.distKm.length).toBeGreaterThan(2);
    expect(d.rxByDist.length).toBe(d.distKm.length);
  });
});
