import {
  ofdmModulate,
  ofdmDemodulate,
  addCyclicPrefix,
  removeCyclicPrefix,
  convolveChannel,
  channelFreqResponse,
  equalizeZf,
  exponentialChannelTaps,
  cabs,
} from '@/lib/dsp/ofdm';
import type { Complex } from '@/lib/dsp/fft';
import { makeRng } from '@/lib/dsp/random';
import { gaussian } from '@/lib/dsp/awgn';

export interface OfdmParams {
  numSubcarriers: number; // N (power of two: 16/32/64)
  cpLength: number; // cyclic-prefix length in samples
  channelTaps: number; // L — multipath delay spread in samples
  ebN0Db: number; // E_b/N_0 (dB) for the subcarrier AWGN
  seed: number;
}

export const DEFAULT_OFDM_PARAMS: OfdmParams = {
  numSubcarriers: 16,
  cpLength: 4,
  channelTaps: 3,
  ebN0Db: 20,
  seed: 1,
};

export interface OfdmDerived {
  N: number;
  txSymbols: Complex[]; // ideal QPSK subcarrier symbols (reference)
  rxPreEq: Complex[]; // received subcarrier symbols before equalization
  rxPostEq: Complex[]; // after one-tap ZF equalization
  channelMag: number[]; // |H[k]| across subcarriers
  timeReal: number[]; // Re of the CP-extended time-domain symbol
  cpLength: number;
  cpSufficient: boolean; // cpLength >= channelTaps - 1
  evmPostEq: number; // RMS error vector magnitude after equalization
}

/** Pure derivation of plot-ready OFDM data. Memoize on params. */
export function deriveOfdm(p: OfdmParams): OfdmDerived {
  const N = p.numSubcarriers;
  const rng = makeRng(p.seed);

  // Random QPSK subcarrier symbols (unit energy).
  const txSymbols: Complex[] = Array.from({ length: N }, () => ({
    re: rng() < 0.5 ? -Math.SQRT1_2 : Math.SQRT1_2,
    im: rng() < 0.5 ? -Math.SQRT1_2 : Math.SQRT1_2,
  }));

  // Frequency-selective channel (sample-spaced complex taps).
  const tau = Math.max(p.channelTaps / 2, 0.5);
  const h = exponentialChannelTaps(p.channelTaps, tau, rng);

  // Transmit chain: IFFT → cyclic prefix → multipath channel.
  const timeBody = ofdmModulate(txSymbols);
  const timeTx = addCyclicPrefix(timeBody, p.cpLength);
  const rx = convolveChannel(timeTx, h);

  // Receive chain: strip CP → FFT → channel response → one-tap ZF equalize.
  const body = removeCyclicPrefix(rx, p.cpLength, N);
  const H = channelFreqResponse(h, N);
  const Yclean = ofdmDemodulate(body);

  // Per-subcarrier complex AWGN (white → equal variance per subcarrier).
  // QPSK symbol energy E_s = 1, so E_b = 0.5; per-dimension noise std = √(N0/2).
  const ebN0Lin = 10 ** (p.ebN0Db / 10);
  const n0 = 0.5 / ebN0Lin;
  const sigma = Math.sqrt(n0 / 2);
  const rxPreEq: Complex[] = Yclean.map((y) => ({
    re: y.re + sigma * gaussian(rng),
    im: y.im + sigma * gaussian(rng),
  }));

  const rxPostEq = equalizeZf(rxPreEq, H);

  // Error vector magnitude (RMS) of the equalized symbols vs the ideal ones.
  let err = 0;
  for (let k = 0; k < N; k++) {
    const dr = rxPostEq[k].re - txSymbols[k].re;
    const di = rxPostEq[k].im - txSymbols[k].im;
    err += dr * dr + di * di;
  }
  const evmPostEq = Math.sqrt(err / N);

  return {
    N,
    txSymbols,
    rxPreEq,
    rxPostEq,
    channelMag: H.map(cabs),
    timeReal: timeTx.map((z) => z.re),
    cpLength: p.cpLength,
    cpSufficient: p.cpLength >= p.channelTaps - 1,
    evmPostEq,
  };
}
