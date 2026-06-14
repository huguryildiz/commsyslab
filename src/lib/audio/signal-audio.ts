type Ctor = typeof AudioContext;

function getAudioContextCtor(): Ctor | null {
  const w = window as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export function audioSupported(): boolean {
  return typeof window !== 'undefined' && getAudioContextCtor() !== null;
}

/**
 * Play an array of waveform samples as a periodic tone.
 * The samples are treated as one cycle and looped at `pitchHz`.
 * Returns a stop() handle. Must be called from a user gesture.
 * Proakis §2.2: any periodic signal can be represented as a Fourier series —
 * playback lets the student hear the harmonic content directly.
 */
export function playSignalSamples(
  samples: number[],
  pitchHz = 220,
  durationSec = 1.5,
  gain = 0.2,
): { stop: () => void } | null {
  const Ctor = getAudioContextCtor();
  if (!Ctor || samples.length === 0) return null;

  const ctx = new Ctor();
  const sr = ctx.sampleRate;
  const totalFrames = Math.max(1, Math.floor(durationSec * sr));
  const cycleFrames = Math.max(1, Math.floor(sr / pitchHz));

  // Normalize samples to [-1, 1]
  const peak = samples.reduce((m, v) => Math.max(m, Math.abs(v)), 1e-9);
  const norm = samples.map((v) => v / peak);

  const buffer = ctx.createBuffer(1, totalFrames, sr);
  const ch = buffer.getChannelData(0);

  for (let i = 0; i < totalFrames; i++) {
    const phase = (i % cycleFrames) / cycleFrames; // 0..1
    const idx = Math.floor(phase * norm.length) % norm.length;
    ch[i] = norm[idx] * gain;
  }

  // Fade out last 10 ms to avoid click
  const fadeFrames = Math.min(Math.floor(0.01 * sr), totalFrames);
  for (let i = 0; i < fadeFrames; i++) {
    ch[totalFrames - 1 - i] *= i / fadeFrames;
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  src.start();
  src.onended = () => void ctx.close();

  return {
    stop: () => {
      try { src.stop(); } catch { /* already stopped */ }
      void ctx.close();
    },
  };
}
