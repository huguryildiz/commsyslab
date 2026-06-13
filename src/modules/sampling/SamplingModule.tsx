import { useMemo, useState } from 'react';
import {
  Panel,
  Slider,
  Select,
  Toggle,
  Readout,
  TheoryBox,
  Formula,
} from '@/components';
import { t } from '@/i18n';
import { PRESETS, signalPeak, type Tone } from '@/lib/dsp/signals';
import type { QuantizerType } from '@/lib/dsp/quantize';
import type { PcmCoding } from '@/lib/dsp/pcm';
import { buildSamplingView } from './model';
import { TimePanel, SpectrumPanel, QuantPanel, ErrorPanel } from './panels';
import './sampling.css';

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

export function SamplingModule() {
  const [preset, setPreset] = useState<PresetKey>('single');
  const [toneFreq, setToneFreq] = useState(2);
  const [fs, setFs] = useState(20);
  const [bits, setBits] = useState(3);
  const [type, setType] = useState<QuantizerType>('midrise');
  const [coding, setCoding] = useState<PcmCoding>('nbc');
  const [showRecon, setShowRecon] = useState(true);

  const tones: Tone[] = useMemo(() => {
    if (preset === 'single') return [{ freq: toneFreq, amp: 1 }];
    return PRESET_TONES[preset];
  }, [preset, toneFreq]);

  const mMax = useMemo(() => signalPeak(tones), [tones]);

  const view = useMemo(
    () =>
      buildSamplingView({
        tones,
        fs,
        bits,
        mMax,
        type,
        coding,
        t0: 0,
        windowSec: WINDOW_SEC,
        analogN: 480,
      }),
    [tones, fs, bits, mMax, type, coding],
  );

  const pcmPreview = view.pcm
    .slice(0, 48)
    .join('')
    .replace(/(.{4})/g, '$1 ')
    .trim();

  return (
    <div className="module-layout">
      <aside className="sampling__controls">
        <Panel title={t('nav.sampling')}>
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
          <Slider
            label={t('sampling.bits')}
            value={bits}
            min={1}
            max={8}
            step={1}
            unit="bit"
            onChange={setBits}
          />
          <Select<QuantizerType>
            label={t('sampling.quantizer')}
            value={type}
            onChange={setType}
            options={[
              { value: 'midrise', label: t('sampling.midrise') },
              { value: 'midtread', label: t('sampling.midtread') },
            ]}
          />
          <Select<PcmCoding>
            label={t('sampling.coding')}
            value={coding}
            onChange={setCoding}
            options={[
              { value: 'nbc', label: t('sampling.nbc') },
              { value: 'gray', label: t('sampling.gray') },
            ]}
          />
          <Toggle
            label={t('sampling.reconstruct')}
            checked={showRecon}
            onChange={setShowRecon}
          />
        </Panel>

        <Panel title={t('sampling.pcm.title')}>
          <div className="sampling__bitstream" aria-label="PCM bitstream preview">
            {pcmPreview || '—'}
          </div>
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
          <Readout label={t('sampling.readout.levels')} value={2 ** bits} />
          <Readout label={t('sampling.readout.delta')} value={view.delta.toFixed(3)} />
          <Readout
            label={t('sampling.readout.noise')}
            value={view.noisePower.toExponential(2)}
          />
          <Readout
            label={t('sampling.readout.sqnrTheory')}
            value={view.sqnrTheoryDb.toFixed(2)}
            unit="dB"
          />
          <Readout
            label={t('sampling.readout.sqnrMeasured')}
            value={
              Number.isFinite(view.sqnrMeasuredDb) ? view.sqnrMeasuredDb.toFixed(2) : '∞'
            }
            unit="dB"
          />
        </div>

        <div className="sampling__panels">
          <Panel title={t('sampling.panel.time')}>
            <TimePanel view={view} mMax={mMax} showReconstruction={showRecon} />
          </Panel>
          <Panel title={t('sampling.panel.spectrum')}>
            <SpectrumPanel tones={tones} fs={fs} />
          </Panel>
          <Panel title={t('sampling.panel.quant')}>
            <QuantPanel view={view} mMax={mMax} bits={bits} type={type} />
          </Panel>
          <Panel title={t('sampling.panel.error')}>
            <ErrorPanel view={view} delta={view.delta} />
          </Panel>
        </div>

        <TheoryBox title={t('sampling.theory.title')}>
          <p>
            <Formula tex="f_s \ge 2W \quad\text{(Nyquist)}" block />
          </p>
          <p>
            <Formula tex="g_R(t)=\sum_n g(nT_s)\,\operatorname{sinc}\!\left(\tfrac{t-nT_s}{T_s}\right)" block />
          </p>
          <p>
            <Formula tex="\Delta=\dfrac{2m_{\max}}{L},\quad L=2^{R},\quad E[Q^2]=\dfrac{\Delta^2}{12}" block />
          </p>
          <p>
            <Formula tex="\mathrm{SQNR_{dB}}=10\log_{10}\!\left(\dfrac{3P_M}{m_{\max}^{2}}\right)+6.02\,R" block />
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}
