/**
 * Orthogonal frequency-division multiplexing (OFDM) building blocks.
 * Proakis & Salehi Ch. 10 (multicarrier / OFDM). Operates on Complex[] from
 * the shared FFT engine: fft(x) is unscaled, ifft(X) is scaled by 1/N, so
 * fft(ifft(X)) === X and the OFDM round trip is exact.
 */
import { fft, ifft, type Complex } from '@/lib/dsp/fft';

/** Complex magnitude |z|. */
export function cabs(z: Complex): number {
  return Math.hypot(z.re, z.im);
}

/** Complex multiply a·b. */
function cmul(a: Complex, b: Complex): Complex {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}

/** Complex divide a/b. */
function cdiv(a: Complex, b: Complex): Complex {
  const d = b.re * b.re + b.im * b.im;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
}

/**
 * OFDM modulator: map N frequency-domain subcarrier symbols to N time-domain
 * samples via the inverse FFT. Proakis Ch. 10 (OFDM).
 */
export function ofdmModulate(symbols: Complex[]): Complex[] {
  return ifft(symbols);
}

/**
 * OFDM demodulator: recover the N subcarrier symbols from N time-domain samples
 * via the forward FFT. Proakis Ch. 10 (OFDM).
 */
export function ofdmDemodulate(time: Complex[]): Complex[] {
  return fft(time);
}

/**
 * Prepend a cyclic prefix: copy the last `cpLen` samples of the body to the
 * front. The guard interval absorbs the channel's transient so the remaining
 * block looks like a circular convolution. Proakis Ch. 10 (OFDM).
 */
export function addCyclicPrefix(time: Complex[], cpLen: number): Complex[] {
  const N = time.length;
  const prefix = time.slice(N - cpLen, N);
  return [...prefix, ...time];
}

/**
 * Remove the cyclic prefix at the receiver: drop the first `cpLen` samples and
 * keep the next `n` body samples. Proakis Ch. 10 (OFDM).
 */
export function removeCyclicPrefix(rx: Complex[], cpLen: number, n: number): Complex[] {
  return rx.slice(cpLen, cpLen + n);
}

/**
 * Linear convolution y[n] = Σ_k a[k]·h[n−k] of two complex sequences. Models a
 * tapped-delay-line multipath channel applied to the time-domain OFDM signal.
 * Output length is a.length + h.length − 1. Proakis Ch. 10.
 */
export function convolveChannel(a: Complex[], h: Complex[]): Complex[] {
  const out: Complex[] = Array.from({ length: a.length + h.length - 1 }, () => ({ re: 0, im: 0 }));
  for (let k = 0; k < a.length; k++) {
    for (let m = 0; m < h.length; m++) {
      const p = cmul(a[k], h[m]);
      out[k + m].re += p.re;
      out[k + m].im += p.im;
    }
  }
  return out;
}

/**
 * Per-subcarrier channel frequency response H[k] = FFT of the channel taps
 * zero-padded to N. With a cyclic prefix ≥ L−1, each subcarrier sees a flat
 * complex gain H[k], so equalization is one tap per subcarrier. Proakis Ch. 10.
 */
export function channelFreqResponse(h: Complex[], n: number): Complex[] {
  const padded: Complex[] = Array.from({ length: n }, (_, i) =>
    i < h.length ? { re: h[i].re, im: h[i].im } : { re: 0, im: 0 },
  );
  return fft(padded);
}

/**
 * One-tap zero-forcing equalizer: invert each subcarrier's complex channel gain,
 * X̂[k] = Y[k] / H[k]. Exact when the cyclic prefix covers the delay spread.
 * Noise on deep-fade subcarriers (small |H[k]|) is amplified — the ZF penalty.
 * Proakis Ch. 10 (OFDM).
 */
export function equalizeZf(rxSymbols: Complex[], H: Complex[]): Complex[] {
  return rxSymbols.map((y, k) => cdiv(y, H[k]));
}

/**
 * Seeded multipath channel: `numTaps` sample-spaced complex taps whose powers
 * follow an exponential profile p_l = exp(−l/tauSamples) (normalized to unit
 * total power), each with a fixed amplitude √p_l and a random phase. A frozen
 * snapshot of a frequency-selective Rayleigh channel. Proakis Ch. 10 / §10.1.1.
 */
export function exponentialChannelTaps(
  numTaps: number,
  tauSamples: number,
  rng: () => number,
): Complex[] {
  const powers: number[] = [];
  let total = 0;
  for (let l = 0; l < numTaps; l++) {
    const p = Math.exp(-l / tauSamples);
    powers.push(p);
    total += p;
  }
  return powers.map((p) => {
    const amp = Math.sqrt(p / total);
    const theta = 2 * Math.PI * rng();
    return { re: amp * Math.cos(theta), im: amp * Math.sin(theta) };
  });
}
