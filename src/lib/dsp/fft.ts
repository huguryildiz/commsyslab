/**
 * Discrete Fourier transform engine — shared FFT core.
 * Radix-2 Cooley–Tukey when N is a power of two, otherwise an O(N²) direct DFT.
 * Proakis & Salehi §2.2 (Fourier transform of discrete signals).
 */

export interface Complex {
  re: number;
  im: number;
}

function toComplex(x: number[] | Complex[]): Complex[] {
  return (x as Array<number | Complex>).map((v) =>
    typeof v === 'number' ? { re: v, im: 0 } : { re: v.re, im: v.im },
  );
}

function isPow2(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

/** Direct DFT, O(N²). sign = -1 forward, +1 inverse (unscaled). */
function dft(x: Complex[], sign: number): Complex[] {
  const N = x.length;
  const out: Complex[] = new Array(N);
  for (let k = 0; k < N; k++) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < N; n++) {
      const ph = (sign * 2 * Math.PI * k * n) / N;
      const c = Math.cos(ph);
      const s = Math.sin(ph);
      re += x[n].re * c - x[n].im * s;
      im += x[n].re * s + x[n].im * c;
    }
    out[k] = { re, im };
  }
  return out;
}

/** In-place iterative radix-2 Cooley–Tukey. sign = -1 forward, +1 inverse. */
function radix2(input: Complex[], sign: number): Complex[] {
  const N = input.length;
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    re[i] = input[i].re;
    im[i] = input[i].im;
  }

  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }

  for (let len = 2; len <= N; len <<= 1) {
    const ang = (sign * 2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < N; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = i + k + len / 2;
        const tRe = re[b] * curRe - im[b] * curIm;
        const tIm = re[b] * curIm + im[b] * curRe;
        re[b] = re[a] - tRe;
        im[b] = im[a] - tIm;
        re[a] += tRe;
        im[a] += tIm;
        const nRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nRe;
      }
    }
  }

  const out: Complex[] = new Array(N);
  for (let i = 0; i < N; i++) out[i] = { re: re[i], im: im[i] };
  return out;
}

/** Forward DFT: N=2ᵏ → radix-2 FFT, otherwise O(N²) DFT. */
export function fft(x: number[] | Complex[]): Complex[] {
  const c = toComplex(x);
  if (c.length === 0) return [];
  return isPow2(c.length) ? radix2(c, -1) : dft(c, -1);
}

/** Inverse DFT (scaled by 1/N). */
export function ifft(X: Complex[]): Complex[] {
  if (X.length === 0) return [];
  const N = X.length;
  const raw = isPow2(N) ? radix2(X, +1) : dft(X, +1);
  return raw.map((v) => ({ re: v.re / N, im: v.im / N }));
}

export interface Spectrum {
  freq: number[];
  mag: number[];
  phase: number[];
}

/**
 * Two-sided amplitude/phase spectrum, fftshifted so the frequency axis runs
 * monotonically over [-fs/2, fs/2). Magnitude is normalised by N.
 */
export function spectrum(x: number[], fs: number): Spectrum {
  const N = x.length;
  if (N === 0) return { freq: [], mag: [], phase: [] };
  const X = fft(x);
  // Map each bin k to its signed frequency, then sort ascending (fftshift).
  const bins = X.map((c, k) => {
    const kSigned = k <= N / 2 ? k - (2 * k === N ? N : 0) : k - N; // Nyquist -> -fs/2
    return {
      freq: (kSigned * fs) / N,
      mag: Math.hypot(c.re, c.im) / N,
      phase: Math.atan2(c.im, c.re),
    };
  });
  bins.sort((a, b) => a.freq - b.freq);
  return {
    freq: bins.map((b) => b.freq),
    mag: bins.map((b) => b.mag),
    phase: bins.map((b) => b.phase),
  };
}
