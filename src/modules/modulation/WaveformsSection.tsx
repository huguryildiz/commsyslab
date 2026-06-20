// Waveforms tab section: controls + live animation + 4 canvas panels.
import { useState, useEffect, useRef, useCallback } from 'react';
import { Panel, Slider, Select, InfoCard, TheoryBox, Formula } from '@/components';
import { useZoom } from '@/lib/plot/useZoom';
import { IQPanel, RFPanel, PhasePanel, EyePanel } from './waveforms-panels';
import {
  buildWaveforms,
  getSchemeInfo,
  WAVE_SCHEME_OPTIONS,
  SPS,
  type WaveScheme,
  type WaveformData,
} from './waveforms-model';

const DEFAULT_SCHEME: WaveScheme = 'bpsk';
const DEFAULT_N = 16;
const DEFAULT_EBN0 = 12;
const MAX_EYE_FOLDS = 200;

export function WaveformsSection() {
  const [scheme, setScheme] = useState<WaveScheme>(DEFAULT_SCHEME);
  const [N, setN] = useState(DEFAULT_N);
  const [ebN0Db, setEbN0Db] = useState(DEFAULT_EBN0);
  const [live, setLive] = useState(false);

  const [data, setData] = useState<WaveformData>(() =>
    buildWaveforms({ scheme: DEFAULT_SCHEME, N: DEFAULT_N, ebN0Db: DEFAULT_EBN0, seed: 1 }),
  );

  const seedRef = useRef(1);
  const rafRef = useRef<number | null>(null);
  const eyeRingRef = useRef<number[][]>([]);
  const liveRef = useRef(live);
  liveRef.current = live;

  const schemeRef = useRef(scheme);
  schemeRef.current = scheme;
  const nRef = useRef(N);
  nRef.current = N;
  const ebRef = useRef(ebN0Db);
  ebRef.current = ebN0Db;

  // Rebuild on param change (non-live)
  useEffect(() => {
    if (live) return;
    eyeRingRef.current = [];
    const d = buildWaveforms({ scheme, N, ebN0Db, seed: seedRef.current });
    eyeRingRef.current = d.eyeFolds.slice(0, MAX_EYE_FOLDS);
    setData(d);
  }, [scheme, N, ebN0Db, live]);

  // Animation loop
  const animate = useCallback(() => {
    if (!liveRef.current) return;
    seedRef.current = (seedRef.current + 1) % 99999 + 1;
    const d = buildWaveforms({
      scheme: schemeRef.current,
      N: nRef.current,
      ebN0Db: ebRef.current,
      seed: seedRef.current,
    });
    // Accumulate eye folds in ring buffer
    const ring = eyeRingRef.current;
    for (const fold of d.eyeFolds) {
      if (ring.length >= MAX_EYE_FOLDS) ring.shift();
      ring.push(fold);
    }
    // Attach accumulated folds to data for the eye panel
    setData({ ...d, eyeFolds: [...ring] });
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (live) {
      eyeRingRef.current = [];
      rafRef.current = requestAnimationFrame(animate);
    } else {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [live, animate]);

  // Shared zoom for IQ / RF / Phase panels (same time axis)
  const initialHi = N;
  const [zLo, zHi, zWheel, zReset, zPan] = useZoom(0, initialHi, {
    minSpan: 1,
    maxSpan: initialHi * 4,
    clampMin: 0,
  });

  // Reset zoom when N changes
  useEffect(() => { zReset(); }, [N]); // eslint-disable-line react-hooks/exhaustive-deps

  const schemeInfo = getSchemeInfo(scheme);
  const zoom: [number, number] = [zLo, zHi];

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
        <Panel title="Parameters">
          <Slider
            label="Symbols N"
            min={8} max={64} step={1}
            value={N}
            onChange={(v) => { setN(v); setLive(false); }}
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
            style={{
              width: '100%',
              padding: '8px',
              background: live ? 'rgba(57,255,133,0.12)' : undefined,
              border: live ? '1px solid var(--accent)' : '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: live ? 'var(--accent)' : 'var(--text-dim)',
              cursor: 'pointer',
              fontFamily: 'var(--font)',
              fontSize: '13px',
              transition: 'var(--transition)',
            }}
            onClick={() => setLive((v) => !v)}
          >
            {live ? '⏸ Pause' : '▶ Live'}
          </button>
        </Panel>
      </aside>

      <div className="modulation__content">
        <Panel title={`I(t) & Q(t) — ${schemeInfo.label} Baseband`}>
          <IQPanel data={data} zoom={zoom} onWheel={zWheel} onPan={zPan} />
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
          <InfoCard title="Phase / Freq / Amplitude" accent="orange">
            For PSK the stepped phase <Formula tex="\theta_k" /> is constant per symbol.
            MSK gives a linear phase ramp — continuous-phase FSK with modulation index{' '}
            <Formula tex="h=1/2" />.
            FSK shows the discrete frequency per tone; QAM shows the symbol amplitude{' '}
            <Formula tex="|A_k|" />.
          </InfoCard>
          <InfoCard title="Eye Diagram" accent="green">
            Fold the I channel into 2-symbol windows and overlay all folds. A wide-open eye
            means high SNR and easy detection. As Eb/N₀ drops the eye closes, marking
            the limit of reliable bit recovery.
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
