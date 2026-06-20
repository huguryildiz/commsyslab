// Quantization Effects section — perceptual impact of bit-depth reduction
// on still images (posterization) and audio (quantization noise).
// Proakis §7.2: uniform quantizer, SQNR ≈ 6.02 B + 1.76 dB for full-scale sine.
import { useCallback, useMemo, useRef, useState } from 'react';
import { Panel, Slider, Select, Readout, InfoCard, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { CHART } from '@/lib/plot/colors';
import { t } from '@/i18n';
import '@/modules/sampling-quantization/sampling-quantization.css';

// ── Image constants ───────────────────────────────────────────────────────────

const IMG_W = 200;
const IMG_H = 200;

type ImagePreset = 'gradient' | 'nature' | 'colorful';
type AudioSignal = 'sine' | 'harmonics' | 'chord';

// ── Image generation ─────────────────────────────────────────────────────────

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function generateSourcePixels(preset: ImagePreset): Uint8ClampedArray {
  const data = new Uint8ClampedArray(IMG_W * IMG_H * 4);
  for (let y = 0; y < IMG_H; y++) {
    for (let x = 0; x < IMG_W; x++) {
      const idx = (y * IMG_W + x) * 4;
      const nx = x / (IMG_W - 1);
      const ny = y / (IMG_H - 1);
      let r = 0, g = 0, b = 0;

      switch (preset) {
        case 'gradient': {
          // Smooth bilinear RGB ramp — posterization bands are unmistakable
          r = Math.round(255 * nx);
          g = Math.round(255 * ny);
          b = Math.round(255 * (1 - Math.max(nx, ny)));
          break;
        }
        case 'nature': {
          // Synthetic sky + hills + earth
          if (ny < 0.45) {
            const t = ny / 0.45;
            r = Math.round(15 + 95 * t);
            g = Math.round(70 + 100 * t);
            b = Math.round(180 + 60 * t);
          } else {
            const hillEdge = 0.45 + 0.06 * Math.sin(nx * Math.PI * 6);
            if (ny < hillEdge + 0.20) {
              const t = (ny - hillEdge) / 0.20;
              r = Math.round(40 + 50 * t);
              g = Math.round(140 - 50 * t);
              b = Math.round(30 + 10 * t);
            } else {
              const t = Math.min(1, (ny - hillEdge - 0.20) / 0.30);
              r = Math.round(90 + 30 * t);
              g = Math.round(60 + 15 * t);
              b = Math.round(20 + 5 * t);
            }
          }
          break;
        }
        case 'colorful': {
          // Full hue sweep with brightness variation — shows hue-quantization clearly
          const hue = nx * 360;
          const sat = 0.70 + 0.30 * Math.abs(Math.sin(ny * Math.PI * 3));
          const val = 0.50 + 0.50 * ny;
          [r, g, b] = hsvToRgb(hue, sat, val);
          break;
        }
      }

      data[idx]     = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }
  return data;
}

/** Reduce each RGB channel to `bits` bits via uniform mid-tread quantization. */
function quantizePixels(src: Uint8ClampedArray, bits: number): Uint8ClampedArray {
  if (bits >= 8) return src;
  const dst = new Uint8ClampedArray(src.length);
  const levels = 1 << bits; // 2^bits
  const step = 256 / levels;
  for (let i = 0; i < src.length; i += 4) {
    dst[i]     = Math.min(255, Math.round(src[i]     / step) * step);
    dst[i + 1] = Math.min(255, Math.round(src[i + 1] / step) * step);
    dst[i + 2] = Math.min(255, Math.round(src[i + 2] / step) * step);
    dst[i + 3] = 255;
  }
  return dst;
}

/** Per-channel absolute error ×scale, clamped to [0, 255]. */
function computeErrorPixels(
  src: Uint8ClampedArray,
  qnt: Uint8ClampedArray,
  scale = 8,
): Uint8ClampedArray {
  const err = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    err[i]     = Math.min(255, Math.abs(src[i]     - qnt[i])     * scale);
    err[i + 1] = Math.min(255, Math.abs(src[i + 1] - qnt[i + 1]) * scale);
    err[i + 2] = Math.min(255, Math.abs(src[i + 2] - qnt[i + 2]) * scale);
    err[i + 3] = 255;
  }
  return err;
}

/** Render a pixel buffer (IMG_W × IMG_H RGBA) scaled to fill a Canvas. */
function drawImagePixels(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pixels: Uint8ClampedArray,
) {
  const imgData = new ImageData(new Uint8ClampedArray(pixels), IMG_W, IMG_H);
  const offscreen = document.createElement('canvas');
  offscreen.width = IMG_W;
  offscreen.height = IMG_H;
  offscreen.getContext('2d')!.putImageData(imgData, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(offscreen, 0, 0, w, h);
}

// ── Audio helpers ─────────────────────────────────────────────────────────────

const AUDIO_SR = 44100;
const AUDIO_DUR = 1.5; // seconds
const AUDIO_N = Math.floor(AUDIO_SR * AUDIO_DUR);

function generateAudio(signal: AudioSignal): Float32Array {
  const samples = new Float32Array(AUDIO_N);
  for (let i = 0; i < AUDIO_N; i++) {
    const t = i / AUDIO_SR;
    switch (signal) {
      case 'sine':
        samples[i] = 0.8 * Math.sin(2 * Math.PI * 440 * t);
        break;
      case 'harmonics':
        // Sawtooth-like harmonic series (voice-like)
        samples[i] =
          0.50 * Math.sin(2 * Math.PI * 440 * t) +
          0.25 * Math.sin(2 * Math.PI * 880 * t) +
          0.15 * Math.sin(2 * Math.PI * 1320 * t) +
          0.08 * Math.sin(2 * Math.PI * 1760 * t);
        break;
      case 'chord':
        // C major — C4 (261.63 Hz) + E4 (329.63 Hz) + G4 (392 Hz)
        samples[i] =
          0.33 * Math.sin(2 * Math.PI * 261.63 * t) +
          0.33 * Math.sin(2 * Math.PI * 329.63 * t) +
          0.33 * Math.sin(2 * Math.PI * 392.00 * t);
        break;
    }
  }
  return samples;
}

/** Uniform mid-tread quantization over the range [−1, +1]. */
function quantizeAudioSamples(src: Float32Array, bits: number): Float32Array {
  if (bits >= 24) return src;
  const dst = new Float32Array(src.length);
  const levels = 1 << bits; // 2^bits
  const step = 2.0 / levels;
  for (let i = 0; i < src.length; i++) {
    dst[i] = Math.max(-1, Math.min(1, Math.round(src[i] / step) * step));
  }
  return dst;
}

function playAudio(samples: Float32Array): (() => void) | null {
  const w = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return null;

  const actx = new Ctor();
  const buf = actx.createBuffer(1, samples.length, AUDIO_SR);
  const ch = buf.getChannelData(0);
  ch.set(samples);

  // 20 ms fade-out to prevent click at the end
  const fadeLen = Math.floor(0.02 * AUDIO_SR);
  for (let i = 0; i < fadeLen; i++) {
    ch[samples.length - 1 - i] *= i / fadeLen;
  }

  const gain = actx.createGain();
  gain.gain.value = 0.4;
  const src = actx.createBufferSource();
  src.buffer = buf;
  src.connect(gain);
  gain.connect(actx.destination);
  src.start();
  src.onended = () => void actx.close();

  return () => {
    try { src.stop(); } catch { /* already stopped */ }
    void actx.close();
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

// Number of samples shown in the waveform canvas (~23 ms at 44100 Hz = ~10 cycles of 440 Hz)
const WAVEFORM_N = 1024;

/** §7.2 Perceptual effects of uniform bit-depth reduction on image and audio. */
export function QuantizationEffectsSection() {
  const [imagePreset, setImagePreset] = useState<ImagePreset>('gradient');
  const [imageBits, setImageBits] = useState(4);
  const [audioSignal, setAudioSignal] = useState<AudioSignal>('harmonics');
  const [audioBits, setAudioBits] = useState(8);

  const stopRef = useRef<(() => void) | null>(null);

  // ── Image pipeline ────────────────────────────────────────────────────────

  const sourcePixels = useMemo(() => generateSourcePixels(imagePreset), [imagePreset]);

  const quantizedPixels = useMemo(
    () => quantizePixels(sourcePixels, imageBits),
    [sourcePixels, imageBits],
  );

  const errorPixels = useMemo(
    () => computeErrorPixels(sourcePixels, quantizedPixels, 8),
    [sourcePixels, quantizedPixels],
  );

  const distinctColors = useMemo(() => {
    if (imageBits >= 8) return 16_777_216;
    const levels = 1 << imageBits;
    return levels * levels * levels; // R × G × B
  }, [imageBits]);

  // ── Audio pipeline ────────────────────────────────────────────────────────

  const originalAudio = useMemo(() => generateAudio(audioSignal), [audioSignal]);

  const quantizedAudio = useMemo(
    () => quantizeAudioSamples(originalAudio, audioBits),
    [originalAudio, audioBits],
  );

  // SQNR formula for full-scale sine input with uniform B-bit quantizer (§7.2)
  const sqnrDb = 6.02 * audioBits + 1.76;

  const waveOrig  = useMemo(() => originalAudio.slice(0, WAVEFORM_N), [originalAudio]);
  const waveQuant = useMemo(() => quantizedAudio.slice(0, WAVEFORM_N), [quantizedAudio]);

  // ── Play handler ──────────────────────────────────────────────────────────

  const handlePlay = useCallback((samples: Float32Array) => {
    stopRef.current?.();
    stopRef.current = playAudio(samples);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="module-layout">
      {/* ── Left sidebar ── */}
      <aside className="sampling__controls">
        <Panel title={t('adc.qe.imagePanel')}>
          <Select<ImagePreset>
            label={t('adc.qe.imagePreset')}
            value={imagePreset}
            onChange={setImagePreset}
            options={[
              { value: 'gradient', label: t('adc.qe.preset.gradient') },
              { value: 'nature',   label: t('adc.qe.preset.nature') },
              { value: 'colorful', label: t('adc.qe.preset.colorful') },
            ]}
          />
          <Slider
            label={t('adc.qe.imageBits')}
            value={imageBits}
            min={1}
            max={8}
            step={1}
            onChange={setImageBits}
          />
        </Panel>

        <Panel title={t('adc.qe.audioPanel')}>
          <Select<AudioSignal>
            label={t('adc.qe.audioSignal')}
            value={audioSignal}
            onChange={setAudioSignal}
            options={[
              { value: 'sine',      label: t('adc.qe.signal.sine') },
              { value: 'harmonics', label: t('adc.qe.signal.harmonics') },
              { value: 'chord',     label: t('adc.qe.signal.chord') },
            ]}
          />
          <Slider
            label={t('adc.qe.audioBits')}
            value={audioBits}
            min={2}
            max={16}
            step={1}
            onChange={setAudioBits}
          />
        </Panel>

        <Panel title="Readouts">
          <Readout label={t('adc.qe.imageBits')} value={`${imageBits} bit`} />
          <Readout
            label="Colors (RGB)"
            value={distinctColors >= 1_000_000
              ? `${(distinctColors / 1_000_000).toFixed(2)}M`
              : distinctColors.toLocaleString()}
          />
          <Readout label={t('adc.qe.audioBits')} value={`${audioBits} bit`} />
          <Readout label="SQNR (est.)" value={sqnrDb.toFixed(1)} unit="dB" />
        </Panel>
      </aside>

      {/* ── Right content ── */}
      <div className="sampling__content">

        {/* Image comparison: original | quantized | error */}
        <Panel title={t('adc.qe.imageCompare')}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(180px, 100%), 1fr))',
              gap: 12,
            }}
          >
            {/* Original 8-bit */}
            <div>
              <p className="qe__canvas-label">{t('adc.qe.original')} (8-bit)</p>
              <Canvas
                height={180}
                ariaLabel="Original 8-bit image"
                deps={[sourcePixels]}
                draw={(ctx, w, h) => drawImagePixels(ctx, w, h, sourcePixels)}
              />
            </div>

            {/* Quantized B-bit */}
            <div>
              <p className="qe__canvas-label">{t('adc.qe.quantized')} ({imageBits}-bit)</p>
              <Canvas
                height={180}
                ariaLabel={`Quantized ${imageBits}-bit image`}
                deps={[quantizedPixels]}
                draw={(ctx, w, h) => drawImagePixels(ctx, w, h, quantizedPixels)}
              />
            </div>

            {/* Error ×8 */}
            <div>
              <p className="qe__canvas-label">{t('adc.qe.error')} (×8 amplified)</p>
              <Canvas
                height={180}
                ariaLabel="Quantization error amplified ×8"
                deps={[errorPixels]}
                draw={(ctx, w, h) => drawImagePixels(ctx, w, h, errorPixels)}
              />
            </div>
          </div>
        </Panel>

        {/* Audio waveform + playback */}
        <Panel title={t('adc.qe.audioCompare')}>
          <Canvas
            height={160}
            ariaLabel="Audio waveform — original (green) vs quantized (orange)"
            deps={[waveOrig, waveQuant, audioBits]}
            draw={(ctx, w, h) => {
              // Horizontal grid lines
              ctx.strokeStyle = CHART.dim;
              ctx.globalAlpha = 0.25;
              ctx.lineWidth = 0.5;
              for (let row = 0; row <= 4; row++) {
                const y = (row / 4) * h;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
              }
              ctx.globalAlpha = 1;

              // Centre line
              ctx.strokeStyle = CHART.dim;
              ctx.globalAlpha = 0.4;
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(0, h / 2);
              ctx.lineTo(w, h / 2);
              ctx.stroke();
              ctx.globalAlpha = 1;

              // Original — green (drawn second so it sits on top)
              const drawTrace = (wave: Float32Array, color: string, lw: number) => {
                ctx.strokeStyle = color;
                ctx.lineWidth = lw;
                ctx.beginPath();
                for (let i = 0; i < WAVEFORM_N; i++) {
                  const x = (i / (WAVEFORM_N - 1)) * w;
                  const y = h / 2 - wave[i] * h * 0.44;
                  if (i === 0) ctx.moveTo(x, y);
                  else ctx.lineTo(x, y);
                }
                ctx.stroke();
              };

              drawTrace(waveQuant, CHART.orange, 1.5); // quantized first (underneath)
              drawTrace(waveOrig,  CHART.green,  1.5); // original on top

              // Legend
              ctx.font = '11px var(--mono)';
              ctx.fillStyle = CHART.green;
              ctx.fillText('▬ original', 8, 16);
              ctx.fillStyle = CHART.orange;
              ctx.fillText(`▬ ${audioBits}-bit`, 8, 30);
            }}
          />

          <div className="qe__play-row">
            <button onClick={() => handlePlay(originalAudio)}>
              ▶ {t('adc.qe.playOriginal')}
            </button>
            <button onClick={() => handlePlay(quantizedAudio)}>
              ▶ {t('adc.qe.playQuantized')} ({audioBits}-bit)
            </button>
          </div>
        </Panel>

        {/* Info cards */}
        <div className="info-cards">
          <InfoCard title={t('adc.card.posterization.title')} accent="green">
            <p><HintText text={t('adc.card.posterization.body')} /></p>
          </InfoCard>
          <InfoCard title={t('adc.card.quantnoise.title')} accent="orange">
            <p><HintText text={t('adc.card.quantnoise.body')} /></p>
          </InfoCard>
          <InfoCard title={t('adc.card.bitdepth.title')} accent="blue">
            <p><HintText text={t('adc.card.bitdepth.body')} /></p>
          </InfoCard>
        </div>

      </div>
    </div>
  );
}
