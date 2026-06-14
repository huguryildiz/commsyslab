import { describe, it, expect } from 'vitest';
import { DEFAULT_OFDM_PARAMS, deriveOfdm } from '@/modules/wireless/ofdm-model';

describe('deriveOfdm', () => {
  it('exposes per-subcarrier arrays sized to N and a CP-extended time symbol', () => {
    const d = deriveOfdm(DEFAULT_OFDM_PARAMS);
    const N = DEFAULT_OFDM_PARAMS.numSubcarriers;
    expect(d.N).toBe(N);
    expect(d.txSymbols).toHaveLength(N);
    expect(d.rxPreEq).toHaveLength(N);
    expect(d.rxPostEq).toHaveLength(N);
    expect(d.channelMag).toHaveLength(N);
    expect(d.timeReal).toHaveLength(N + DEFAULT_OFDM_PARAMS.cpLength);
  });
  it('with a sufficient cyclic prefix and very high SNR, post-EQ EVM is tiny', () => {
    const d = deriveOfdm({
      numSubcarriers: 16,
      cpLength: 4,
      channelTaps: 3, // L-1 = 2 ≤ cp
      ebN0Db: 200, // ~10 orders of noise margin so deep-fade ZF amplification stays negligible
      seed: 5,
    });
    expect(d.cpSufficient).toBe(true);
    expect(d.evmPostEq).toBeLessThan(1e-3);
  });
  it('with no cyclic prefix and a multitap channel, ICI keeps EVM high even at high SNR', () => {
    const dGood = deriveOfdm({ numSubcarriers: 16, cpLength: 6, channelTaps: 5, ebN0Db: 200, seed: 5 });
    const dBad = deriveOfdm({ numSubcarriers: 16, cpLength: 0, channelTaps: 5, ebN0Db: 200, seed: 5 });
    expect(dBad.cpSufficient).toBe(false);
    expect(dBad.evmPostEq).toBeGreaterThan(dGood.evmPostEq);
    expect(dBad.evmPostEq).toBeGreaterThan(0.05);
  });
});
