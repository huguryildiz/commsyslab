import type { Tone } from './signals';
import { evalSignal, signalPeak } from './signals';
import { clamp } from './math';

export type AmMode = 'dsb' | 'conventional' | 'ssb-usb' | 'ssb-lsb' | 'vsb';
export type AngleMode = 'fm' | 'pm';

/**
 * AM modulated signal u(t). Proakis §3.2.1–3.2.4
 * - dsb: m(t)·cos(2π fc t)
 * - conventional: Ac[1 + a·mₙ(t)]·cos(2π fc t)
 * - ssb-usb/lsb: Ac[mₙ(t)cos(2π fc t) ∓ m̂ₙ(t)sin(2π fc t)]
 * - vsb: approximate dsb with partial sideband filtering near fc
 */
export function amSignal(
  mode: AmMode,
  msg: Tone[],
  fc: number,
  Ac: number,
  a: number,
  t: number,
): number {
  const mVal = evalSignal(msg, t);
  const mPeak = signalPeak(msg);
  const mNorm = mPeak > 1e-10 ? mVal / mPeak : 0;

  const carrier = Math.cos(2 * Math.PI * fc * t);

  switch (mode) {
    case 'dsb':
      // Proakis §3.2.1: u(t) = m(t)·cos(2π fc t)
      return mVal * carrier;

    case 'conventional':
      // Proakis §3.2.2: u(t) = Ac[1 + a·mₙ(t)]·cos(2π fc t)
      return Ac * (1 + a * mNorm) * carrier;

    case 'ssb-usb': {
      // Proakis §3.2.3: USB = Ac[mₙ(t)cos(2π fc t) − m̂ₙ(t)sin(2π fc t)]
      // For a single tone: approximate by shifting tone to fc + fm
      const sineCarrier = Math.sin(2 * Math.PI * fc * t);
      // Hilbert transform approximation for single tone: insert imaginary part
      // For tones, we can compute the analytic signal directly
      let hilbert = 0;
      for (const tone of msg) {
        // Hilbert of cos(2π fm t) = sin(2π fm t)
        hilbert += tone.amp * Math.sin(2 * Math.PI * tone.freq * t + (tone.phase ?? 0));
      }
      const hilbertNorm = mPeak > 1e-10 ? hilbert / mPeak : 0;
      return Ac * (mNorm * carrier - hilbertNorm * sineCarrier);
    }

    case 'ssb-lsb': {
      // Proakis §3.2.3: LSB = Ac[mₙ(t)cos(2π fc t) + m̂ₙ(t)sin(2π fc t)]
      const sineCarrier = Math.sin(2 * Math.PI * fc * t);
      let hilbert = 0;
      for (const tone of msg) {
        hilbert += tone.amp * Math.sin(2 * Math.PI * tone.freq * t + (tone.phase ?? 0));
      }
      const hilbertNorm = mPeak > 1e-10 ? hilbert / mPeak : 0;
      return Ac * (mNorm * carrier + hilbertNorm * sineCarrier);
    }

    case 'vsb': {
      // Proakis §3.2.4: VSB = DSB shaped by asymmetric filter near fc
      const vestige = (signalPeak(msg) > 0 ? signalPeak(msg) * fc * 0.1 : 0.1 * fc) || 100;
      const filterMag = vsbFilterMag(fc, fc, vestige);
      const dsbVal = mVal * carrier;
      // Apply amplitude shaping (time-domain approximation)
      return filterMag * dsbVal;
    }
  }
}

/**
 * Conventional-AM envelope = Ac[1 + a·mₙ(t)].
 * Proakis §3.2.2
 */
export function amEnvelope(msg: Tone[], Ac: number, a: number, t: number): number {
  const mVal = evalSignal(msg, t);
  const mPeak = signalPeak(msg);
  const mNorm = mPeak > 1e-10 ? mVal / mPeak : 0;
  // Proakis §3.2.2: e(t) = Ac[1 + a·mₙ(t)]
  return Ac * (1 + a * mNorm);
}

/**
 * Modulation efficiency η = a²Pmn/(1+a²Pmn).
 * Proakis §3.2.2: ratio of sideband power to total power.
 * For single tone Pmn = 1/2, so η = a²/(2+a²); at a=1 → 1/3.
 */
export function amEfficiency(a: number, Pmn: number): number {
  if (Pmn <= 0) return 0;
  // Proakis §3.2.2: η = a²Pmn/(1+a²Pmn)
  const num = a * a * Pmn;
  return num / (1 + num);
}

/**
 * VSB sideband filter magnitude |H(f)|.
 * Proakis §3.2.4 s.85: vestige transition from 0 to 1 centered at fc.
 * Represents a linear slope through the carrier frequency.
 */
export function vsbFilterMag(f: number, fc: number, vestige: number): number {
  // Create a smooth transition centered at fc
  // At f=fc, returns 0.5 (half-amplitude point)
  // Vestige band defines the transition width
  const normalized = (f - (fc - vestige)) / (2 * vestige);
  return clamp(normalized, 0, 1);
}

/**
 * Angle-modulated signal. Proakis §3.3.1
 * FM: Ac·cos(2π fc t + 2π kf ∫m dτ)
 * PM: Ac·cos(2π fc t + kp·m(t))
 */
export function angleSignal(
  mode: AngleMode,
  msg: Tone[],
  fc: number,
  Ac: number,
  k: number,
  t: number,
): number {
  const basePhase = 2 * Math.PI * fc * t;

  if (mode === 'fm') {
    // FM: phase deviation = 2π kf ∫m(τ)dτ
    // For tones, ∫cos(2π fm τ) dτ = sin(2π fm τ)/(2π fm)
    let phaseDeviation = 0;
    for (const tone of msg) {
      // Integral of amp*cos(2π f τ + φ) is amp*sin(2π f τ + φ)/(2π f)
      const integral = tone.amp * Math.sin(2 * Math.PI * tone.freq * t + (tone.phase ?? 0)) / (2 * Math.PI * tone.freq || 1e-10);
      phaseDeviation += 2 * Math.PI * k * integral;
    }
    // Proakis §3.3.1: u(t) = Ac·cos(2π fc t + Δφ)
    return Ac * Math.cos(basePhase + phaseDeviation);
  } else {
    // PM: phase modulation = kp·m(t)
    const mVal = evalSignal(msg, t);
    // Proakis §3.3.1: u(t) = Ac·cos(2π fc t + kp·m(t))
    return Ac * Math.cos(basePhase + k * mVal);
  }
}

/**
 * Instantaneous frequency f_i(t) = f_c + k_f·m(t) (FM).
 * Proakis §3.3.1
 */
export function instantFreq(msg: Tone[], fc: number, kf: number, t: number): number {
  const mVal = evalSignal(msg, t);
  // Proakis §3.3.1: f_i(t) = f_c + k_f·m(t)
  return fc + kf * mVal;
}

/**
 * First-kind Bessel function J_n(β) via series expansion.
 * Used for tone-FM line amplitudes (sidebands).
 * Proakis §3.3.2, Table 3.1
 * Series: J_n(β) = (β/2)^n · Σ_{m=0}^{∞} (-1)^m / (m!(m+n)!) · (β/2)^{2m}
 */
export function besselJ(n: number, beta: number): number {
  const absN = Math.abs(n);
  const halfBeta = beta / 2;

  // Compute (β/2)^n
  let power = 1;
  for (let i = 0; i < absN; i++) {
    power *= halfBeta;
  }

  // Factorial lookup
  const factorial = (k: number): number => {
    let f = 1;
    for (let i = 2; i <= k; i++) f *= i;
    return f;
  };

  // Sum series: Σ_{m=0}^{∞} (-1)^m / (m!(m+n)!) · (β/2)^{2m}
  let sum = 0;
  const x2 = halfBeta * halfBeta;
  for (let m = 0; m < 50; m++) {
    const term = (Math.pow(-1, m) / (factorial(m) * factorial(m + absN))) * Math.pow(x2, m);
    sum += term;
    if (Math.abs(term) < 1e-14) break;
  }

  return n >= 0 ? power * sum : Math.pow(-1, absN) * power * sum;
}

/**
 * Carson bandwidth B = 2(β+1)f_m for FM.
 * Proakis §3.3.2 s.103
 * β = modulation index = Δf / f_m = kf·A_m / f_m
 */
export function carsonBandwidth(beta: number, fm: number): number {
  // Proakis §3.3.2: B = 2(β+1)·f_m
  return 2 * (beta + 1) * fm;
}

/**
 * PLL carrier recovery: phase estimate θ̂(t).
 * Proakis §3.3.3 s.107
 * Simplified discrete-time loop: phase detector + integrator.
 */
export function pllRecoverPhase(u: number[], fc: number, fs: number): number[] {
  const theta = new Array<number>(u.length);
  let thetaEst = 0;
  const loopGain = 0.01; // Small integration step for convergence
  const omega = (2 * Math.PI * fc) / fs; // Digital frequency

  for (let n = 0; n < u.length; n++) {
    // Phase detector: error = u[n]·sin(θ̂)
    // (multiply received signal by negative sine of estimated phase)
    const phaseError = u[n] * Math.sin(thetaEst);
    // Integrator: update phase estimate
    thetaEst += omega + loopGain * phaseError;
    // Wrap to [-π, π]
    while (thetaEst > Math.PI) thetaEst -= 2 * Math.PI;
    while (thetaEst < -Math.PI) thetaEst += 2 * Math.PI;
    theta[n] = thetaEst;
  }

  return theta;
}

/**
 * Superheterodyne mixer: RF → IF + image.
 * Proakis §3.4 s.115
 * Mix rf[n] by local oscillator cos(2π fLo n/fs);
 * result has sum (≈2fc+fIf) and difference (fIf) components.
 */
export function heterodyneMix(
  rf: number[],
  fLo: number,
  fIf: number,
  fs: number,
): { if: number[]; image: number } {
  const ifSignal = new Array<number>(rf.length);
  const omega = (2 * Math.PI * fLo) / fs;

  for (let n = 0; n < rf.length; n++) {
    // Proakis §3.4: Multiply by cos(2π fLo n/fs)
    const lo = Math.cos(omega * n);
    const mixed = rf[n] * lo;
    // After lowpass filtering to extract difference component at fIf
    ifSignal[n] = mixed; // Conceptually after LPF, keep only fIf band
  }

  // Image frequency location (sum component would be at fLo + fIf when fLo=fc+fIf)
  const imageFreq = fLo + fIf;

  return { if: ifSignal, image: imageFreq };
}
