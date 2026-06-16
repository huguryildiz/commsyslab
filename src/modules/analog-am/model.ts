import { linspace } from '@/lib/dsp/math';
import {
  evalSignal,
  periodicTones,
  periodicWave,
  signalBandwidth,
  signalPeak,
  signalPower,
  type Tone,
} from '@/lib/dsp/signals';
import type { AmMode } from '@/lib/dsp/analog';
import {
  amSignal,
  amEfficiency,
  envelopeDetect,
  pllRecoverPhase,
  vsbFilter,
} from '@/lib/dsp/analog';
import { spectrum } from '@/lib/dsp/fft';
import {
  powerLawModulator,
  switchingModulator,
  balancedModulator,
  ringModulator,
  fdmCompose,
  fdmSeparate,
  qamModulate,
  qamDemod,
} from '@/lib/dsp/am-impl';

/** Selectable message waveform (Fourier-page signal family). */
export type MessageWave = 'sine' | 'square' | 'triangle' | 'sawtooth' | 'twoTone' | 'threeTone';

/**
 * AM modulation view parameters.
 */
export interface AnalogAmParams {
  mode: AmMode;
  messageFreq: number; // Hz (fundamental f_m)
  carrierFreq: number; // Hz
  carrierAmp: number; // V
  modIndex: number; // a (modulation depth)
  messageWave?: MessageWave; // message signal shape (default: sine tone)
}

/**
 * Build the message as a sum of cosine tones for the selected waveform.
 * Sine → single tone; square/triangle/sawtooth → truncated Fourier series with
 * the top harmonic capped so it stays well below the carrier (no sideband
 * overlap / aliasing); two/three-tone → harmonically-related preset tones.
 */
export function buildMessageTones(p: AnalogAmParams): Tone[] {
  const fm = p.messageFreq;
  const wave = p.messageWave ?? 'sine';
  switch (wave) {
    case 'sine':
      return [{ freq: fm, amp: 1 }];
    case 'twoTone':
      return [
        { freq: fm, amp: 1 },
        { freq: 2 * fm, amp: 0.6 },
      ];
    case 'threeTone':
      return [
        { freq: fm, amp: 1 },
        { freq: 2 * fm, amp: 0.6 },
        { freq: 3 * fm, amp: 0.4 },
      ];
    case 'square':
    case 'triangle':
    case 'sawtooth': {
      // Cap harmonics: top harmonic ≤ 0.6·fc, and never more than 11.
      const maxHarmonic = Math.max(1, Math.min(11, Math.floor((0.6 * p.carrierFreq) / fm)));
      return periodicTones(wave, fm, maxHarmonic);
    }
  }
}

/**
 * Power & efficiency view parameters.
 */
export interface AnalogPowerParams {
  amParams: AnalogAmParams;
}

/**
 * Demodulation view parameters.
 */
export interface AnalogDemodParams {
  method: 'envelope' | 'coherent' | 'pll';
  amParams?: AnalogAmParams;
}

/**
 * Superheterodyne receiver view parameters.
 */
export interface AnalogSuperParams {
  stationFreq: number; // RF carrier (Hz)
  ifFreq: number; // Fixed IF (Hz), typically 455 kHz for AM radio
  showImage?: boolean; // add an interfering image station to the RF band
  preselectorOn?: boolean; // RF preselector filter rejects the image before mixing
}

/**
 * Result from AM modulation view computation.
 */
export interface AnalogAmView {
  // Time-domain samples
  time: number[]; // seconds
  message: number[]; // message signal m(t)
  carrier: number[]; // carrier cos(2π fc t)
  modulated: number[]; // modulated signal u(t)
  envelope?: number[]; // envelope for conventional AM
  // Spectral data — message (baseband) and AM signal (around the carrier)
  msgSpecFreq: number[]; // baseband frequencies (Hz)
  msgSpecMag: number[]; // message magnitude spectrum |M(f)|
  specFreq: number[]; // positive frequencies (Hz)
  specMag: number[]; // magnitude spectrum (normalized)
  // Status
  isOvermodulated: boolean; // a > 1
}

/**
 * Result from power/efficiency view.
 */
export interface AnalogPowerView {
  carrierPower: number; // Pc = Ac²/2
  sidebandPower: number; // Ps (conventional AM)
  totalPower: number; // Pc + Ps
  efficiency: number; // η in [0, 1]
}

/**
 * Result from the demodulation view.
 */
export interface AnalogDemodView {
  time: number[];
  original: number[]; // original message m(t) (normalized)
  recovered: number[]; // recovered message after the chosen detector
  /** True vs PLL-estimated carrier (PLL method only). */
  carrierTrue?: number[];
  carrierEst?: number[];
  /** True when the detector reproduces the message faithfully. */
  faithful: boolean;
}

/** Which side of the 1/f_c ≪ RC ≪ 1/W window the chosen RC lands on. */
export type EnvelopeRegime = 'over' | 'small' | 'good' | 'large';

/**
 * Parameters for the diode + RC envelope-detector dynamics view (Fig 3.28).
 */
export interface EnvelopeDetectorParams {
  amParams: AnalogAmParams;
  rc: number; // RC time constant (s)
}

/**
 * Result from the envelope-detector dynamics view: the AM waveform the diode
 * sees, the ideal envelope it should follow, and the actual RC capacitor voltage
 * — the three traces of Proakis Fig 3.28.
 */
export interface EnvelopeDetectorView {
  time: number[]; // local display axis [0, duration] (s)
  rxSignal: number[]; // r(t) — AM waveform at the diode
  idealEnvelope: number[]; // A_c[1 + a·m_n(t)] — dashed target (signed)
  rcOutput: number[]; // v_C(t) — capacitor voltage from the peak detector
  regime: EnvelopeRegime; // ripple / good / lag / over-modulation
  rcValue: number; // RC (s)
  rcMin: number; // 1/f_c (s) — lower guideline
  rcMax: number; // 1/W (s) — upper guideline
  faithful: boolean; // regime === 'good'
}

/** Role of a spectral component as the signal flows down the receiver chain. */
export type SuperRole = 'wanted' | 'image' | 'other' | 'discard';

/** A single spectral lobe (drawn with bandwidth 2W, not a bare line). */
export interface SuperStation {
  freq: number; // center frequency (Hz); 0 for baseband lobes
  amp: number; // relative height 0..1
  role: SuperRole;
}

/** The five points the signal is observed at along the chain. */
export type SuperStageId = 'rf' | 'mixer' | 'if' | 'detector' | 'audio';

/** Spectrum shown under one block of the receiver chain (one filmstrip cell). */
export interface SuperStage {
  id: SuperStageId;
  axis: [number, number]; // frequency window for this stage (Hz)
  stations: SuperStation[]; // spectral content at this point
  passband?: [number, number]; // shaded filter window (Hz)
  loMark?: number; // local-oscillator reference line (Hz), mixer only
  baseband?: boolean; // lobes are message |M(f)| centered at 0 (detector/audio)
  collision?: boolean; // image survived to here → garbled output
}

/**
 * Result from the superheterodyne receiver view: the signal's journey through
 * the chain as a five-stage spectral filmstrip (Proakis §3.5, Fig. 3.33–3.34).
 */
export interface AnalogSuperView {
  stationFreq: number; // f_c (Hz)
  ifFreq: number; // f_IF (Hz)
  loFreq: number; // f_LO = f_c + f_IF (Hz)
  imageFreq: number; // f_image = f_c + 2 f_IF (Hz)
  // Frequency-translation diagram (RF band -> IF band).
  rfLines: number[]; // RF spectral lines (desired + image)
  ifLine: number; // where everything lands after mixing (f_IF)
  // Filmstrip model.
  W: number; // message half-bandwidth (Hz); AM channel = 2W
  showImage: boolean;
  preselectorOn: boolean;
  imageSurvives: boolean; // image reaches the IF (only when shown and preselector off)
  stages: SuperStage[]; // RF → Mixer → IF → Detector → Audio
}

/**
 * Sliding-window absolute-peak envelope: approximates a physical envelope detector
 * by taking the maximum |u| over one carrier period at each sample.
 * Works for SSB and VSB where the analytic-signal approach would require a Hilbert transform.
 */
function slidingPeakEnvelope(signal: number[], windowSamples: number): number[] {
  const win = Math.max(1, windowSamples);
  return signal.map((_, i) => {
    let max = 0;
    const start = Math.max(0, i - win + 1);
    for (let k = start; k <= i; k++) {
      const v = Math.abs(signal[k]);
      if (v > max) max = v;
    }
    return max;
  });
}

/** Hann window of length N — tapers the FFT buffer to suppress spectral leakage. */
function hann(N: number): number[] {
  const w = new Array<number>(N);
  for (let n = 0; n < N; n++) w[n] = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (N - 1));
  return w;
}

/**
 * FFT magnitude spectrum |U(f)| of the AM signal around the carrier.
 * The spectrum is computed from a windowed time buffer via `spectrum()` rather
 * than hardcoded analytic lines. VSB is generated as DSB-SC and then shaped by
 * the real vestigial filter (Proakis §3.2.4).
 */
export function buildAmSpectrum(p: AnalogAmParams): { specFreq: number[]; specMag: number[] } {
  const fm = p.messageFreq;
  const fc = p.carrierFreq;
  const fs = 8 * fc; // oversample so carrier + sidebands sit well below Nyquist
  const N = 8192; // power of two for the radix-2 FFT
  const msg = buildMessageTones(p);
  // VSB is DSB-SC filtered; generate the DSB buffer, then shape the spectrum.
  const genMode: AmMode = p.mode === 'vsb' ? 'dsb' : p.mode;
  const win = hann(N);
  const x = new Array<number>(N);
  for (let n = 0; n < N; n++) {
    x[n] = amSignal(genMode, msg, fc, p.carrierAmp, p.modIndex, n / fs) * win[n];
  }
  const sp = spectrum(x, fs);
  // Two-sided display band: lines at ±f_c (plus sidebands); width follows the
  // message bandwidth W so every sideband is visible on both sides of 0.
  const W = signalBandwidth(msg);
  const hi = fc + W + 2 * fm;
  const pos = bandSlice(sp.freq, sp.mag, 0, hi);
  // vestige half-width = 2·fm so the lower sideband at f_c−fm lands mid-ramp
  // (H = 0.25), leaving a visible vestige rather than being fully removed.
  const posMag = p.mode === 'vsb' ? vsbFilter(pos.m, pos.f, fc, 2 * fm) : pos.m;
  return mirrorSpectrum(pos.f, posMag);
}

/**
 * Mirror a one-sided (f ≥ 0) magnitude spectrum into a two-sided one over
 * [−hi, +hi]. For a real signal |X(−f)| = |X(f)|, so the negative half is the
 * reflection of the positive half (the f = 0 sample is not duplicated).
 */
function mirrorSpectrum(
  posFreq: number[],
  posMag: number[],
): { specFreq: number[]; specMag: number[] } {
  const negFreq: number[] = [];
  const negMag: number[] = [];
  for (let i = posFreq.length - 1; i >= 1; i--) {
    negFreq.push(-posFreq[i]);
    negMag.push(posMag[i]);
  }
  return { specFreq: [...negFreq, ...posFreq], specMag: [...negMag, ...posMag] };
}

/**
 * FFT magnitude spectrum |M(f)| of the baseband message tone. Uses the same
 * windowed-FFT approach as `buildAmSpectrum` so the message and AM spectra read
 * consistently; displayed over the baseband band [0, 2.5·fm].
 */
export function buildMsgSpectrum(p: AnalogAmParams): { specFreq: number[]; specMag: number[] } {
  const fm = p.messageFreq;
  const msg = buildMessageTones(p);
  const W = signalBandwidth(msg);
  const fs = Math.max(32 * fm, 8 * W); // oversample past the highest harmonic
  const N = 8192;
  const win = hann(N);
  const x = new Array<number>(N);
  for (let n = 0; n < N; n++) x[n] = evalSignal(msg, n / fs) * win[n];
  const sp = spectrum(x, fs);
  // Two-sided baseband display: lines at ±(harmonics), out to the highest
  // harmonic plus a little headroom.
  const { f, m } = bandSlice(sp.freq, sp.mag, 0, W + 1.5 * fm);
  return mirrorSpectrum(f, m);
}

/**
 * Build AM modulation view: time-domain waveforms + spectrum.
 */
export function buildAnalogAmView(p: AnalogAmParams, tStart = 0): AnalogAmView {
  // Message signal — sum-of-tones for the selected waveform.
  const msg = buildMessageTones(p);
  const fm = p.messageFreq;
  const fc = p.carrierFreq;
  const Ac = p.carrierAmp;
  const a = p.modIndex;
  const wave = p.messageWave ?? 'sine';

  // Direct waveform evaluation for square/triangle/sawtooth avoids Gibbs artifacts
  // that the truncated Fourier series in periodicTones would introduce in the time domain.
  const isDirectWave = wave === 'square' || wave === 'sawtooth' || wave === 'triangle';
  // periodicWave returns values in [-1, 1] so its peak is exactly 1.
  const mPeak = isDirectWave ? 1 : (signalPeak(msg) || 1);
  const evalMsg = (t: number): number =>
    isDirectWave
      ? periodicWave(wave as 'square' | 'sawtooth' | 'triangle', fm, t)
      : evalSignal(msg, t);

  // Sample over ~3 message periods or 10 carrier cycles, whichever is longer
  const duration = Math.max(3 / fm, 10 / fc);
  const fs = Math.max(20 * fc, 100 * fm); // Nyquist: 2*max(fc, fm)
  const N = Math.ceil(fs * duration);
  // Local (fixed) display axis [0, duration]; sampling tStart ahead scrolls the wave.
  const time = linspace(0, duration, N);

  const message = time.map((t) => evalMsg(tStart + t));
  const carrier = time.map((t) => Math.cos(2 * Math.PI * fc * (tStart + t)));
  // For conventional/DSB, compute u(t) directly so the envelope tracks the clean waveform.
  // SSB/VSB require Hilbert transform — keep the spectral (tones) path for those modes.
  let modulated: number[];
  if (p.mode === 'conventional' || p.mode === 'dsb') {
    modulated = time.map((t) => {
      const mt = evalMsg(tStart + t);
      const mn = mt / mPeak;
      const cos = Math.cos(2 * Math.PI * fc * (tStart + t));
      return p.mode === 'conventional' ? Ac * (1 + a * mn) * cos : mt * cos;
    });
  } else {
    modulated = time.map((t) => amSignal(p.mode, msg, fc, Ac, a, tStart + t));
  }
  // Envelope per mode:
  //   conventional → analytic Ac(1 + a·mn(t)); DSB-SC → Ac|mn(t)|
  //   SSB/VSB → sliding-window peak over one carrier period
  const samplesPerCarrier = Math.ceil(fs / fc);
  const envelope =
    p.mode === 'conventional'
      ? time.map((s) => Ac * (1 + a * evalMsg(tStart + s) / mPeak))
      : p.mode === 'dsb'
      ? time.map((s) => Ac * Math.abs(evalMsg(tStart + s) / mPeak))
      : slidingPeakEnvelope(modulated, samplesPerCarrier);

  const { specFreq, specMag } = buildAmSpectrum(p);
  const msgSpec = buildMsgSpectrum(p);

  const isOvermodulated = a > 1;

  return {
    time,
    message,
    carrier,
    modulated,
    envelope,
    msgSpecFreq: msgSpec.specFreq,
    msgSpecMag: msgSpec.specMag,
    specFreq,
    specMag,
    isOvermodulated,
  };
}

/**
 * Build power & efficiency view.
 */
export function buildAnalogPowerView(p: AnalogPowerParams): AnalogPowerView {
  const ap = p.amParams;
  const Ac = ap.carrierAmp;
  const a = ap.modIndex;

  // Normalized message power P_{m_n} = P_m / m_peak² (m_n(t) = m(t)/m_peak ∈ [−1,1]).
  // Single sine tone → 0.5; multi-tone / non-sinusoidal messages differ.
  const tones = buildMessageTones(ap);
  const peak = signalPeak(tones) || 1;
  const Pmn = signalPower(tones) / (peak * peak);

  // Carrier power: Pc = Ac²/2
  const carrierPower = (Ac * Ac) / 2;

  // Sideband power (conventional AM): Ps = a²·P_{m_n}·(Ac²/2)
  const sidebandPower = a * a * Pmn * (Ac * Ac) / 2;

  // Total power
  const totalPower = carrierPower + sidebandPower;

  // Efficiency η = Ps / (Pc + Ps) = sideband power / total power
  // Or: η = a² Pmn / (1 + a² Pmn)
  const efficiency = amEfficiency(a, Pmn);

  return {
    carrierPower,
    sidebandPower,
    totalPower,
    efficiency,
  };
}

/** Simple moving-average lowpass — pedagogical baseband recovery after mixing. */
function movingAverage(x: number[], win: number): number[] {
  const out = new Array<number>(x.length).fill(0);
  let acc = 0;
  for (let n = 0; n < x.length; n++) {
    acc += x[n];
    if (n >= win) acc -= x[n - win];
    out[n] = acc / Math.min(n + 1, win);
  }
  return out;
}

/**
 * Build demodulation view: recovered message vs original for the chosen detector.
 * Proakis §3.2.5 (AM detectors) & §3.3.3 (PLL / FM discriminator).
 */
export function buildAnalogDemodView(p: AnalogDemodParams, tStart = 0): AnalogDemodView {
  const ap = p.amParams ?? {
    mode: 'conventional' as AmMode,
    messageFreq: 1000,
    carrierFreq: 20000,
    carrierAmp: 1,
    modIndex: 0.5,
  };

  const fm = ap.messageFreq;
  const fc = ap.carrierFreq;
  const wave = ap.messageWave ?? 'sine';
  const duration = 3 / fm;
  const fs = Math.max(20 * fc, 100 * fm);
  const N = Math.ceil(fs * duration);
  // Local (fixed) display axis; sampling tStart ahead scrolls every trace.
  const time = linspace(0, duration, N);

  // Build message signal: direct eval for non-sinusoidal waves (avoids Gibbs),
  // evalSignal for tone-based (sine, two-tone, three-tone).
  const tones = buildMessageTones(ap);
  const isDirectWave = wave === 'square' || wave === 'sawtooth' || wave === 'triangle';
  const mPeak = isDirectWave ? 1 : (signalPeak(tones) || 1);
  const evalMsg = (tt: number): number =>
    isDirectWave
      ? periodicWave(wave as 'square' | 'sawtooth' | 'triangle', fm, tt)
      : evalSignal(tones, tt);

  // Normalize original to [-1, 1] so it overlays cleanly with recovered (= a·mₙ(t)).
  const original = time.map((tt) => evalMsg(tStart + tt) / mPeak);

  // Lowpass window ~ one carrier period, to strip the 2·fc product term.
  const win = Math.max(2, Math.round(fs / fc));

  let recovered: number[];
  let carrierTrue: number[] | undefined;
  let carrierEst: number[] | undefined;
  let faithful = true;

  switch (p.method) {
    case 'envelope': {
      // Proakis §3.2.5: envelope detector tracks Ac[1 + a·mn(t)]; valid only when a ≤ 1.
      const a = ap.modIndex;
      recovered = time.map((tt) => a * (evalMsg(tStart + tt) / mPeak));
      faithful = a <= 1; // a>1 -> envelope distortion
      break;
    }
    case 'coherent': {
      // Proakis §3.2.5: LPF{ u(t)·cos(2π fc t) } ∝ ½ mn(t) (DSB-SC coherent detector).
      const prod = time.map((tt) => {
        const mn = evalMsg(tStart + tt) / mPeak;
        const cos = Math.cos(2 * Math.PI * fc * (tStart + tt));
        return mn * cos * cos; // mn(t)·cos²(2π fc t) = ½mn(t) + HF term
      });
      recovered = movingAverage(prod, win).map((v) => 2 * v); // undo the ½ factor → mn(t)
      break;
    }
    case 'pll': {
      // Proakis §3.3.3: PLL estimates the carrier phase θ̂(t); cos(θ̂) recovers the carrier.
      const u = time.map((tt) => Math.cos(2 * Math.PI * fc * (tStart + tt)));
      const theta = pllRecoverPhase(u, fc, fs);
      carrierTrue = u;
      carrierEst = theta.map((th) => Math.cos(th));
      // Coherent detection with the PLL-recovered carrier.
      const prod = time.map((tt, n) => {
        const mn = evalMsg(tStart + tt) / mPeak;
        const cos = Math.cos(2 * Math.PI * fc * (tStart + tt));
        return mn * cos * (carrierEst as number[])[n];
      });
      recovered = movingAverage(prod, win).map((v) => 2 * v);
      break;
    }
  }

  return { time, original, recovered, carrierTrue, carrierEst, faithful };
}

/**
 * Build the envelope-detector dynamics view (Proakis §3.3, Figs 3.27–3.28).
 * Runs the physical diode + RC peak detector over the conventional-AM waveform
 * and classifies the chosen RC against the 1/f_c ≪ RC ≪ 1/W window. Sampling
 * `tStart` ahead scrolls all three traces; a short pre-roll warm-up settles the
 * recursive detector so consecutive animation frames line up.
 */
export function buildEnvelopeDetectorView(
  p: EnvelopeDetectorParams,
  tStart = 0,
): EnvelopeDetectorView {
  const ap = p.amParams;
  const fm = ap.messageFreq;
  const fc = ap.carrierFreq;
  const Ac = ap.carrierAmp;
  const a = ap.modIndex;
  const rc = p.rc;
  // Build message signal for all wave types (direct eval for non-sinusoidal).
  const wave = ap.messageWave ?? 'sine';
  const tones = buildMessageTones(ap);
  const isDirectWave = wave === 'square' || wave === 'sawtooth' || wave === 'triangle';
  const mPeak = isDirectWave ? 1 : (signalPeak(tones) || 1);
  const evalMsg = (tt: number): number =>
    isDirectWave
      ? periodicWave(wave as 'square' | 'sawtooth' | 'triangle', fm, tt)
      : evalSignal(tones, tt);

  // Resolve the carrier well (~40 samples/cycle) but keep N bounded for 60 fps:
  // show ~2 message periods, capping the visible sample count.
  const fs = 40 * fc;
  const MAX_N = 4000;
  let duration = 2 / fm;
  if (fs * duration > MAX_N) duration = MAX_N / fs;
  const N = Math.max(2, Math.round(fs * duration));
  const time = linspace(0, duration, N);

  // Pre-roll warm-up (a few RC plus a message period, capped) discarded after
  // the recursive filter settles, so the scrolling trace does not flicker.
  const warm = Math.min(Math.max(5 * rc, 1 / fm), 5 / fm);
  const warmN = Math.round(fs * warm);
  const total = warmN + N;
  const t0 = tStart - warm;
  const rxFull = new Array<number>(total);
  for (let i = 0; i < total; i++) {
    // u(t) = Ac[1 + a·mₙ(t)]·cos(2π fc t), Proakis §3.2.2
    const mn = evalMsg(t0 + i / fs) / mPeak;
    rxFull[i] = Ac * (1 + a * mn) * Math.cos(2 * Math.PI * fc * (t0 + i / fs));
  }
  const vFull = envelopeDetect(rxFull, fs, rc);

  const rxSignal = rxFull.slice(warmN);
  const rcOutput = vFull.slice(warmN);
  // Ideal envelope = Ac[1 + a·mₙ(t)], Proakis §3.2.2
  const idealEnvelope = time.map((tt) => Ac * (1 + a * (evalMsg(tStart + tt) / mPeak)));

  // Regime against book's guideline window. W = highest harmonic of the message
  // (= fm for sine, higher for square/triangle/sawtooth/multi-tone). Faithful
  // tracking needs 1/fc ≪ RC ≪ 1/W (Proakis §3.3, Figs 3.27–3.28).
  const W = isDirectWave ? signalBandwidth(buildMessageTones(ap)) || fm : signalBandwidth(tones) || fm;
  const rcMin = 1 / fc; // carrier period
  const rcMax = 1 / W; // 1/W: upper limit (Proakis §3.3)
  let regime: EnvelopeRegime;
  if (a > 1) regime = 'over';
  else if (rc < 3 * rcMin) regime = 'small'; // < a few carrier periods → ripple
  else if (rc > 0.3 * rcMax) regime = 'large'; // > ~1/3 message period → lag
  else regime = 'good';

  return {
    time,
    rxSignal,
    idealEnvelope,
    rcOutput,
    regime,
    rcValue: rc,
    rcMin,
    rcMax,
    faithful: regime === 'good',
  };
}

/** Message half-bandwidth W (Hz); an AM broadcast channel is 2W = 10 kHz (Proakis §3.5). */
const SUPER_W = 5_000;
/** Other broadcasters scattered on the dial, to show the band the antenna really sees. */
const SUPER_OTHER_STATIONS = [600_000, 770_000, 930_000, 1_150_000, 1_400_000];

/**
 * Build the superheterodyne receiver view as a five-stage spectral filmstrip
 * tracing one station's journey RF → Mixer → IF → Detector → Audio.
 *
 * Proakis §3.5 (pp. 167–169): high-side LO f_LO = f_c + f_IF, common IF = 455 kHz,
 * image at f_image = f_c + 2 f_IF. The RF preselector (bandwidth B_RF < 2 f_IF)
 * rejects the image; the narrow IF filter provides adjacent-channel selectivity.
 */
export function buildAnalogSuperView(p: AnalogSuperParams): AnalogSuperView {
  const fc = p.stationFreq;
  const fIF = p.ifFreq;
  const loFreq = fc + fIF; // f_LO = f_c + f_IF
  const imageFreq = fc + 2 * fIF; // f_image = f_c + 2 f_IF
  const W = SUPER_W;
  const showImage = p.showImage ?? false;
  const preselectorOn = p.preselectorOn ?? true;
  // The image only reaches the mixer/IF if the RF preselector is switched off.
  const imageSurvives = showImage && !preselectorOn;

  // Stage 1 — RF amp (antenna): the crowded broadcast band.
  const rfStations: SuperStation[] = [];
  for (const f of SUPER_OTHER_STATIONS) {
    if (Math.abs(f - fc) < 3 * W) continue; // hide neighbours sitting on the wanted lobe
    if (showImage && Math.abs(f - imageFreq) < 3 * W) continue;
    rfStations.push({ freq: f, amp: 0.4, role: 'other' });
  }
  rfStations.push({ freq: fc, amp: 1, role: 'wanted' });
  if (showImage) rfStations.push({ freq: imageFreq, amp: 0.62, role: 'image' });
  const rfAxisMax = Math.max(1_700_000, showImage ? imageFreq + 120_000 : 0);
  const rfHalf = 0.8 * fIF; // B_RF/2 — passes f_c ± W, rejects the image at +2 f_IF

  // Stage 2 — Mixer: ×LO produces difference (→ IF) and sum (discarded) terms.
  const mixStations: SuperStation[] = [
    { freq: fIF, amp: 1, role: 'wanted' }, // |f_c − f_LO| = f_IF
    { freq: fc + loFreq, amp: 0.4, role: 'discard' }, // sum term f_c + f_LO
  ];
  if (imageSurvives) mixStations.push({ freq: fIF, amp: 0.62, role: 'image' }); // also lands on IF
  const mixAxisMax = (fc + loFreq) * 1.06;

  // Stage 3 — IF filter: keep only the fixed 455 kHz slice.
  const ifStations: SuperStation[] = [{ freq: fIF, amp: 1, role: 'wanted' }];
  if (imageSurvives) ifStations.push({ freq: fIF, amp: 0.62, role: 'image' });
  const ifHalf = 80_000;

  // Stages 4 & 5 — Detector / Audio: baseband message |M(f)|.
  const baseband: SuperStation[] = [{ freq: 0, amp: 1, role: 'wanted' }];
  if (imageSurvives) baseband.push({ freq: 0, amp: 0.62, role: 'image' });

  // Two-sided spectra: each axis is symmetric about f = 0, and the panel mirrors
  // every lobe / passband / LO line to ±f (real signals have |·| even in f).
  const stages: SuperStage[] = [
    {
      id: 'rf',
      axis: [-rfAxisMax, rfAxisMax],
      stations: rfStations,
      passband: preselectorOn ? [fc - rfHalf, fc + rfHalf] : undefined,
    },
    {
      id: 'mixer',
      axis: [-mixAxisMax, mixAxisMax],
      stations: mixStations,
      loMark: loFreq,
      collision: imageSurvives,
    },
    {
      id: 'if',
      axis: [-(fIF + ifHalf), fIF + ifHalf],
      stations: ifStations,
      passband: [fIF - W, fIF + W],
      collision: imageSurvives,
    },
    { id: 'detector', axis: [-7_000, 7_000], stations: baseband, baseband: true, collision: imageSurvives },
    { id: 'audio', axis: [-7_000, 7_000], stations: baseband, baseband: true, collision: imageSurvives },
  ];

  return {
    stationFreq: fc,
    ifFreq: fIF,
    loFreq,
    imageFreq,
    rfLines: [fc, imageFreq],
    ifLine: fIF,
    W,
    showImage,
    preselectorOn,
    imageSurvives,
    stages,
  };
}

export type ModulatorKind = 'power-law' | 'switching' | 'balanced' | 'ring';

export interface ModulatorParams {
  modulator: ModulatorKind;
  messageFreq: number; // Hz
  carrierFreq: number; // Hz
  carrierAmp: number; // V
  messageWave?: MessageWave;
}

export interface ModulatorView {
  time: number[];
  node: number[]; // intermediate "dirty" node signal (pre-BPF)
  output: number[]; // BPF / summed output (the desired AM signal)
  dirtyFreq: number[];
  dirtyMag: number[]; // spectrum before the bandpass filter (shows unwanted terms)
  cleanFreq: number[];
  cleanMag: number[]; // spectrum after the bandpass filter (desired AM)
  producesDsb: boolean; // balanced/ring → DSB-SC; power-law/switching → conventional
}

/** Keep only the positive-frequency bins of a two-sided spectrum within [lo, hi]. */
function bandSlice(freq: number[], mag: number[], lo: number, hi: number): { f: number[]; m: number[] } {
  const f: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < freq.length; i++) {
    if (freq[i] >= lo && freq[i] <= hi) {
      f.push(freq[i]);
      m.push(mag[i]);
    }
  }
  return { f, m };
}

/**
 * Build the modulator view: the intermediate (pre-BPF) node signal and the
 * recovered output, plus their FFT spectra so the "unwanted terms → BPF → clean
 * AM" story is explicit. Proakis §3.3.
 */
export function buildModulatorView(p: ModulatorParams): ModulatorView {
  const fm = p.messageFreq;
  const fc = p.carrierFreq;
  const fs = 8 * fc;
  const N = 8192;
  const t = Array.from({ length: N }, (_, i) => i / fs);
  // Use the selected waveform (Fourier-series tones for all types).
  const msg = buildMessageTones({
    messageFreq: fm,
    carrierFreq: fc,
    messageWave: p.messageWave,
    mode: 'conventional',
    carrierAmp: 1,
    modIndex: 0,
  });

  let node: number[];
  let output: number[];
  let producesDsb: boolean;
  switch (p.modulator) {
    case 'power-law': {
      const r = powerLawModulator(msg, fc, p.carrierAmp, 1, 0.3, t);
      node = r.vo;
      output = r.uBpf;
      producesDsb = false;
      break;
    }
    case 'switching': {
      const r = switchingModulator(msg, fc, p.carrierAmp, t, 15);
      node = r.vo;
      output = r.uBpf;
      producesDsb = false;
      break;
    }
    case 'balanced': {
      const r = balancedModulator(msg, fc, p.carrierAmp, t);
      node = r.upper; // show one branch as the "node" signal
      output = r.uOut;
      producesDsb = true;
      break;
    }
    case 'ring': {
      const r = ringModulator(msg, fc, t, 15);
      node = r.vo;
      output = r.uBpf;
      producesDsb = true;
      break;
    }
  }

  const hi = fc + 6 * fm;
  const lo = -hi; // include negative-frequency half for double-sided spectrum display
  const win = hann(N);
  const dirtySpec = spectrum(
    node.map((v, i) => v * win[i]),
    fs,
  );
  const cleanSpec = spectrum(
    output.map((v, i) => v * win[i]),
    fs,
  );
  const dirty = bandSlice(dirtySpec.freq, dirtySpec.mag, lo, hi);
  const clean = bandSlice(cleanSpec.freq, cleanSpec.mag, lo, hi);

  // Show a few message/carrier periods of the time-domain node + output.
  const showN = Math.min(N, Math.ceil(fs * Math.max(3 / fm, 10 / fc)));
  return {
    time: t.slice(0, showN),
    node: node.slice(0, showN),
    output: output.slice(0, showN),
    dirtyFreq: dirty.f,
    dirtyMag: dirty.m,
    cleanFreq: clean.f,
    cleanMag: clean.m,
    producesDsb,
  };
}

export interface FdmParams {
  channels: number; // K message signals (2…6)
  spacing: number; // carrier separation (Hz)
  bandwidth: number; // per-channel baseband bandwidth W (Hz)
  selected: number; // channel index to recover at the receiver
}
/** One FDM channel's occupied band [lo, hi] Hz plus its animation reveal phase. */
export interface FdmChannelBand {
  lo: number;
  hi: number;
  reveal: number; // cycle phase ∈ [0,1) at which this band lights up / appears
}
export interface FdmView {
  time: number[];
  recovered: number[]; // selected channel recovered at the receiver
  original: number[]; // selected channel's source message m_sel(t), for overlay
  specFreq: number[];
  specMag: number[];
  carriers: number[]; // carrier frequency fₖ per channel (Hz)
  messageFreqs: number[]; // single-tone message frequency per channel (Hz)
  bands: FdmChannelBand[];
  selected: number;
  W: number; // per-channel bandwidth (Hz)
  fMax: number; // spectrum x-axis upper bound (Hz)
  overlap: boolean; // spacing < 2·bandwidth → adjacent-band interference
}

/** First carrier of the FDM group (Hz). The group stacks upward from here. */
const FDM_FC0 = 20000;
/** One full animation cycle in clock-seconds (at speed ×1). */
export const FDM_PERIOD = 4;

/**
 * Cycle phase ∈ [0,1) at which channel `k`'s packet reaches its modulator and
 * the corresponding band appears in the composite spectrum. The K bands light
 * up one after another across the first half of the cycle (the transmit half),
 * so the block-diagram packets and the spectrum build stay in lockstep.
 */
export function fdmBandReveal(k: number, K: number): number {
  return K <= 1 ? 0.05 : 0.05 + 0.4 * (k / (K - 1));
}

/**
 * Single-tone message frequency for channel `k` (Hz). Tones are spread across
 * a fraction of the channel bandwidth W so every channel is visibly distinct
 * yet always sits inside its own passband (fₘ < W ⇒ survives demodulation).
 */
function fdmMessageFreq(k: number, K: number, W: number): number {
  const frac = K <= 1 ? 0.5 : 0.3 + 0.48 * (k / (K - 1));
  return W * frac;
}

export interface QamParams {
  m1Freq: number;
  m2Freq: number;
  carrierFreq: number;
  phaseErrorDeg: number;
}
export interface QamView {
  time: number[];
  m1: number[];
  m2: number[];
  m1Hat: number[];
  m2Hat: number[];
  crosstalkDb: number;
}

/**
 * Build the FDM multiplexer view: composite spectrum + one recovered channel.
 * Each message is a single tone DSB-SC-modulated onto its own carrier; the
 * channels are spaced by `spacing` Hz starting from fc0 = 20 kHz (Proakis §3.4.1).
 * overlap = true when spacing < 2·bandwidth, indicating adjacent-band interference.
 */
export function buildFdmView(p: FdmParams): FdmView {
  const K = Math.max(1, Math.round(p.channels));
  const W = p.bandwidth;
  const carriers = Array.from({ length: K }, (_, k) => FDM_FC0 + k * p.spacing);
  const messageFreqs = Array.from({ length: K }, (_, k) => fdmMessageFreq(k, K, W));
  const fcMax = carriers[K - 1];
  const fs = 8 * (fcMax + W);
  const N = 8192;
  const t = Array.from({ length: N }, (_, i) => i / fs);
  const messages = messageFreqs.map((f) => [{ freq: f, amp: 1 }]);
  const { composite } = fdmCompose(messages, carriers, t);
  const sel = Math.min(Math.max(0, p.selected), K - 1);
  const recovered = fdmSeparate(composite, fs, carriers[sel], W, t);
  const win = hann(N);
  const sp = spectrum(
    composite.map((v, i) => v * win[i]),
    fs,
  );
  const fMax = fcMax + 4 * W;
  const { f, m } = bandSlice(sp.freq, sp.mag, 0, fMax);
  const showN = Math.min(N, Math.ceil(fs * 0.003));
  const tShown = t.slice(0, showN);
  const original = tShown.map((tt) => Math.cos(2 * Math.PI * messageFreqs[sel] * tt));
  const bands: FdmChannelBand[] = carriers.map((fc, k) => ({
    lo: fc - W,
    hi: fc + W,
    reveal: fdmBandReveal(k, K),
  }));
  return {
    time: tShown,
    recovered: recovered.slice(0, showN),
    original,
    specFreq: f,
    specMag: m,
    carriers,
    messageFreqs,
    bands,
    selected: sel,
    W,
    fMax,
    overlap: p.spacing < 2 * W,
  };
}

/**
 * Build the QAM view: modulated signal, recovered channels, and crosstalk.
 * A phase error at the receiver couples the I and Q channels (Proakis §3.4.2).
 * crosstalkDb = 20 log10(leak/own) measured at the message tone frequencies.
 */
export function buildQamView(p: QamParams): QamView {
  const fc = p.carrierFreq;
  const fs = 8 * fc;
  const N = 8192;
  const t = Array.from({ length: N }, (_, i) => i / fs);
  const W = Math.max(p.m1Freq, p.m2Freq) * 1.5;
  const m1 = [{ freq: p.m1Freq, amp: 1 }];
  const m2 = [{ freq: p.m2Freq, amp: 1 }];
  const u = qamModulate(m1, m2, fc, 1, t);
  const { m1Hat, m2Hat } = qamDemod(u, fc, t, fs, W, (p.phaseErrorDeg * Math.PI) / 180);
  const corr = (sig: number[], f: number) =>
    Math.abs(sig.reduce((s, v, i) => s + v * Math.cos(2 * Math.PI * f * t[i]), 0)) / sig.length;
  const own = corr(m1Hat, p.m1Freq);
  const leak = corr(m1Hat, p.m2Freq);
  const crosstalkDb = 20 * Math.log10((leak + 1e-9) / (own + 1e-9));
  const showN = Math.min(N, Math.ceil(fs * Math.max(3 / p.m1Freq, 10 / fc)));
  return {
    time: t.slice(0, showN),
    m1: t.slice(0, showN).map((tt) => Math.cos(2 * Math.PI * p.m1Freq * tt)),
    m2: t.slice(0, showN).map((tt) => Math.cos(2 * Math.PI * p.m2Freq * tt)),
    m1Hat: m1Hat.slice(0, showN),
    m2Hat: m2Hat.slice(0, showN),
    crosstalkDb,
  };
}
