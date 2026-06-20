// LPC vocoder panel components (Proakis §7.5, Fig. 7.17)
// Panels: SpeechModelDiagram, WaveformPanel, SpectrumEnvelopePanel, ResidualPanel
import '@/lib/plot/schematic.css';
import { Schematic, Block, Wire, Arrowhead, Label } from '@/lib/plot/schematic';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine } from '@/lib/plot/draw';
import { useZoom } from '@/lib/plot/useZoom';
import { CHART, alpha } from '@/lib/plot/colors';

// ── Shared plot constants ────────────────────────────────────────────────────

// Room for tick labels + LaTeX axis labels (y-label at left−34, x-label at bottom+30).
const PAD = { l: 48, r: 18, t: 16, b: 40 };

function axesFor(w: number, h: number, domX: [number, number], domY: [number, number]) {
  return {
    x: linScale(domX, [PAD.l, w - PAD.r]),
    y: linScale(domY, [h - PAD.b, PAD.t]),
  };
}

// ── A. Speech Source-Filter Model Diagram (Fig. 7.17) ────────────────────────
//
// Coordinate space: 400 × 130 px
// maxWidth cap:     400 × 1.8 ≈ 720 px
//
// Layout (all cy = vertical centre of block, BH = 22):
//   Noise generator:    cy=28, block y=17..39
//   Impulse generator:  cy=72, block y=61..83
//   V/UV switch:        cy=50 (midpoint 28+72)/2, block y=39..61
//   All-pole filter:    cy=50, block y=39..61
//   cy_switch - cy_noise = 22 ≥ BH(22) → touching, wires routed via bends

const DIAG_W = 400;
const DIAG_H = 130;
const BH_DIAG = 22; // block height in the diagram

/**
 * Block diagram of the LPC source-filter model (Proakis §7.5, Fig. 7.17):
 *   [White-noise gen.] ─┐
 *                        ├─ [V/UV switch] → [All-pole filter H(z)] → Speech signal
 *   [Impulse-train gen.] ┘
 */
export function SpeechModelDiagram() {
  // Vertical centres
  const NOISE_CY = 28;   // noise generator
  const IMPULSE_CY = 72; // impulse-train generator
  const SW_CY = 50;      // switch (midpoint between the two generators)
  const FILT_CY = 50;    // filter (same row as switch)

  // Horizontal layout
  const GEN_X = 10;       // generator block left edge
  const GEN_W = 102;      // generator block width
  const SW_X = 148;       // switch block left edge
  const SW_W = 54;        // switch block width
  const FILT_X = 228;     // all-pole filter left edge
  const FILT_W = 110;     // all-pole filter width
  const OUT_X = 370;      // output arrowhead tip x

  return (
    <div style={{ maxWidth: 720 }}>
      {/* maxWidth = DIAG_W(400) × 1.8 = 720 px */}
      <Schematic
        width={DIAG_W}
        height={DIAG_H}
        ariaLabel="LPC source-filter model block diagram (§7.5, Fig. 7.17)"
      >
        {/* ── White-noise generator (top) ── */}
        {/* cy=28: label@y=13, block y=17..39 */}
        <Block
          x={GEN_X} y={NOISE_CY - BH_DIAG / 2}
          w={GEN_W} h={BH_DIAG}
          label="White-noise gen."
        />
        {/* Wire bends from gen right edge → switch left at SW_CY */}
        <Wire points={[GEN_X + GEN_W, NOISE_CY, SW_X - 6, NOISE_CY, SW_X - 6, SW_CY]} />
        <Arrowhead x={SW_X - 4} y={SW_CY} />

        {/* ── Impulse-train generator (bottom) ── */}
        {/* cy=72: label@y=57, block y=61..83 */}
        <Block
          x={GEN_X} y={IMPULSE_CY - BH_DIAG / 2}
          w={GEN_W} h={BH_DIAG}
          label="Impulse-train gen."
        />
        {/* Wire bends from gen right edge → switch left at SW_CY (different merge x) */}
        <Wire points={[GEN_X + GEN_W, IMPULSE_CY, SW_X - 18, IMPULSE_CY, SW_X - 18, SW_CY]} />
        <Arrowhead x={SW_X - 16} y={SW_CY} />

        {/* ── Voiced/Unvoiced switch ── */}
        {/* cy=50: block y=39..61 */}
        <Block
          x={SW_X} y={SW_CY - BH_DIAG / 2}
          w={SW_W} h={BH_DIAG}
          label="V/UV sw."
        />

        {/* ── Wire: switch → all-pole filter ── */}
        <Wire points={[SW_X + SW_W, SW_CY, FILT_X, SW_CY]} />
        <Arrowhead x={FILT_X + 2} y={SW_CY} />

        {/* ── All-pole synthesis filter H(z) ── */}
        {/* cy=50: block y=39..61 */}
        <Block
          x={FILT_X} y={FILT_CY - BH_DIAG / 2}
          w={FILT_W} h={BH_DIAG}
          label="All-pole filter"
        />

        {/* Gain label beneath the filter block */}
        <Label x={FILT_X + FILT_W / 2} y={FILT_CY + BH_DIAG / 2 + 10} text="Gain G" />

        {/* ── Output: filter → Speech signal label ── */}
        <Wire points={[FILT_X + FILT_W, FILT_CY, OUT_X, FILT_CY]} />
        <Arrowhead x={OUT_X + 2} y={FILT_CY} />
        <Label x={OUT_X + 18} y={FILT_CY} text="Speech signal" />
      </Schematic>
    </div>
  );
}

// ── B. WaveformPanel ─────────────────────────────────────────────────────────

export interface WaveformPanelProps {
  /** Original speech frame (from synthSpeechFrame). */
  original: number[];
  /** LPC-resynthesized frame (from lpcSynthesize). */
  synth: number[];
}

/**
 * Overlay of the original speech frame (CHART.blue) and LPC resynthesized
 * signal (CHART.green). Self-owned zoom over sample indices [0, N-1].
 */
export function WaveformPanel({ original, synth }: WaveformPanelProps) {
  const N = Math.max(original.length, synth.length, 1);
  const [lo, hi, onWheel, , onPan] = useZoom(0, N - 1, { minSpan: 8, maxSpan: N - 1 });

  const xs = original.map((_, i) => i);
  const xsSynth = synth.map((_, i) => i);

  // y-range: symmetric around 0
  const allVals = [...original, ...synth];
  const yMax = Math.max(...allVals.map(Math.abs), 0.1) * 1.15;

  return (
    <Canvas
      height={200}
      ariaLabel="Original vs LPC-resynthesized speech waveform"
      deps={[original, synth, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [lo, hi], [-yMax, yMax]);
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$n$', yLabel: '$x[n]$' });

        // Original — blue
        drawLine(ctx, ax, xs, original, CHART.blue, 1.5);
        // Resynthesized — green
        drawLine(ctx, ax, xsSynth, synth, CHART.green, 1.5);

        // Legend (top-right area inside plot padding)
        const lx = w - PAD.r - 132;
        const ly = PAD.t + 10;
        ctx.save();
        ctx.font = '11px var(--font)';

        ctx.fillStyle = CHART.blue;
        ctx.fillRect(lx, ly, 18, 3);
        ctx.fillStyle = CHART.text;
        ctx.fillText('Original', lx + 22, ly + 4);

        ctx.fillStyle = CHART.green;
        ctx.fillRect(lx, ly + 14, 18, 3);
        ctx.fillStyle = CHART.text;
        ctx.fillText('Resynthesized', lx + 22, ly + 18);

        ctx.restore();
      }}
    />
  );
}

// ── C. SpectrumEnvelopePanel ─────────────────────────────────────────────────

export interface SpectrumEnvelopePanelProps {
  /** Frequency axis in Hz for the signal spectrum: one-sided [0, fs/2]. */
  freqHz: number[];
  /** Frame magnitude spectrum in dB (one-sided, from FFT). */
  sigDb: number[];
  /** Frequency axis in Hz for the LPC envelope (converted from freqNorm). */
  envFreqHz: number[];
  /** LPC all-pole envelope magnitude in dB (from lpcSpectrum). */
  envDb: number[];
  /** Sampling rate (Hz) — determines zoom clamp. */
  fs: number;
}

/**
 * Frame magnitude spectrum (faint dim) overlaid with the LPC all-pole envelope (orange).
 * Self-owned zoom over [0, fs/2], clamped at 0 Hz.
 */
export function SpectrumEnvelopePanel({ freqHz, sigDb, envFreqHz, envDb, fs }: SpectrumEnvelopePanelProps) {
  const [lo, hi, onWheel, , onPan] = useZoom(0, fs / 2, {
    minSpan: 200,
    maxSpan: fs / 2,
    clampMin: 0,
  });

  // Determine dB y-range from data, with a sensible floor
  const allDb = [...sigDb, ...envDb].filter(isFinite);
  const dbMax = Math.max(...allDb, 0) + 6;
  const dbMin = Math.min(...allDb, -60) - 4;

  return (
    <Canvas
      height={200}
      ariaLabel="LPC spectral envelope vs frame magnitude spectrum"
      deps={[freqHz, sigDb, envFreqHz, envDb, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [lo, hi], [dbMin, dbMax]);
        drawAxes(ctx, ax, [lo, hi], {
          xLabel: '$f\\,(\\mathrm{Hz})$',
          yLabel: '$|H(f)|\\,(\\mathrm{dB})$',
        });

        // Frame spectrum — faint background
        drawLine(ctx, ax, freqHz, sigDb, alpha(CHART.dim, 0.45), 1);
        // LPC all-pole envelope — orange, bold
        drawLine(ctx, ax, envFreqHz, envDb, CHART.orange, 2);

        // Legend
        const lx = w - PAD.r - 144;
        const ly = PAD.t + 10;
        ctx.save();
        ctx.font = '11px var(--font)';

        ctx.fillStyle = alpha(CHART.dim, 0.45);
        ctx.fillRect(lx, ly, 18, 2);
        ctx.fillStyle = CHART.text;
        ctx.fillText('Signal spectrum', lx + 22, ly + 4);

        ctx.fillStyle = CHART.orange;
        ctx.fillRect(lx, ly + 14, 18, 3);
        ctx.fillStyle = CHART.text;
        ctx.fillText('LPC envelope', lx + 22, ly + 18);

        ctx.restore();
      }}
    />
  );
}

// ── D. ResidualPanel ─────────────────────────────────────────────────────────

export interface ResidualPanelProps {
  /** Prediction error e[n] from predictionError(). */
  error: number[];
}

/**
 * Prediction residual e[n] — drawn in red.
 * Self-owned zoom over [0, N-1].
 */
export function ResidualPanel({ error }: ResidualPanelProps) {
  const N = Math.max(error.length, 1);
  const [lo, hi, onWheel, , onPan] = useZoom(0, N - 1, { minSpan: 8, maxSpan: N - 1 });

  const xs = error.map((_, i) => i);
  const yMax = Math.max(...error.map(Math.abs), 0.1) * 1.25;

  return (
    <Canvas
      height={160}
      ariaLabel="LPC prediction residual e[n]"
      deps={[error, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [lo, hi], [-yMax, yMax]);
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$n$', yLabel: '$e[n]$' });
        drawLine(ctx, ax, xs, error, CHART.red, 1.5);
      }}
    />
  );
}

