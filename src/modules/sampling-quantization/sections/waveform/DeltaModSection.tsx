import { useMemo, useRef, useState } from 'react';
import {
  Panel,
  Slider,
  Readout,
  InfoCard,
  HintText,
  TransportControls,
  Segmented,
} from '@/components';
import { t } from '@/i18n';
import { adaptiveDeltaModulate } from '@/lib/dsp/deltamod';
import { buildDeltaModView } from './deltamod-model';
import { SignalStaircasePanel, ErrorPanel } from './deltamod-panels';
import { StepTrackingPanel } from './adm-panel';
import { useSimulationLoop } from '@/lib/sim/useSimulationLoop';
import { useZoom } from '@/lib/plot/useZoom';
import { playDeltaDemo } from '@/lib/audio/deltamod-audio';
import { audioSupported } from '@/lib/audio/sampling-audio';
import type { Bit } from '@/lib/sim/sources';
import './deltamod.css';

const WINDOW_SEC = 1;

/** §7.4.3 Delta modulation (Proakis Ch. 7). */
export function DeltaModSection() {
  const [toneFreq, setToneFreq] = useState(2);
  const [toneAmp, setToneAmp] = useState(1);
  const [fs, setFs] = useState(40);
  const [step, setStep] = useState(0.1);
  const [t0, setT0] = useState(0);
  const [bitLog, setBitLog] = useState<string>('');
  const [audioToneHz, setAudioToneHz] = useState(400);
  const [audioFs, setAudioFs] = useState(4000);
  const [mode, setMode] = useState<'linear' | 'adaptive'>('linear');
  const [adaptK, setAdaptK] = useState(1.5);
  const xhatRef = useRef(0);
  const lastIdxRef = useRef(-1);

  // Offset zoom stored as offsets within [0, WINDOW_SEC] so the zoomed sub-window
  // scrolls with the live left edge t0 during playback (same pattern as SamplingSection).
  const [zLo, zHi, onWheelT, resetZoom, onPanT] = useZoom(0, WINDOW_SEC, {
    minSpan: 0.1,
    maxSpan: WINDOW_SEC,
    clampMin: 0,
    clampMax: WINDOW_SEC,
  });
  const timeDomain: [number, number] = [t0 + zLo, t0 + zHi];

  const loop = useSimulationLoop({
    ticksPerSecond: 30,
    onTick: (_dt, simTime) => {
      setT0(simTime);
      const Ts = 1 / fs;
      const idx = Math.floor((simTime + WINDOW_SEC) / Ts);
      if (idx !== lastIdxRef.current) {
        let appended = '';
        for (let k = lastIdxRef.current + 1; k <= idx; k++) {
          const x = toneAmp * Math.sin(2 * Math.PI * toneFreq * k * Ts);
          const bit: Bit = x >= xhatRef.current ? 1 : 0;
          xhatRef.current += bit === 1 ? step : -step;
          appended += bit;
        }
        lastIdxRef.current = idx;
        if (appended) setBitLog((prev) => (prev + appended).slice(-64));
      }
    },
    onReset: () => {
      setT0(0);
      setBitLog('');
      xhatRef.current = 0;
      lastIdxRef.current = -1;
      resetZoom();
    },
  });

  const view = useMemo(
    () => buildDeltaModView({ toneFreq, toneAmp, fs, step, t0, windowSec: WINDOW_SEC, analogN: 480 }),
    [toneFreq, toneAmp, fs, step, t0],
  );

  const admView = useMemo(() => {
    const adm = adaptiveDeltaModulate(view.sampleValues, step, adaptK, 0);
    return {
      ...view,
      staircase: adm.staircase,
      bits: adm.bits,
      overload: view.sampleValues.map(() => false),
      error: view.sampleValues.map((v, i) => v - adm.staircase[i]),
      steps: adm.steps,
    };
  }, [view, step, adaptK]);

  const yMax = toneAmp * 1.3;
  const cursorT = view.sampleTimes.length ? view.sampleTimes[view.sampleTimes.length - 1] : undefined;
  const windowBits = view.bits.slice(0, 64).join('');
  const bitsPreview = (loop.running ? bitLog : windowBits).replace(/(.{4})/g, '$1 ').trim();

  return (
    <div className="module-layout">
      <aside className="deltamod__controls">
        <Panel title={t('deltamod.title')}>
          <Slider label={t('deltamod.toneFreq')} value={toneFreq} min={1} max={10} step={1} unit="Hz" onChange={setToneFreq} />
          <Slider label={t('deltamod.toneAmp')} value={toneAmp} min={0.2} max={2} step={0.1} onChange={setToneAmp} />
          <Slider label={t('deltamod.fs')} value={fs} min={10} max={120} step={5} unit="Hz" onChange={setFs} />
          <Slider label={t('deltamod.step')} value={step} min={0.02} max={1} step={0.02} onChange={setStep} />
          {mode === 'adaptive' && (
            <Slider label={t('adc.dm.k')} value={adaptK} min={1.1} max={2.5} step={0.1} onChange={setAdaptK} />
          )}
          <TransportControls loop={loop} />
        </Panel>
        <Panel title={t('deltamod.bitstream.title')}>
          <div className="deltamod__bitstream" aria-label="DM bitstream preview">{bitsPreview || '—'}</div>
        </Panel>
        <Panel title={t('deltamod.audio.title')}>
          <Slider label={t('deltamod.toneFreq')} value={audioToneHz} min={100} max={2000} step={50} unit="Hz" onChange={setAudioToneHz} />
          <Slider label={t('deltamod.fs')} value={audioFs} min={1000} max={8000} step={250} unit="Hz" onChange={setAudioFs} />
          <button type="button" disabled={!audioSupported()} onClick={() => playDeltaDemo({ toneHz: audioToneHz, sampleHz: audioFs, step, dm: false })}>
            {t('deltamod.audio.playOriginal')}
          </button>
          <button type="button" disabled={!audioSupported()} onClick={() => playDeltaDemo({ toneHz: audioToneHz, sampleHz: audioFs, step, dm: true })}>
            {t('deltamod.audio.playDm')}
          </button>
        </Panel>
      </aside>
      <div className="deltamod__content">
        <div className="adc__subtabbar">
          <Segmented<'linear' | 'adaptive'>
            ariaLabel={t('adc.dm.mode')}
            value={mode}
            onChange={setMode}
            options={[
              { value: 'linear', label: t('adc.dm.linear') },
              { value: 'adaptive', label: t('adc.dm.adaptive') },
            ]}
          />
        </div>
        <div className="deltamod__readouts">
          <Readout label={t('deltamod.readout.slopeLimit')} value={view.slopeLimit.toFixed(2)} />
          <Readout label={t('deltamod.readout.maxSlope')} value={view.maxSignalSlope.toFixed(2)} />
          <Readout label={t('deltamod.readout.regime')} value={view.overloading ? t('deltamod.regime.overload') : t('deltamod.regime.ok')} tone={view.overloading ? 'err' : 'ok'} />
          <Readout label={t('deltamod.readout.snr')} value={Number.isFinite(view.snrDb) ? view.snrDb.toFixed(1) : '∞'} unit="dB" />
        </div>
        <div className="deltamod__panels">
          {mode === 'linear' ? (
            <>
              <Panel title={t('deltamod.panel.signal')}><SignalStaircasePanel view={view} yMax={yMax} cursorT={loop.running ? cursorT : undefined} domain={timeDomain} onWheel={onWheelT} onPan={onPanT} /></Panel>
              <Panel title={t('deltamod.panel.error')}><ErrorPanel view={view} step={step} domain={timeDomain} onWheel={onWheelT} onPan={onPanT} /></Panel>
            </>
          ) : (
            <>
              <Panel title={t('deltamod.panel.signal')}><SignalStaircasePanel view={admView} yMax={yMax} cursorT={loop.running ? cursorT : undefined} domain={timeDomain} onWheel={onWheelT} onPan={onPanT} /></Panel>
              <Panel title={t('adc.dm.steps')}><StepTrackingPanel steps={admView.steps} times={view.sampleTimes} domain={timeDomain} onWheel={onWheelT} onPan={onPanT} /></Panel>
            </>
          )}
        </div>
        <div className="info-cards">
          <InfoCard title={t('adc.card.dm.title')} accent="green">
            <p><HintText text={t('adc.card.dm.body')} /></p>
          </InfoCard>
          <InfoCard title={t('adc.card.slope.title')} accent="orange">
            <p><HintText text={t('adc.card.slope.body')} /></p>
          </InfoCard>
          <InfoCard title={t('adc.card.adm.title')} accent="blue">
            <p><HintText text={t('adc.card.adm.body')} /></p>
          </InfoCard>
        </div>
      </div>
    </div>
  );
}
