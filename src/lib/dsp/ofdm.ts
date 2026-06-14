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
