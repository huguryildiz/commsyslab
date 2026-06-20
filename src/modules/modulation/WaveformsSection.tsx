// Waveforms tab section: bit-stream controls + live noise animation + 4 canvas panels.
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Panel, Slider, Select, Segmented, InfoCard, TheoryBox, Formula, HintText } from '@/components';
import { useZoom } from '@/lib/plot/useZoom';
import { makeRng, type Bit } from '@/lib/sim/sources';
import { IQPanel, RFPanel, PhasePanel, EyePanel } from './waveforms-panels';
import {
  buildWaveforms,
  getSchemeInfo,
  WAVE_SCHEME_OPTIONS,
  SPS,
  type WaveScheme,
  type WaveformData,
  type SymbolInfo,
} from './waveforms-model';

const DEFAULT_SCHEME: WaveScheme = 'bpsk';
const DEFAULT_N = 16;
const DEFAULT_EBN0 = 12;
const MAX_EYE_FOLDS = 200;
const MAX_BITS = 96;

// Stream pattern: presets are generated from N; 'custom' comes from the bit field.
type Pattern = 'alt' | 'ones' | 'random' | 'custom';

const PATTERN_OPTIONS: { value: Pattern; label: string }[] = [
  { value: 'alt', label: '1010…' },
  { value: 'ones', label: 'All 1' },
  { value: 'random', label: 'Random' },
];

/** Generate a preset bit stream of length `nBits`. */
function genPreset(pattern: Pattern, nBits: number, streamSeed: number): Bit[] {
  if (pattern === 'ones') return Array.from({ length: nBits }, () => 1 as Bit);
  if (pattern === 'random') {
    const rng = makeRng(streamSeed);
    return Array.from({ length: nBits }, () => (rng() < 0.5 ? 0 : 1) as Bit);
  }
  // alternating 1,0,1,0,…
  return Array.from({ length: nBits }, (_, i) => (i % 2 === 0 ? 1 : 0) as Bit);
}

/** Parse a free-typed string into bits, keeping only 0/1 and capping length. */
function parseBits(text: string): Bit[] {
  const out: Bit[] = [];
  for (const c of text) {
    if (c === '0') out.push(0);
    else if (c === '1') out.push(1);
    if (out.length >= MAX_BITS) break;
  }
  return out;
}

export function WaveformsSection() {
  const [scheme, setScheme] = useState<WaveScheme>(DEFAULT_SCHEME);
  const [pattern, setPattern] = useState<Pattern>('alt');
  const [N, setN] = useState(DEFAULT_N);
  const [bitText, setBitText] = useState('');
  const [streamSeed, setStreamSeed] = useState(1);
  const [ebN0Db, setEbN0Db] = useState(DEFAULT_EBN0);
  const [live, setLive] = useState(false);
  const [hovered, setHovered] = useState<SymbolInfo | null>(null);

  const { bitsPerSymbol } = getSchemeInfo(scheme);

  // Source of truth: the bit stream. Presets follow N·bits-per-symbol; a custom
  // stream is the typed bits (re-grouped by the model when the scheme changes).
  const bits = useMemo<Bit[]>(() => {
    if (pattern === 'custom') return parseBits(bitText);
    return genPreset(pattern, N * bitsPerSymbol, streamSeed);
  }, [pattern, bitText, N, bitsPerSymbol, streamSeed]);

  const [data, setData] = useState<WaveformData>(() =>
    buildWaveforms({ scheme: DEFAULT_SCHEME, bits, ebN0Db: DEFAULT_EBN0, seed: 1 }),
  );

  const seedRef = useRef(1);
  const rafRef = useRef<number | null>(null);
  const eyeRingRef = useRef<number[][]>([]);
  const liveRef = useRef(live);
  liveRef.current = live;

  const schemeRef = useRef(scheme);
  schemeRef.current = scheme;
  const bitsRef = useRef(bits);
  bitsRef.current = bits;
  const ebRef = useRef(ebN0Db);
  ebRef.current = ebN0Db;

  // Rebuild on stream/scheme/SNR change (non-live)
  useEffect(() => {
    if (live) return;
    const d = buildWaveforms({ scheme, bits, ebN0Db, seed: seedRef.current });
    eyeRingRef.current = d.eyeFolds.slice(0, MAX_EYE_FOLDS);
    setData(d);
  }, [scheme, bits, ebN0Db, live]);

  // Animation loop: keep the bit stream fixed, advance only the noise so the eye
  // diagram accumulates over a single, fixed message.
  const animate = useCallback(() => {
    if (!liveRef.current) return;
    seedRef.current = ((seedRef.current + 1) % 99999) + 1;
    const d = buildWaveforms({
      scheme: schemeRef.current,
      bits: bitsRef.current,
      ebN0Db: ebRef.current,
      seed: seedRef.current,
    });
    const ring = eyeRingRef.current;
    for (const fold of d.eyeFolds) {
      if (ring.length >= MAX_EYE_FOLDS) ring.shift();
      ring.push(fold);
    }
    setData({ ...d, eyeFolds: [...ring] });
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (live) {
      eyeRingRef.current = [];
      rafRef.current = requestAnimationFrame(animate);
    } else if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [live, animate]);

  // Shared zoom for IQ / RF / Phase panels (same time axis)
  const [zLo, zHi, zWheel, zReset, zPan] = useZoom(0, data.N, {
    minSpan: 1,
    maxSpan: Math.max(4, data.N) * 4,
    clampMin: 0,
  });

  // Reset zoom when the number of symbols changes
  useEffect(() => { zReset(); }, [data.N]); // eslint-disable-line react-hooks/exhaustive-deps

  const schemeInfo = getSchemeInfo(scheme);
  const zoom: [number, number] = [zLo, zHi];
  const bitFieldValue = pattern === 'custom' ? bitText : bits.join('');

  return (
    <div className="module-layout">
      <aside className="modulation__controls">
        <Panel title="Scheme">
          <Select
            label="Modulation"
            value={scheme}
            onChange={(v) => {
              setScheme(v as WaveScheme);
              setLive(false);
            }}
            options={WAVE_SCHEME_OPTIONS}
          />
        </Panel>

        <Panel title="Bit stream">
          <Segmented<Pattern>
            ariaLabel="Bit stream pattern"
            value={pattern}
            options={PATTERN_OPTIONS}
            onChange={(p) => { setPattern(p); setLive(false); }}
          />
          <label className="waveforms__bitfield">
            <span>Bits {bitsPerSymbol > 1 ? `(${bitsPerSymbol}/symbol)` : ''}</span>
            <input
              type="text"
              inputMode="numeric"
              spellCheck={false}
              value={bitFieldValue}
              placeholder="type 1s and 0s…"
              onChange={(e) => {
                setPattern('custom');
                setBitText(e.target.value.replace(/[^01]/g, '').slice(0, MAX_BITS));
                setLive(false);
              }}
            />
          </label>
          {pattern === 'random' && (
            <button className="waveforms__btn" onClick={() => { setStreamSeed((s) => s + 1); setLive(false); }}>
              ⟳ Shuffle bits
            </button>
          )}
        </Panel>

        <Panel title="Parameters">
          <Slider
            label="Symbols N (presets)"
            min={4} max={48} step={1}
            value={N}
            onChange={(v) => { setN(v); if (pattern === 'custom') setPattern('alt'); setLive(false); }}
          />
          <Slider
            label="Eb/N₀"
            min={0} max={30} step={0.5}
            value={ebN0Db}
            unit="dB"
            precision={1}
            onChange={(v) => { setEbN0Db(v); }}
          />
        </Panel>

        <Panel>
          <button
            className="waveforms__btn"
            style={{
              background: live ? 'rgba(57,255,133,0.12)' : undefined,
              border: live ? '1px solid var(--accent)' : '1px solid var(--border)',
              color: live ? 'var(--accent)' : 'var(--text-dim)',
            }}
            onClick={() => setLive((v) => !v)}
          >
            {live ? '⏸ Pause' : '▶ Live (noise)'}
          </button>
        </Panel>
      </aside>

      <div className="modulation__content">
        <p className="waveforms__readout">
          {hovered ? (
            <HintText
              text={`Symbol #${Math.round(hovered.midT - 0.5)} · bits ${hovered.bitStr} · ${hovered.detail}`}
            />
          ) : (
            <HintText text="Hover the baseband plot to inspect a symbol. Bit labels mark each symbol on $I/Q$ and the RF wave." />
          )}
        </p>

        <Panel title={`I(t) & Q(t) — ${schemeInfo.label} Baseband`}>
          <IQPanel data={data} zoom={zoom} onWheel={zWheel} onPan={zPan} onHoverSymbol={setHovered} />
        </Panel>

        <Panel title="RF Bandpass s(t)">
          <RFPanel data={data} zoom={zoom} onWheel={zWheel} onPan={zPan} />
        </Panel>

        <Panel title={phaseTitle(schemeInfo.family)}>
          <PhasePanel data={data} zoom={zoom} onWheel={zWheel} onPan={zPan} />
        </Panel>

        <Panel title="Eye Diagram — I(t) folds">
          <EyePanel eyeFolds={data.eyeFolds} sps={SPS} />
        </Panel>

        <div className="info-cards">
          <InfoCard title="Bit stream" accent="green">
            You choose the message: type a bit pattern or pick a preset. Each group of{' '}
            <Formula tex="\log_2 M" /> bits becomes one symbol, drawn deterministically — so you
            can watch exactly which bits produce which waveform segment (the labels on the plots).
          </InfoCard>
          <InfoCard title="IQ Baseband" accent="green">
            Every digital modulation scheme carries information in the complex envelope{' '}
            <Formula tex="s_l(t)=I(t)+jQ(t)" />.
            The I (in-phase) and Q (quadrature) channels are the real and imaginary parts;
            their shapes reveal the modulation family at a glance.
          </InfoCard>
          <InfoCard title="RF Bandpass" accent="blue">
            The transmitted signal is{' '}
            <Formula tex="s(t)=I(t)\cos(2\pi f_c t)-Q(t)\sin(2\pi f_c t)" />.
            With <Formula tex="f_c=4/T" /> here, you see 4 full carrier cycles per symbol.
            AWGN noise added to I and Q produces the noisy RF waveform.
          </InfoCard>
          <InfoCard title="Eye Diagram" accent="orange">
            Fold the I channel into 2-symbol windows and overlay all folds. A wide-open eye
            means high SNR and easy detection. Press <strong>Live</strong> to keep the message
            fixed while fresh noise accumulates and the eye fills in.
          </InfoCard>
        </div>

        <TheoryBox title="Digital Modulation Waveforms (§8.1–8.4)">
          <p>
            <strong>M-PSK</strong> maps each group of <Formula tex="\log_2 M" /> bits to a
            phase angle <Formula tex="\theta_k = 2\pi k/M" /> so all symbols lie on a unit
            circle. The baseband envelope has constant amplitude.
          </p>
          <p>
            <strong>M-FSK</strong> assigns a distinct frequency{' '}
            <Formula tex="f_k = f_c + k\Delta f" /> to each symbol. With{' '}
            <Formula tex="\Delta f = 1/T" /> the tones are orthogonal over one symbol period.
            (The baseband <Formula tex="I(t)=\cos(2\pi f_k\tau)" /> is even in <Formula tex="f_k" />,
            so the tone shows in <Formula tex="Q(t)" /> and the RF frequency, not in I.)
          </p>
          <p>
            <strong>M-QAM</strong> uses both amplitude and phase:{' '}
            <Formula tex="s_k = A_k e^{j\theta_k}" />.
            Symbols form an <Formula tex="\sqrt{M}\times\sqrt{M}" /> grid; higher-order QAM
            packs more bits per symbol at the cost of closer constellation points.
          </p>
          <p>
            <strong>MSK</strong> is CPFSK with{' '}
            <Formula tex="h=1/2" />. The phase accumulates linearly:{' '}
            <Formula tex="\theta(t)=\theta_k\pm\pi\tau/T,\quad\tau\in[0,T)" />,
            giving a continuous-phase waveform and a compact spectrum.
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}

function phaseTitle(family: 'psk' | 'fsk' | 'qam' | 'msk'): string {
  if (family === 'psk') return 'Phase θ(t)';
  if (family === 'fsk') return 'Instantaneous Frequency f(t)';
  if (family === 'qam') return 'Envelope Amplitude |A(t)|';
  return 'Phase θ(t) — MSK linear ramp';
}
