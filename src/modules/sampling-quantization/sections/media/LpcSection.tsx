// LPC Vocoder interactive section (Proakis §7.5)
// Two-column layout: controls (left) · panels + theory (right)
import { useMemo, useState } from 'react';
import { Panel, Slider, Select, Segmented, Readout, InfoCard, TheoryBox, Formula, HintText } from '@/components';
import { t } from '@/i18n';
import {
  synthSpeechFrame,
  lpcAnalyze,
  predictionError,
  lpcSynthesize,
  predictionGainDb,
  estimatePitch,
  lpcSpectrum,
  lpcBitRate,
  impulseTrain,
  whiteNoise,
} from '@/lib/dsp/lpc';
import {
  SpeechModelDiagram,
  WaveformPanel,
  SpectrumEnvelopePanel,
  ResidualPanel,
} from './lpc-panels';
import { frameSpectrum } from './lpc-utils';
import '@/modules/sampling-quantization/sampling-quantization.css';

// ── Constants ────────────────────────────────────────────────────────────────

const FS = 8000; // telephony sampling rate (Hz)
const N = 512;   // frame length in samples

// ── Vowel presets (formant frequencies / bandwidths from §7.5 examples) ──────

type VowelKey = 'a' | 'i' | 'u';

interface Formant { freq: number; bw: number }

const VOWELS: Record<VowelKey, { label: string; formants: Formant[] }> = {
  a: {
    label: '/a/',
    formants: [
      { freq: 730, bw: 90 },
      { freq: 1090, bw: 90 },
      { freq: 2440, bw: 90 },
    ],
  },
  i: {
    label: '/i/',
    formants: [
      { freq: 270, bw: 90 },
      { freq: 2290, bw: 90 },
      { freq: 3010, bw: 90 },
    ],
  },
  u: {
    label: '/u/',
    formants: [
      { freq: 300, bw: 90 },
      { freq: 870, bw: 90 },
      { freq: 2240, bw: 90 },
    ],
  },
};

type ExcType = 'voiced' | 'unvoiced';

// ── Component ────────────────────────────────────────────────────────────────

/** §7.5 Linear Predictive Coding (LPC) vocoder demo. */
export function LpcSection() {
  const [vowel, setVowel] = useState<VowelKey>('a');
  const [excitation, setExcitation] = useState<ExcType>('voiced');
  const [pitchHz, setPitchHz] = useState(120);
  const [order, setOrder] = useState(10);

  const voiced = excitation === 'voiced';

  // ── Signal synthesis ──────────────────────────────────────────────────────

  const original = useMemo(
    () =>
      synthSpeechFrame({
        fs: FS,
        N,
        voiced,
        pitchHz,
        formants: VOWELS[vowel].formants,
        seed: 1,
      }),
    // vowel, voiced, pitchHz drive the synthesis — not `order`
    [vowel, voiced, pitchHz],
  );

  const model = useMemo(() => lpcAnalyze(original, order), [original, order]);

  const residual = useMemo(() => predictionError(original, model.a), [original, model]);

  const synth = useMemo(() => {
    const period = voiced && pitchHz > 0 ? Math.max(1, Math.round(FS / pitchHz)) : 0;
    const exc = voiced ? impulseTrain(N, period) : whiteNoise(N, 2);
    return lpcSynthesize(exc, model.a, model.gain);
  }, [model, voiced, pitchHz]);

  const pitch = useMemo(() => estimatePitch(original, FS), [original]);

  // Peak-normalize the envelope (max → 0 dB) so it overlays the (also peak-normalized)
  // frame spectrum on the same scale — the envelope then visibly hugs the formant peaks.
  const spec = useMemo(() => {
    const s = lpcSpectrum(model.a, model.gain, 256);
    const peak = Math.max(...s.magDb);
    return Number.isFinite(peak) ? { ...s, magDb: s.magDb.map((d) => d - peak) } : s;
  }, [model]);

  const rate = useMemo(() => lpcBitRate(order, (1000 * N) / FS), [order]);

  // Convert LPC spectrum from normalised frequency to Hz
  const envFreqHz = useMemo(
    () => spec.freqNorm.map((fn) => fn * FS),
    [spec.freqNorm],
  );

  // Frame magnitude spectrum via FFT
  const frameSp = useMemo(() => frameSpectrum(original, FS), [original]);

  // Prediction gain (dB)
  const gainDb = predictionGainDb(original, residual);

  // Formatted readout values
  const pitchLabel = pitch.voiced
    ? `${pitch.pitchHz.toFixed(0)} Hz`
    : t('adc.lpc.unvoicedLabel');

  // Key for resetting zoom on parameter change
  const zoomKey = `${vowel}-${excitation}-${order}-${pitchHz}`;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="module-layout">
      {/* ── Left sidebar: controls ── */}
      <aside className="sampling__controls">
        <Panel title={t('adc.sub.lpc')}>
          <Select<VowelKey>
            label={t('adc.lpc.vowel')}
            value={vowel}
            onChange={setVowel}
            options={[
              { value: 'a', label: '/a/ (open)' },
              { value: 'i', label: '/i/ (front)' },
              { value: 'u', label: '/u/ (back)' },
            ]}
          />

          <Segmented<ExcType>
            ariaLabel={t('adc.lpc.excitation')}
            value={excitation}
            onChange={setExcitation}
            options={[
              { value: 'voiced', label: t('adc.lpc.voiced') },
              { value: 'unvoiced', label: t('adc.lpc.unvoiced') },
            ]}
          />

          {voiced && (
            <Slider
              label={t('adc.lpc.pitch')}
              value={pitchHz}
              min={80}
              max={300}
              step={5}
              unit="Hz"
              onChange={setPitchHz}
            />
          )}

          <Slider
            label={t('adc.lpc.order')}
            value={order}
            min={2}
            max={16}
            step={1}
            onChange={setOrder}
          />
        </Panel>

        {/* Readouts */}
        <Panel title="Readouts">
          <Readout label={t('adc.lpc.order')} value={String(order)} />
          <Readout label={t('adc.lpc.gain')} value={model.gain.toFixed(3)} />
          <Readout label={t('adc.lpc.detPitch')} value={pitchLabel} />
          <Readout label={t('adc.lpc.predGain')} value={gainDb.toFixed(1)} unit="dB" />
          <Readout
            label={t('adc.lpc.bitRate')}
            value={`${Math.round(rate.rate).toLocaleString()}`}
            unit="bit/s"
          />
          <Readout
            label={t('adc.lpc.pcmRate')}
            value={`${rate.pcmRate.toLocaleString()}`}
            unit="bit/s"
          />
          <Readout label={t('adc.lpc.compression')} value={`${rate.compression.toFixed(1)}×`} />
        </Panel>
      </aside>

      {/* ── Right content: diagrams + theory ── */}
      <div className="sampling__content">
        {/* Source-filter model diagram */}
        <Panel title={t('adc.lpc.panel.model')}>
          <SpeechModelDiagram />
        </Panel>

        {/* Original vs resynthesized waveform */}
        <Panel title={t('adc.lpc.panel.waveform')}>
          <WaveformPanel key={zoomKey} original={original} synth={synth} />
        </Panel>

        {/* LPC spectral envelope */}
        <Panel title={t('adc.lpc.panel.spectrum')}>
          <SpectrumEnvelopePanel
            key={zoomKey}
            freqHz={frameSp.freqHz}
            sigDb={frameSp.magDb}
            envFreqHz={envFreqHz}
            envDb={spec.magDb}
            fs={FS}
          />
        </Panel>

        {/* Prediction residual */}
        <Panel title={t('adc.lpc.panel.residual')}>
          <ResidualPanel key={zoomKey} error={residual} />
        </Panel>

        {/* Info cards */}
        <div className="info-cards">
          <InfoCard title={t('adc.card.lpc.title')} accent="green">
            <p>
              <HintText text={t('adc.card.lpc.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('adc.card.pred.title')} accent="orange">
            <p>
              <HintText text={t('adc.card.pred.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('adc.card.excit.title')} accent="blue">
            <p>
              <HintText text={t('adc.card.excit.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('adc.card.bitrate.title')} accent="green">
            <p>
              <HintText text={t('adc.card.bitrate.body')} />
            </p>
          </InfoCard>
        </div>

        {/* Theory box */}
        <TheoryBox title="Theory — LPC Vocoder (§7.5)">
          {/* Synthesis equation (Eq. 7.5.1) */}
          <p>
            <strong>Source-filter synthesis model</strong> — speech is produced by an
            all-pole vocal-tract filter driven by a voiced (impulse-train) or unvoiced
            (white-noise) excitation:
          </p>
          <Formula
            tex="x_n = \sum_{i=1}^{p} a_i\, x_{n-i} + G\, w_n"
            block
          />

          {/* Prediction error (Eq. 7.5.3) */}
          <p>
            <strong>Linear prediction error</strong> — the analysis filter subtracts
            the predicted sample from the actual one; the residual{' '}
            <Formula tex="e_n" /> carries the excitation information:
          </p>
          <Formula
            tex="e_n = x_n - \sum_{k=1}^{p} a_k\, x_{n-k}"
            block
          />

          {/* Yule-Walker (Eq. 7.5.9) */}
          <p>
            <strong>Yule-Walker normal equations</strong> — minimising the prediction
            error energy yields the symmetric Toeplitz system solved by
            Levinson-Durbin recursion:
          </p>
          <Formula
            tex="R\,\mathbf{a} = \mathbf{r}"
            block
          />

          {/* Gain (Eq. 7.5.12–13) */}
          <p>
            <strong>Synthesis gain</strong> — chosen so that unit-energy excitation
            produces the correct output power:
          </p>
          <Formula
            tex="G = \sqrt{\mathcal{E}_{\min}}"
            block
          />
        </TheoryBox>
      </div>
    </div>
  );
}
