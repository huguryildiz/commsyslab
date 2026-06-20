import { useMemo, useState } from 'react';
import {
  Panel,
  Slider,
  Select,
  Readout,
  InfoCard,
  TheoryBox,
  Formula,
  HintText,
  Segmented,
} from '@/components';
import { t } from '@/i18n';
import { PRESETS, signalPeak, type Tone } from '@/lib/dsp/signals';
import type { QuantizerType } from '@/lib/dsp/quantize';
import { lloydMaxDesign, uniformDistortion, type SourcePdf } from '@/lib/dsp/lloydmax';
import { useZoom } from '@/lib/plot/useZoom';
import { buildSamplingView } from '@/modules/sampling-quantization/model';
import { QuantPanel, ErrorPanel } from '@/modules/sampling-quantization/panels';
import { LloydMaxPanel } from './lloydmax-panel';
import '@/modules/sampling-quantization/sampling-quantization.css';

type PresetKey = 'single' | 'two' | 'three';

const PRESET_TONES: Record<PresetKey, Tone[]> = {
  single: PRESETS.singleTone,
  two: PRESETS.twoTone,
  three: PRESETS.threeTone,
};

const WINDOW_SEC = 1;
const FS = 200; // oversampled — keep the focus on quantization, not sampling

/** §7.2.1 Scalar (uniform) quantization (Proakis Ch. 7). */
export function ScalarQuantSection() {
  const [preset, setPreset] = useState<PresetKey>('single');
  const [toneFreq, setToneFreq] = useState(2);
  const [bits, setBits] = useState(3);
  const [type, setType] = useState<QuantizerType>('midrise');
  const [mode, setMode] = useState<'uniform' | 'optimal'>('uniform');
  const [pdf, setPdf] = useState<SourcePdf>('gaussian');
  const [nLevels, setNLevels] = useState(8);

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
        coding: 'nbc',
        t0: 0,
        windowSec: WINDOW_SEC,
        analogN: 480,
      }),
    [tones, mMax, bits, type],
  );

  const lm = useMemo(() => lloydMaxDesign(pdf, nLevels), [pdf, nLevels]);
  const uniDist = useMemo(() => uniformDistortion(pdf, nLevels, 4), [pdf, nLevels]);

  // Shared zoom/pan over the (static) time window — one instance drives both the
  // staircase and the error panel so they stay axis-aligned.
  const [tLo, tHi, onWheelT, , onPanT] = useZoom(0, WINDOW_SEC, {
    minSpan: 0.1,
    maxSpan: WINDOW_SEC,
    clampMin: 0,
    clampMax: WINDOW_SEC,
  });
  const timeDomain: [number, number] = [tLo, tHi];

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
          <Select<SourcePdf>
            label={t('adc.lm.pdf')}
            value={pdf}
            onChange={setPdf}
            options={[
              { value: 'gaussian', label: t('adc.lm.gaussian') },
              { value: 'uniform', label: t('adc.lm.uniformsrc') },
              { value: 'laplacian', label: t('adc.lm.laplacian') },
            ]}
          />
          <Slider
            label={t('adc.lm.levels')}
            value={nLevels}
            min={2}
            max={32}
            step={2}
            onChange={setNLevels}
          />
        </Panel>
      </aside>

      <div className="sampling__content">
        <div className="adc__subtabbar">
          <Segmented<'uniform' | 'optimal'>
            ariaLabel={t('adc.lm.mode')}
            value={mode}
            onChange={setMode}
            options={[
              { value: 'uniform', label: t('adc.lm.uniform') },
              { value: 'optimal', label: t('adc.lm.optimal') },
            ]}
          />
        </div>

        {mode === 'uniform' ? (
          <>
            <div className="sampling__readouts">
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
                value={Number.isFinite(view.sqnrMeasuredDb) ? view.sqnrMeasuredDb.toFixed(2) : '∞'}
                unit="dB"
              />
            </div>
            <div className="sampling__panels">
              <Panel title={t('sampling.panel.quant')}>
                <QuantPanel
                  view={view}
                  mMax={mMax}
                  bits={bits}
                  type={type}
                  domain={timeDomain}
                  onWheel={onWheelT}
                  onPan={onPanT}
                />
              </Panel>
              <Panel title={t('sampling.panel.error')}>
                <ErrorPanel
                  view={view}
                  delta={view.delta}
                  domain={timeDomain}
                  onWheel={onWheelT}
                  onPan={onPanT}
                />
              </Panel>
            </div>
          </>
        ) : (
          <>
            <div className="sampling__readouts">
              <Readout label={t('adc.lm.distortion')} value={lm.distortion.toFixed(4)} />
              <Readout label={t('adc.lm.distUniform')} value={uniDist.toFixed(4)} />
              <Readout label={t('adc.lm.sqnrOpt')} value={lm.sqnrDb.toFixed(2)} unit="dB" />
            </div>
            <Panel title={t('adc.lm.panel')}>
              <LloydMaxPanel key={`${pdf}-${nLevels}`} pdf={pdf} levels={nLevels} />
            </Panel>
          </>
        )}

        <div className="info-cards">
          <InfoCard title={t('adc.card.quant.title')} accent="green">
            <p>
              <HintText text={t('adc.card.quant.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('adc.card.sqnr.title')} accent="blue">
            <p>
              <HintText text={t('adc.card.sqnr.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('adc.card.midrisetread.title')} accent="orange">
            <p>
              <HintText text={t('adc.card.midrisetread.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('adc.card.optimal.title')} accent="blue">
            <p>
              <HintText text={t('adc.card.optimal.body')} />
            </p>
          </InfoCard>
        </div>

        <TheoryBox title="Theory — scalar quantization">
          <p>
            <Formula
              tex="\Delta=\dfrac{2m_{\max}}{L},\quad L=2^{R},\quad E[Q^2]=\dfrac{\Delta^2}{12}"
              block
            />
          </p>
          <p>
            <Formula
              tex="\mathrm{SQNR_{dB}}=10\log_{10}\!\left(\dfrac{3P_M}{m_{\max}^{2}}\right)+6.02\,R"
              block
            />
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}
