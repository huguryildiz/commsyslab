import { quantize, type QuantizerType } from '@/lib/dsp/quantize';

export interface AudioDemoParams {
  /** Audible analog tone frequency (Hz). */
  toneHz: number;
  /** Demonstration sampling rate (Hz) applied to the tone. */
  sampleHz: number;
  /** Quantizer resolution (bits). */
  bits: number;
  type: QuantizerType;
  /** Playback duration (seconds). */
  durationSec?: number;
  /** Output gain in [0,1]. */
  gain?: number;
}

type Ctor = typeof AudioContext;

function getAudioContextCtor(): Ctor | null {
  const w = window as unknown as {
    AudioContext?: Ctor;
    webkitAudioContext?: Ctor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** True when the Web Audio API is available in this environment. */
export function audioSupported(): boolean {
  return typeof window !== 'undefined' && getAudioContextCtor() !== null;
}

/**
 * Play a zero-order-hold reconstruction of a tone sampled at `sampleHz` and
 * quantized to `bits`. Returns a stop() handle. Must be called from a user
 * gesture (browser autoplay policy). No-op (returns null) when unsupported.
 */
export function playSampledTone(p: AudioDemoParams): { stop: () => void } | null {
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;
  const durationSec = p.durationSec ?? 1.5;
  const gain = p.gain ?? 0.25;
  const mMax = 1;

  const ctx = new Ctor();
  const sr = ctx.sampleRate;
  const n = Math.max(1, Math.floor(durationSec * sr));
  const buffer = ctx.createBuffer(1, n, sr);
  const ch = buffer.getChannelData(0);
  const Ts = 1 / p.sampleHz;

  for (let i = 0; i < n; i++) {
    const time = i / sr;
    const heldIndex = Math.floor(time / Ts); // zero-order hold
    const heldTime = heldIndex * Ts;
    const analog = Math.cos(2 * Math.PI * p.toneHz * heldTime);
    ch[i] = quantize(analog, mMax, p.bits, p.type) * gain;
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  src.start();
  src.onended = () => {
    void ctx.close();
  };

  return {
    stop: () => {
      try {
        src.stop();
      } catch {
        // already stopped
      }
      void ctx.close();
    },
  };
}
