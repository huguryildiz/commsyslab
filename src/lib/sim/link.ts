// End-to-end digital link: analog source -> modulate -> AWGN channel -> detect -> decode.
// Detection is the matched-filter-optimal AWGN-on-signal-points model (Proakis §7.5.2);
// bandlimited pulse-shaping + eye are computed for visualization only (Proakis §8.3).
import { makeConstellation, type Scheme, type Constellation } from '@/lib/dsp/modulation';
import { n0FromEbN0Db, sigmaFromN0, addAwgn } from '@/lib/dsp/awgn';
import { detectML } from '@/lib/dsp/detector';
import { pulseWaveform } from '@/lib/dsp/pulse';
import { convolve, matchedFilterOutput } from '@/lib/dsp/matchedfilter';
import { eyeTraces, type EyeTrace } from '@/lib/dsp/eye';
import { makeRng, bitsToSymbols, symbolsToBits, type Bit } from './sources';
import { encodeAnalog, decodeAnalog, analogSqnrDb, type AnalogSourceParams } from './analogSource';

export interface ChannelConfig {
  ebN0Db: number;
  bandlimited: boolean;
  alpha: number; // raised-cosine roll-off (display)
  sps: number; // samples per symbol (display)
  span: number; // pulse half-span in symbols (display)
}

export interface LinkConfig {
  source: AnalogSourceParams; // Phase 1: analog only
  scheme: Scheme;
  M: number;
  channel: ChannelConfig;
  seed: number;
}

export interface ChannelTrace {
  enabled: boolean;
  txWaveform: number[];
  rxWaveform: number[];
  eye: EyeTrace[];
  sps: number;
}

export interface LinkMetrics {
  ber: number;
  bitErrors: number;
  totalBits: number;
  symErrors: number;
  totalSymbols: number;
  sqnrDb: number;
  bitsPerSymbol: number;
}

export interface LinkResult {
  constellation: Constellation;
  original: number[];
  times: number[];
  txQuantized: number[];
  srcBits: Bit[];
  txSymbols: number[];
  rxPoints: number[][];
  rxSymbols: number[];
  rxBits: Bit[];
  recovered: number[];
  channelTrace: ChannelTrace;
  metrics: LinkMetrics;
}

/** Pulse-shape the dimension-0 amplitude train for the eye/waveform view (no detection effect). */
export function buildChannelTrace(
  txSymbols: number[],
  c: Constellation,
  ch: ChannelConfig,
): ChannelTrace {
  if (!ch.bandlimited) {
    return { enabled: false, txWaveform: [], rxWaveform: [], eye: [], sps: ch.sps };
  }
  const amps = txSymbols.map((s) => c.points[s][0]);
  const pulse = pulseWaveform('rc', ch.alpha, ch.sps, ch.span);
  const up = new Array<number>(amps.length * ch.sps).fill(0);
  for (let i = 0; i < amps.length; i++) up[i * ch.sps] = amps[i];
  const txWaveform = convolve(up, pulse);
  const rxWaveform = matchedFilterOutput(txWaveform, pulse);
  const eye = eyeTraces(txWaveform, ch.sps, 2);
  return { enabled: true, txWaveform, rxWaveform, eye, sps: ch.sps };
}

export function runLink(cfg: LinkConfig): LinkResult {
  const enc = encodeAnalog(cfg.source);
  const c = makeConstellation(cfg.scheme, cfg.M);
  const k = c.bitsPerSymbol;
  const eb = c.EsAvg / k; // energy per bit (Proakis §7.6)
  const n0 = n0FromEbN0Db(cfg.channel.ebN0Db, eb);
  const sigma = sigmaFromN0(n0);
  const rng = makeRng(cfg.seed);
  const txSymbols = bitsToSymbols(enc.bits, k);

  const rxPoints: number[][] = [];
  let symErrors = 0;
  const rxSymbols = txSymbols.map((tx) => {
    const r = addAwgn(c.points[tx], sigma, rng);
    rxPoints.push(r);
    const rx = detectML(r, c.points);
    if (rx !== tx) symErrors++;
    return rx;
  });

  const rxBits = symbolsToBits(rxSymbols, k);
  let bitErrors = 0;
  for (let i = 0; i < enc.bits.length; i++) if (rxBits[i] !== enc.bits[i]) bitErrors++;

  const recovered = decodeAnalog(rxBits, enc.meta);
  const sqnrDb = analogSqnrDb(enc.original, recovered);
  const channelTrace = buildChannelTrace(txSymbols, c, cfg.channel);

  return {
    constellation: c,
    original: enc.original,
    times: enc.times,
    txQuantized: enc.quantized,
    srcBits: enc.bits,
    txSymbols,
    rxPoints,
    rxSymbols,
    rxBits,
    recovered,
    channelTrace,
    metrics: {
      ber: enc.bits.length ? bitErrors / enc.bits.length : 0,
      bitErrors,
      totalBits: enc.bits.length,
      symErrors,
      totalSymbols: txSymbols.length,
      sqnrDb,
      bitsPerSymbol: k,
    },
  };
}
