import { describe, it, expect } from 'vitest';
import { runLink, type LinkConfig } from '@/lib/sim/link';

const BASE: LinkConfig = {
  source: { tones: [{ freq: 2, amp: 0.8 }], fs: 32, tEnd: 1, mMax: 1, bits: 4, type: 'midrise', coding: 'gray' },
  scheme: 'bpsk',
  M: 2,
  channel: { ebN0Db: 100, bandlimited: false, alpha: 0.35, sps: 16, span: 4 },
  seed: 7,
};

describe('runLink', () => {
  it('is lossless at very high Eb/N0 (BER 0, recovered == tx quantized)', () => {
    const r = runLink(BASE);
    expect(r.metrics.bitErrors).toBe(0);
    expect(r.metrics.ber).toBe(0);
    expect(r.recovered).toEqual(r.txQuantized);
    expect(Number.isFinite(r.metrics.sqnrDb)).toBe(true);
  });

  it('produces bit errors as Eb/N0 drops, monotonic in the mean', () => {
    const hi = runLink({ ...BASE, channel: { ...BASE.channel, ebN0Db: 12 } });
    const lo = runLink({ ...BASE, channel: { ...BASE.channel, ebN0Db: 0 } });
    expect(lo.metrics.ber).toBeGreaterThan(hi.metrics.ber);
  });

  it('builds a bandlimited channel trace only when enabled', () => {
    const off = runLink(BASE);
    const on = runLink({ ...BASE, channel: { ...BASE.channel, bandlimited: true } });
    expect(off.channelTrace.enabled).toBe(false);
    expect(on.channelTrace.enabled).toBe(true);
    expect(on.channelTrace.txWaveform.length).toBeGreaterThan(0);
    expect(on.channelTrace.eye.length).toBeGreaterThan(0);
  });
});
