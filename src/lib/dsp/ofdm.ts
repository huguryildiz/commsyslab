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
