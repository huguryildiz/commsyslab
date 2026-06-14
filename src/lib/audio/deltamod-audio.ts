import { deltaModulate } from '@/lib/dsp/deltamod';
import { audioSupported } from '@/lib/audio/sampling-audio';

export interface DeltaAudioParams {
  /** Audible tone frequency (Hz). */
  toneHz: number;
  /** Demonstration sampling rate (Hz) for DM. */
  sampleHz: number;
  /** DM step size. */
  step: number;
  /** Playback duration (seconds). */
  durationSec?: number;
  /** Output gain in [0,1]. */
  gain?: number;
  /** When true, play the DM reconstruction; otherwise the clean tone. */
  dm: boolean;
}

type Ctor = typeof AudioContext;

function getAudioContextCtor(): Ctor | null {
  const w = window as unknown as {
    AudioContext?: Ctor;
    webkitAudioContext?: Ctor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** Play the clean tone or its DM reconstruction. Returns a stop() handle, or null when unsupported. */
export function playDeltaDemo(p: DeltaAudioParams): { stop: () => void } | null {
  if (!audioSupported()) return null;
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;
  const durationSec = p.durationSec ?? 1.5;
  const gain = p.gain ?? 0.25;

  const ctx = new Ctor();
  const sr = ctx.sampleRate;
  const n = Math.max(1, Math.floor(durationSec * sr));
  const buffer = ctx.createBuffer(1, n, sr);
  const ch = buffer.getChannelData(0);

  if (p.dm) {
    const Ts = 1 / p.sampleHz;
    const m = Math.max(1, Math.ceil(durationSec / Ts));
    const src: number[] = [];
    for (let i = 0; i < m; i++) src.push(Math.cos(2 * Math.PI * p.toneHz * i * Ts));
    const { staircase } = deltaModulate(src, p.step, 0);
    for (let i = 0; i < n; i++) {
      const held = Math.min(Math.floor(i / sr / Ts), staircase.length - 1);
      ch[i] = staircase[held] * gain;
    }
  } else {
    for (let i = 0; i < n; i++) ch[i] = Math.cos(2 * Math.PI * p.toneHz * (i / sr)) * gain;
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
