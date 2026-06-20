// Digital Audio interactive section — Proakis §7.6
// Oversampling Σ-Δ conversion + TDM/DS hierarchy
// Two-column layout: controls (left) · panels + theory (right)
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
import {
  sigmaDeltaModulate,
  sigmaDeltaDecode,
  sigmaDeltaSnrDb,
} from '@/lib/dsp/sigmadelta';
import { DS_HIERARCHY, tdmOverhead } from '@/lib/dsp/tdm';
import {
  BitstreamPanel,
  ReconstructionPanel,
  NoisePsdPanel,
  TdmHierarchyDiagram,
} from './da-panels';
import { computeErrorPsd } from './da-utils';
import '@/modules/sampling-quantization/sampling-quantization.css';

// ── Constants ────────────────────────────────────────────────────────────────

// Base signal: one period of a sine at this many samples, then we oversample it.
const N_BASE = 32; // base samples before oversampling
const MAX_N = 2048; // hard cap so Σ-Δ stays real-time

// OSR options: powers of 2 from 8 to 128 (string values for Select<string>)
const OSR_OPTIONS: { value: string; label: string }[] = [8, 16, 32, 64, 128].map(
  (v) => ({ value: String(v), label: `${v}×` }),
);

// DS level select options (DS-1 … DS-5, 1-based string index)
const DS_OPTIONS = DS_HIERARCHY.map((lv, i) => ({
  value: String(i + 1),
  label: `${lv.name} — ${lv.channels} ch`,
}));

// ── Component ────────────────────────────────────────────────────────────────

/** §7.6 Oversampling Σ-Δ conversion + TDM/DS hierarchy demo. */
export function DigitalAudioSection() {
  // Σ-Δ controls
  const [toneFreqRel, setToneFreqRel] = useState(1); // relative: number of complete cycles in N_BASE samples
  const [osrStr, setOsrStr] = useState('32');
  const [decodeWindow, setDecodeWindow] = useState(16);

  // TDM control
  const [dsLevelStr, setDsLevelStr] = useState('1'); // 1-based string index into DS_HIERARCHY

  const osr = parseInt(osrStr, 10);
  const dsLevelIdx = parseInt(dsLevelStr, 10);

  // ── Signal chain ──────────────────────────────────────────────────────────

  // Oversampled length (capped)
  const N = Math.min(N_BASE * osr, MAX_N);

  // Generate oversampled sine directly (avoids base-rate aliasing)
  const analog = useMemo(() => {
    const arr = new Array<number>(N);
    const cycles = toneFreqRel; // integer number of full cycles in N samples / osr
    for (let n = 0; n < N; n++) {
      arr[n] = Math.sin((2 * Math.PI * cycles * n) / (N_BASE * osr));
    }
    return arr;
  }, [N, toneFreqRel, osr]);

  const sdResult = useMemo(() => sigmaDeltaModulate(analog), [analog]);

  const reconstructed = useMemo(
    () => sigmaDeltaDecode(sdResult.bits, decodeWindow),
    [sdResult.bits, decodeWindow],
  );

  const errorPsd = useMemo(
    () => computeErrorPsd(sdResult.error),
    [sdResult.error],
  );

  const snrDb = sigmaDeltaSnrDb(osr);

  // ── TDM ──────────────────────────────────────────────────────────────────

  const selectedLevel = DS_HIERARCHY[dsLevelIdx - 1];
  const overheadBps = tdmOverhead(selectedLevel);
  const rateMbps = (selectedLevel.rate / 1e6).toFixed(3);
  const overheadKbps = (overheadBps / 1e3).toFixed(1);

  // Key that changes whenever Σ-Δ params change — forces panel remount → zoom reset
  const zoomKey = `${toneFreqRel}-${osr}-${decodeWindow}`;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="module-layout">
      <aside className="sampling__controls">
        {/* Σ-Δ controls */}
        <Panel title="Σ-Δ Modulation">
          <Slider
            label={t('adc.da.tone')}
            value={toneFreqRel}
            min={1}
            max={8}
            step={1}
            onChange={setToneFreqRel}
          />

          <Select
            label={t('adc.da.osr')}
            value={osrStr}
            onChange={setOsrStr}
            options={OSR_OPTIONS}
          />

          <Slider
            label={t('adc.da.window')}
            value={decodeWindow}
            min={4}
            max={128}
            step={4}
            onChange={setDecodeWindow}
          />
        </Panel>

        {/* TDM controls */}
        <Panel title="TDM Hierarchy">
          <Select
            label={t('adc.da.dsLevel')}
            value={dsLevelStr}
            onChange={setDsLevelStr}
            options={DS_OPTIONS}
          />
        </Panel>

        {/* Readouts */}
        <Panel title="Readouts">
          <Readout label={t('adc.da.osr')} value={`${osr}×`} />
          <Readout label={t('adc.da.snr')} value={snrDb.toFixed(1)} unit="dB" />
          <Readout label={t('adc.da.bits')} value="1" unit="bit/sample" />
          <Readout label={t('adc.da.dsLevel')} value={selectedLevel.name} />
          <Readout label={t('adc.da.channels')} value={String(selectedLevel.channels)} />
          <Readout label={t('adc.da.rate')} value={rateMbps} unit="Mbps" />
          <Readout label={t('adc.da.overhead')} value={overheadKbps} unit="kbps" />
        </Panel>
      </aside>

      <div className="sampling__content">
        {/* A — Bitstream */}
        <Panel title={t('adc.da.panel.bitstream')}>
          <BitstreamPanel
            key={`bs-${zoomKey}`}
            analog={analog}
            bits={sdResult.bits}
          />
        </Panel>

        {/* B — Reconstruction */}
        <Panel title={t('adc.da.panel.recon')}>
          <ReconstructionPanel
            key={`rc-${zoomKey}`}
            analog={analog}
            reconstructed={reconstructed}
          />
        </Panel>

        {/* C — Noise PSD */}
        <Panel title={t('adc.da.panel.psd')}>
          <NoisePsdPanel
            key={`psd-${zoomKey}`}
            freqNorm={errorPsd.freqNorm}
            noiseDb={errorPsd.noiseDb}
          />
        </Panel>

        {/* D — TDM hierarchy schematic */}
        <Panel title={t('adc.da.panel.tdm')}>
          <TdmHierarchyDiagram level={selectedLevel} />
        </Panel>

        {/* Info cards */}
        <div className="info-cards">
          <InfoCard title={t('adc.card.oversample.title')} accent="green">
            <p>
              <HintText text={t('adc.card.oversample.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('adc.card.noiseshape.title')} accent="orange">
            <p>
              <HintText text={t('adc.card.noiseshape.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('adc.card.tdm.title')} accent="blue">
            <p>
              <HintText text={t('adc.card.tdm.body')} />
            </p>
          </InfoCard>
        </div>

      </div>
    </div>
  );
}
