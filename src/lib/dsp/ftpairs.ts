/**
 * Analytic (closed-form) Fourier-transform pairs.
 * Source: Proakis & Salehi, Communication Systems Engineering, Table 2.1 (§2.3).
 *
 * Time-domain definitions match src/lib/dsp/signals.ts so the analytic curve
 * can be overlaid directly on the numerically computed (FFT) spectrum.
 *
 * FT convention (Eq. 2.3.1): X(f) = ∫ x(t) e^{-j2πft} dt, frequency f in Hz.
 * sinc is the normalized sinc, sinc(x) = sin(πx)/(πx) (see math.ts).
 */

import type { Complex } from './fft';
import { sinc } from './math';

/** Energy signals whose Fourier transform has a clean closed form in Table 2.1. */
export type AnalyticFtKind = 'rect' | 'tri' | 'exp' | 'exp2' | 'sinc' | 'damped_sine' | 'gaussian';

/** Complex division helper: (a) / (b). */
function cdiv(a: Complex, b: Complex): Complex {
  const d = b.re * b.re + b.im * b.im;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
}

/** Complex multiply. */
function cmul(a: Complex, b: Complex): Complex {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}

/**
 * Continuous Fourier transform X(f) of the unit base signal of the given kind,
 * evaluated at frequency f (Hz). `tau` is the time constant for exp/exp2/damped_sine.
 *
 *   rect         Π(t)                  → sinc(f)
 *   tri          Λ(t)                  → sinc²(f)
 *   exp          e^{-t/τ}u(t)          → 1/(1/τ + j2πf)
 *   exp2         e^{-|t|/τ}            → 2(1/τ)/((1/τ)² + (2πf)²)
 *   sinc         sinc(t)               → Π(f)   (unit-width rect)
 *   damped_sine  sin(2πt)e^{-t/τ}u(t)  → 2π/((1/τ + j2πf)² + (2π)²)
 *   gaussian     e^{-t²/(2τ²)}         → τ√(2π)·e^{-2π²τ²f²}
 */
export function analyticFt(kind: AnalyticFtKind, f: number, tau = 0.5): Complex {
  const w = 2 * Math.PI * f; // angular frequency 2πf
  const a = 1 / tau; // decay rate from the time constant
  switch (kind) {
    case 'rect':
      return { re: sinc(f), im: 0 };
    case 'tri':
      return { re: sinc(f) ** 2, im: 0 };
    case 'exp':
      // 1/(a + jw) = (a - jw)/(a² + w²)
      return { re: a / (a * a + w * w), im: -w / (a * a + w * w) };
    case 'exp2':
      return { re: (2 * a) / (a * a + w * w), im: 0 };
    case 'sinc':
      // Π(f): 1 for |f| < 1/2, 0 outside (rect of unit width).
      return { re: Math.abs(f) < 0.5 ? 1 : 0, im: 0 };
    case 'damped_sine': {
      // b/((a + jw)² + b²), b = 2πf₀, f₀ = 1.
      const b = 2 * Math.PI;
      const apjw: Complex = { re: a, im: w };
      const denom = { re: cmul(apjw, apjw).re + b * b, im: cmul(apjw, apjw).im };
      return cdiv({ re: b, im: 0 }, denom);
    }
    case 'gaussian':
      // e^{-t²/(2τ²)} → τ√(2π)·e^{-2π²τ²f²} (real, even).
      return { re: tau * Math.sqrt(2 * Math.PI) * Math.exp(-2 * Math.PI * Math.PI * tau * tau * f * f), im: 0 };
  }
}
