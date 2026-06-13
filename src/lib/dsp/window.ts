/**
 * Window functions for spectral analysis (reduce leakage / control side-lobes).
 * Proakis & Salehi §2.2 — windowing before the DFT.
 */

export type WindowType = 'rect' | 'hann' | 'hamming';

/** Length-N window of the requested type. */
export function window(type: WindowType, N: number): number[] {
  const w = new Array<number>(N);
  if (N === 1) return [1];
  for (let n = 0; n < N; n++) {
    switch (type) {
      case 'rect':
        w[n] = 1;
        break;
      case 'hann':
        w[n] = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (N - 1));
        break;
      case 'hamming':
        w[n] = 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (N - 1));
        break;
    }
  }
  return w;
}
