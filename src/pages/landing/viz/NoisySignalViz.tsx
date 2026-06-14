import { useCanvasTicker, type DrawFn } from '../useCanvasTicker';
import { VIZ, alpha, gaussian } from './palette';
import { advanceNoiseTrace, makeBandLimitedSampler, makeNoiseTrace } from './noiseTrace';

const TAU = Math.PI * 2;

/** Noise-trace columns per panel; the texture scrolls left with the wave. */
const COLS_PER_PANEL = 90;
/** Advance the noise ensemble one sample every N frames (scroll speed). */
const FRAMES_PER_STEP = 2;
/** Horizontal inset inside each panel so traces don't touch the divider/edges. */
const PAD = 7;

/** Message cycles shown across a panel (one slow envelope bulge). */
const MSG_CYCLES = 1.0;
/** AM carrier cycles across a panel. */
const AM_CARRIER_CYCLES = 8;
/** FM mean carrier cycles across a panel. */
const FM_CARRIER_CYCLES = 11;
/** FM modulation index (depth of the frequency swing). */
const FM_MOD_INDEX = 4.5;

/** AM: baseline additive-noise std-dev, as a fraction of carrier amplitude. */
const AM_NOISE_BASE = 0.1;
/** AM: extra noise where the envelope is small → larger noise-to-signal ratio. */
const AM_NOISE_LOW_SNR = 0.16;
/** FM: constant envelope amplitude (FM is a constant-envelope modulation). */
const FM_ENV = 0.82;
/** FM: peak phase deviation injected by channel noise (radians) → zero-crossing jitter. */
const FM_PHASE_NOISE = 0.5;
/** FM: small residual amplitude fuzz (post-limiter, much less than AM). */
const FM_AMP_NOISE = 0.04;

// Exactly one NoisySignalViz renders on the landing page, so module-scope noise
// buffers are safe (same pattern as NoiseViz). One drives vertical (amplitude)
// noise, the other drives FM phase jitter; each panel reads a disjoint half so
// the two sides show independent noise.
let ampBuf: number[] | null = null;
let phaseBuf: number[] | null = null;
let ampSampler: (() => number) | null = null;
let phaseSampler: (() => number) | null = null;
let lastFrame = -1;
const BUF_LEN = 2 * COLS_PER_PANEL + 3;
/**
 * AR(1) correlation of the noise sources: a real channel-noise process is
 * band-limited, so consecutive samples are correlated. This keeps the carrier
 * fuzz / phase jitter flowing smoothly instead of sparkling like white noise.
 */
const CORRELATION = 0.78;

function ensureBufs(): void {
  if (!ampSampler) ampSampler = makeBandLimitedSampler(CORRELATION, gaussian);
  if (!phaseSampler) phaseSampler = makeBandLimitedSampler(CORRELATION, gaussian);
  if (!ampBuf) ampBuf = makeNoiseTrace(BUF_LEN, ampSampler);
  if (!phaseBuf) phaseBuf = makeNoiseTrace(BUF_LEN, phaseSampler);
}

/** Linear-interpolated noise sample at fractional buffer index. */
function noiseAt(buf: number[], idx: number): number {
  if (idx <= 0) return buf[0];
  if (idx >= buf.length - 1) return buf[buf.length - 1];
  const i = Math.floor(idx);
  const f = idx - i;
  return buf[i] * (1 - f) + buf[i + 1] * f;
}

function message(u: number, frame: number): number {
  return Math.sin(u * TAU * MSG_CYCLES - frame * 0.018);
}

interface PanelOpts {
  x0: number;
  pw: number;
  mode: 'am' | 'fm';
  /** Buffer column offset so each panel reads an independent noise slice. */
  colOffset: number;
  phase: number;
}

/** Draw one half of the card: a clean envelope plus a noisy carrier. */
function drawPanel(
  ctx: CanvasRenderingContext2D,
  amp: number[],
  ph: number[],
  frame: number,
  h: number,
  o: PanelOpts,
): void {
  const mid = h * 0.5;
  const scale = h * 0.31;
  const inner = o.pw - 2 * PAD;
  const isAm = o.mode === 'am';

  // Received carrier (neon green trace).
  ctx.strokeStyle = VIZ.green;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = alpha(VIZ.green, 0.5);
  ctx.shadowBlur = 9;
  ctx.beginPath();
  for (let lx = 0; lx <= inner; lx += 1) {
    const u = lx / inner;
    const idx = o.colOffset + u * COLS_PER_PANEL + 1 + o.phase;
    const nAmp = noiseAt(amp, idx);
    const nPhase = noiseAt(ph, idx);

    let value: number;
    if (isAm) {
      // AM: amplitude noise, larger in the low-envelope (low-SNR) troughs.
      const env = 0.58 + 0.36 * message(u, frame);
      const gain = AM_NOISE_BASE + AM_NOISE_LOW_SNR * (1 - env);
      value = env * Math.sin(u * TAU * AM_CARRIER_CYCLES - frame * 0.38) + nAmp * gain;
    } else {
      // FM: constant envelope; channel noise jitters the phase (horizontal),
      // with only a small residual amplitude fuzz. Instantaneous phase carries
      // the integral of the message (∫sin = −cos) → frequency swings.
      const integ = -Math.cos(u * TAU * MSG_CYCLES - frame * 0.018);
      const arg = u * TAU * FM_CARRIER_CYCLES - frame * 0.34 + FM_MOD_INDEX * integ;
      value = FM_ENV * Math.sin(arg + nPhase * FM_PHASE_NOISE) + nAmp * FM_AMP_NOISE;
    }

    const x = o.x0 + PAD + lx;
    const y = mid - value * scale;
    if (lx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Mode tag.
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = VIZ.dim;
  ctx.font = '600 11px "IBM Plex Mono", ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(o.mode.toUpperCase(), o.x0 + PAD, 7);
  ctx.globalAlpha = 1;
}

/**
 * Noise in Analog Systems: a clean signal corrupted by additive Gaussian noise, shown
 * as a side-by-side AM | FM contrast (Ch 5). Left (AM): noise perturbs the
 * amplitude — vertical fuzz inside a bulging envelope, worse in the low-SNR
 * troughs. Right (FM): the envelope is flat and constant while channel noise
 * jitters the phase/frequency — zero-crossing jitter at near-constant amplitude.
 */
const draw: DrawFn = (ctx, t, w, h) => {
  ensureBufs();
  const amp = ampBuf as number[];
  const ph = phaseBuf as number[];

  // Scroll both noise textures: advance once per FRAMES_PER_STEP, but only on
  // genuinely new frames — resize/initial repaints reuse `t` and must not advance.
  if (t !== lastFrame) {
    if (t % FRAMES_PER_STEP === 0) {
      advanceNoiseTrace(amp, ampSampler as () => number);
      advanceNoiseTrace(ph, phaseSampler as () => number);
    }
    lastFrame = t;
  }
  const phase = (t % FRAMES_PER_STEP) / FRAMES_PER_STEP;

  ctx.clearRect(0, 0, w, h);
  const mid = h * 0.5;
  const half = w / 2;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Zero-mean baseline across both panels.
  ctx.strokeStyle = VIZ.axis;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, mid);
  ctx.lineTo(w, mid);
  ctx.stroke();

  // Subtle vertical divider between AM and FM.
  ctx.strokeStyle = VIZ.dim;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(half, h * 0.1);
  ctx.lineTo(half, h * 0.9);
  ctx.stroke();
  ctx.globalAlpha = 1;

  drawPanel(ctx, amp, ph, t, h, { x0: 0, pw: half, mode: 'am', colOffset: 0, phase });
  drawPanel(ctx, amp, ph, t, h, {
    x0: half,
    pw: half,
    mode: 'fm',
    colOffset: COLS_PER_PANEL,
    phase,
  });
};

export function NoisySignalViz() {
  const ref = useCanvasTicker(draw);
  return <canvas ref={ref} className="viz-canvas" aria-hidden="true" />;
}
