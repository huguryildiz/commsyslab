import { useMemo, useState } from 'react';
import {
  Panel,
  Slider,
  Select,
  Readout,
  InfoCard,
  HintText,
} from '@/components';
import { t } from '@/i18n';
import { PRESETS, signalPeak, type Tone } from '@/lib/dsp/signals';
import type { QuantizerType } from '@/lib/dsp/quantize';
import type { PcmCoding } from '@/lib/dsp/pcm';
import type { CompandingLaw } from '@/lib/dsp/companding';
import { buildSamplingView } from '@/modules/sampling-quantization/model';
import { CompanderCurvePanel, SqnrAmpPanel } from './companding-panels';
import '@/modules/sampling-quantization/sampling-quantization.css';

type PresetKey = 'single' | 'two' | 'three';

const PRESET_TONES: Record<PresetKey, Tone[]> = {
  single: PRESETS.singleTone,
  two: PRESETS.twoTone,
  three: PRESETS.threeTone,
};

const WINDOW_SEC = 1;
const FS = 64;

/** Format a bit array as space-separated groups of 4 (last 64 bits). */
function formatBits(bits: number[]): string {
  const tail = bits.slice(-64).join('');
  return (tail.match(/.{1,4}/g) ?? []).join(' ');
}

/** §7.3 Encoding + §7.4.1 PCM (Proakis Ch. 7). */
export function PcmSection() {
  const [preset, setPreset] = useState<PresetKey>('single');
  const [toneFreq, setToneFreq] = useState(2);
  const [bits, setBits] = useState(3);
  const [type, setType] = useState<QuantizerType>('midrise');
  const [coding, setCoding] = useState<PcmCoding>('nbc');
  const [law, setLaw] = useState<CompandingLaw>('none');
  const [param, setParam] = useState(255);

  const tones: Tone[] = useMemo(() => {
    if (preset === 'single') return [{ freq: toneFreq, amp: 1 }];
    return PRESET_TONES[preset];
  }, [preset, toneFreq]);

  const mMax = useMemo(() => signalPeak(tones), [tones]);

  const view = useMemo(
    () =>
      buildSamplingView({
        tones,
        fs: FS,
        bits,
        mMax,
        type,
        coding,
        t0: 0,
        windowSec: WINDOW_SEC,
        analogN: 480,
      }),
    [tones, mMax, bits, type, coding],
  );

  const bitRate = bits * FS;

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
          <Select<CompandingLaw>
            label={t('adc.compand.law')}
            value={law}
            onChange={setLaw}
            options={[
              { value: 'none', label: t('adc.compand.none') },
              { value: 'mu', label: t('adc.compand.mu') },
              { value: 'A', label: t('adc.compand.a') },
            ]}
          />
          {law !== 'none' && (
            <Slider
              label={t('adc.compand.param')}
              value={param}
              min={1}
              max={255}
              step={1}
              onChange={setParam}
            />
          )}
        </Panel>
      </aside>

      <div className="sampling__content">
        <div className="sampling__readouts">
          <Readout label="Bit rate Rₛ·fₛ" value={bitRate} unit="bit/s" />
          <Readout label={t('sampling.readout.levels')} value={2 ** bits} />
        </div>

        <Panel title={t('sampling.pcm.title')}>
          <div className="sampling__bitstream" aria-label="PCM bitstream preview">
            {formatBits(view.pcm) || '—'}
          </div>
        </Panel>

        <div className="sampling__panels">
          <Panel title={t('adc.compand.curve')}>
            <CompanderCurvePanel law={law} param={param} />
          </Panel>
          <Panel title={t('adc.compand.sqnr')}>
            <SqnrAmpPanel law={law} param={param} bits={bits} />
          </Panel>
        </div>

        <div className="info-cards">
          <InfoCard title={t('adc.card.pcm.title')} accent="green">
            <p>
              <HintText text={t('adc.card.pcm.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('adc.card.gray.title')} accent="orange">
            <p>
              <HintText text={t('adc.card.gray.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('adc.card.compand.title')} accent="blue">
            <p>
              <HintText text={t('adc.card.compand.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('adc.card.mualaw.title')} accent="orange">
            <p>
              <HintText text={t('adc.card.mualaw.body')} />
            </p>
          </InfoCard>
        </div>

      </div>
    </div>
  );
}
