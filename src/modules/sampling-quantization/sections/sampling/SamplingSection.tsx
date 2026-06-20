import { useMemo, useState } from 'react';
import {
  Panel,
  Slider,
  Select,
  Toggle,
  Readout,
  InfoCard,
  TheoryBox,
  Formula,
  HintText,
  TransportControls,
} from '@/components';
import { t } from '@/i18n';
import { PRESETS, signalPeak, type Tone } from '@/lib/dsp/signals';
import { useSimulationLoop } from '@/lib/sim/useSimulationLoop';
import { aliasFrequency } from '@/lib/dsp/sampling';
import { audioSupported, playSampledTone } from '@/lib/audio/sampling-audio';
import { useZoom } from '@/lib/plot/useZoom';
import { buildSamplingView } from '@/modules/sampling-quantization/model';
import { TimePanel, SpectrumPanel } from '@/modules/sampling-quantization/panels';
import '@/modules/sampling-quantization/sampling-quantization.css';

type PresetKey = 'single' | 'two' | 'three';

const PRESET_TONES: Record<PresetKey, Tone[]> = {
  single: PRESETS.singleTone,
  two: PRESETS.twoTone,
  three: PRESETS.threeTone,
};

const REGIME_TONE = {
  oversampling: 'ok',
  nyquist: 'warn',
  undersampling: 'err',
} as const;

const WINDOW_SEC = 1;

/** §7.1 Sampling of signals and reconstruction from samples (Proakis Ch. 7). */
export function SamplingSection() {
  const [preset, setPreset] = useState<PresetKey>('single');
  const [toneFreq, setToneFreq] = useState(2);
  const [fs, setFs] = useState(20);
  const [showRecon, setShowRecon] = useState(true);
  const [t0, setT0] = useState(0);
  const [audioToneHz, setAudioToneHz] = useState(2200);
  const [audioFs, setAudioFs] = useState(3000);

  const tones: Tone[] = useMemo(() => {
    if (preset === 'single') return [{ freq: toneFreq, amp: 1 }];
    return PRESET_TONES[preset];
  }, [preset, toneFreq]);

  const mMax = useMemo(() => signalPeak(tones), [tones]);

  const loop = useSimulationLoop({
    ticksPerSecond: 30,
    onTick: (_dt, simTime) => setT0(simTime),
    onReset: () => setT0(0),
  });

  // Quantizer params are fixed here — this section focuses on sampling, not quantizing.
  const view = useMemo(
    () =>
      buildSamplingView({
        tones,
        fs,
        bits: 4,
        mMax,
        type: 'midrise',
        coding: 'nbc',
        t0,
        windowSec: WINDOW_SEC,
        analogN: 480,
      }),
    [tones, fs, mMax, t0],
  );

  const cursorT = view.samples.t.length ? view.samples.t[view.samples.t.length - 1] : undefined;
  const aliasPitch = aliasFrequency(audioToneHz, audioFs);

  // Zoom/pan over the time window. Stored as offsets within [0, WINDOW_SEC] so the
  // zoomed sub-window scrolls together with the live left edge t0 during playback.
  const [zLo, zHi, onWheelT, , onPanT] = useZoom(0, WINDOW_SEC, {
    minSpan: 0.1,
    maxSpan: WINDOW_SEC,
    clampMin: 0,
    clampMax: WINDOW_SEC,
  });
  const timeDomain: [number, number] = [t0 + zLo, t0 + zHi];

  return (
    <div className="module-layout">
      <aside className="sampling__controls">
        <Panel title={t('sampling.signal')}>
          <Select<PresetKey>
            label={t('sampling.signal')}
            value={preset}
            onChange={setPreset}
            options={[
              { value: 'single', label: t('sampling.preset.single') },
              { value: 'two', label: t('sampling.preset.two') },
              { value: 'three', label: t('sampling.preset.three') },
            ]}
          />
          {preset === 'single' && (
            <Slider
              label={t('sampling.toneFreq')}
              value={toneFreq}
              min={1}
              max={20}
              step={1}
              unit="Hz"
              onChange={setToneFreq}
            />
          )}
          <Slider
            label={t('sampling.fs')}
            value={fs}
            min={2}
            max={60}
            step={1}
            unit="Hz"
            onChange={setFs}
          />
          <Toggle label={t('sampling.reconstruct')} checked={showRecon} onChange={setShowRecon} />
          <TransportControls loop={loop} />
        </Panel>

        <Panel title="🔊 Audio (aliasing)">
          <Slider
            label="Tone"
            value={audioToneHz}
            min={200}
            max={4000}
            step={50}
            unit="Hz"
            onChange={setAudioToneHz}
          />
          <Slider
            label="Sampling rate"
            value={audioFs}
            min={500}
            max={8000}
            step={100}
            unit="Hz"
            onChange={setAudioFs}
          />
          <Readout label="You should hear ≈" value={aliasPitch.toFixed(0)} unit="Hz" />
          <button
            type="button"
            disabled={!audioSupported()}
            onClick={() => playSampledTone({ toneHz: audioToneHz, sampleHz: audioFs, bits: 4, type: 'midrise' })}
          >
            ▶ Play sampled tone
          </button>
        </Panel>
      </aside>

      <div className="sampling__content">
        <div className="sampling__readouts">
          <Readout label={t('sampling.readout.bandwidth')} value={view.bandwidth} unit="Hz" />
          <Readout label={t('sampling.readout.nyquist')} value={view.nyquist} unit="Hz" />
          <Readout
            label={t('sampling.readout.regime')}
            value={
              view.regime === 'oversampling'
                ? 'Oversampling'
                : view.regime === 'nyquist'
                  ? 'Nyquist'
                  : 'Undersampling'
            }
            tone={REGIME_TONE[view.regime]}
          />
        </div>

        <div className="sampling__panels">
          <Panel title={t('sampling.panel.time')}>
            <TimePanel
              view={view}
              mMax={mMax}
              showReconstruction={showRecon}
              cursorT={loop.running ? cursorT : undefined}
              domain={timeDomain}
              onWheel={onWheelT}
              onPan={onPanT}
            />
          </Panel>
          <Panel title={t('sampling.panel.spectrum')}>
            <SpectrumPanel key={`${preset}-${fs}`} tones={tones} fs={fs} />
          </Panel>
        </div>

        <div className="info-cards">
          <InfoCard title={t('adc.card.nyquist.title')} accent="green">
            <p>
              <HintText text={t('adc.card.nyquist.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('adc.card.aliasing.title')} accent="orange">
            <p>
              <HintText text={t('adc.card.aliasing.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('adc.card.recon.title')} accent="blue">
            <p>
              <HintText text={t('adc.card.recon.body')} />
            </p>
          </InfoCard>
        </div>

        <TheoryBox title={t('sampling.theory.title')}>
          <p>
            <Formula tex="f_s \ge 2W \quad\text{(Nyquist)}" block />
          </p>
          <p>
            <Formula
              tex="g_R(t)=\sum_n g(nT_s)\,\operatorname{sinc}\!\left(\tfrac{t-nT_s}{T_s}\right)"
              block
            />
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}
