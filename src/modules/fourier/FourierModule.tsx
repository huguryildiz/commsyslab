/**
 * Fourier & Spectrum module — interactive analysis tools.
 * Proakis & Salehi §2.1–§2.5.
 */

import { useState } from 'react';
import { t } from '@/i18n';
import { Panel } from '@/components/Panel';
import { Slider } from '@/components/Slider';
import { Select } from '@/components/Select';
import { Readout } from '@/components/Readout';
import { TheoryBox } from '@/components/TheoryBox';
import { Formula } from '@/components/Formula';
import type { Periodic, Tone } from '@/lib/dsp/signals';
import type { WindowType } from '@/lib/dsp/window';
import {
  buildSeriesSynth,
  buildSpectrumAnalyzer,
  buildFilter,
  buildPairs,
  buildAnalytic,
} from './model';
import {
  SeriesSynthPlots,
  SpectrumAnalyzerPlots,
  FilterPlots,
  PairsPlots,
  AnalyticPlots,
} from './panels';
import './fourier.css';

/**
 * Fourier & Spectrum module: five interactive panels for signal analysis.
 * - Panel 1: Fourier series synthesis with Gibbs overshoot
 * - Panel 2: DFT/FFT spectrum analyzer with windowing
 * - Panel 3: LTI filter frequency response
 * - Panel 4: FT pairs & time-shift properties
 * - Panel 5: Bandpass signals & Hilbert transform
 */
export function FourierModule() {
  // Panel 1: Series Synthesis
  const [waveKind, setWaveKind] = useState<Periodic>('square');
  const [f0, setF0] = useState(1);
  const [N, setN] = useState(20);
  const [duty, setDuty] = useState(0.5);
  const seriesSynthData = buildSeriesSynth(waveKind, f0, N, duty);

  // Panel 2: Spectrum Analyzer
  const [analyzerType, setAnalyzerType] = useState<'tones' | 'wave'>('tones');
  const [freq1, setFreq1] = useState(10);
  const [amp1, setAmp1] = useState(1);
  const [fsAnalyzer, setFsAnalyzer] = useState(100);
  const [numSamples, setNumSamples] = useState(256);
  const [windowType, setWindowType] = useState<WindowType>('hann');
  const tones: Tone[] = [{ freq: freq1, amp: amp1 }];
  const spectrumData = buildSpectrumAnalyzer(
    analyzerType,
    tones,
    'square',
    1,
    fsAnalyzer,
    Math.min(numSamples, 512),
    windowType,
  );

  // Panel 3: Filter
  const [filterType, setFilterType] = useState<'lpf' | 'hpf' | 'bpf' | 'rc'>('lpf');
  const [fc, setFc] = useState(30);
  const [fc2, setFc2] = useState(70);
  const filterData = buildFilter(filterType, fc, fc2, freq1, 500);

  // Panel 4: FT Pairs
  const [pairKind, setPairKind] = useState<'rect' | 'tri' | 'gauss'>('rect');
  const [pairParam, setPairParam] = useState(0.1);
  const [timeShift, setTimeShift] = useState(0);
  const [ampScale, setAmpScale] = useState(1);
  const pairsData = buildPairs(pairKind, pairParam, timeShift, ampScale);

  // Panel 5: Bandpass & Hilbert
  const [fcBP, setFcBP] = useState(200);
  const [fm, setFm] = useState(10);
  const [m, setM] = useState(0.5);
  const analyticData = buildAnalytic(fcBP, fm, m);

  return (
    <div className="module-layout">
      <aside className="fourier__controls">
        {/* Panel 1 Controls */}
        <Panel title={t('fourier.panel.synthesis')}>
          <Select
            label={t('fourier.syn.waveform')}
            value={waveKind}
            options={[
              { value: 'square', label: t('fourier.syn.waveform.square') },
              { value: 'triangle', label: t('fourier.syn.waveform.triangle') },
              { value: 'sawtooth', label: t('fourier.syn.waveform.sawtooth') },
              { value: 'pulse', label: t('fourier.syn.waveform.pulse') },
            ]}
            onChange={setWaveKind}
          />
          <Slider
            label={t('fourier.syn.f0')}
            value={f0}
            min={0.5}
            max={5}
            step={0.1}
            unit="Hz"
            onChange={setF0}
          />
          <Slider
            label={t('fourier.syn.harmonics')}
            value={N}
            min={1}
            max={50}
            step={1}
            onChange={setN}
          />
          {waveKind === 'pulse' && (
            <Slider
              label={t('fourier.syn.duty')}
              value={duty}
              min={0.1}
              max={0.9}
              step={0.05}
              onChange={setDuty}
            />
          )}
        </Panel>

        {/* Panel 2 Controls */}
        <Panel title={t('fourier.panel.analyzer')}>
          <Select
            label={t('fourier.analyzer.signalType')}
            value={analyzerType}
            options={[
              { value: 'tones', label: t('fourier.analyzer.signalType.tones') },
              { value: 'wave', label: t('fourier.analyzer.signalType.wave') },
            ]}
            onChange={setAnalyzerType}
          />
          <Slider
            label={t('fourier.analyzer.f1')}
            value={freq1}
            min={1}
            max={50}
            step={1}
            unit="Hz"
            onChange={setFreq1}
          />
          <Slider
            label={t('fourier.analyzer.amp1')}
            value={amp1}
            min={0.1}
            max={2}
            step={0.1}
            onChange={setAmp1}
          />
          <Slider
            label={t('fourier.analyzer.fs')}
            value={fsAnalyzer}
            min={50}
            max={500}
            step={10}
            unit="Hz"
            onChange={setFsAnalyzer}
          />
          <Slider
            label={t('fourier.analyzer.numSamples')}
            value={numSamples}
            min={64}
            max={512}
            step={64}
            onChange={setNumSamples}
          />
          <Select
            label={t('fourier.analyzer.window')}
            value={windowType}
            options={[
              { value: 'rect', label: t('fourier.analyzer.window.rect') },
              { value: 'hann', label: t('fourier.analyzer.window.hann') },
              { value: 'hamming', label: t('fourier.analyzer.window.hamming') },
            ]}
            onChange={setWindowType}
          />
        </Panel>

        {/* Panel 3 Controls */}
        <Panel title={t('fourier.panel.filter')}>
          <Select
            label={t('fourier.filter.type')}
            value={filterType}
            options={[
              { value: 'lpf', label: t('fourier.filter.type.lpf') },
              { value: 'hpf', label: t('fourier.filter.type.hpf') },
              { value: 'bpf', label: t('fourier.filter.type.bpf') },
              { value: 'rc', label: t('fourier.filter.type.rc') },
            ]}
            onChange={setFilterType}
          />
          <Slider
            label={t('fourier.filter.fc')}
            value={fc}
            min={5}
            max={100}
            step={5}
            unit="Hz"
            onChange={setFc}
          />
          {filterType === 'bpf' && (
            <Slider
              label={t('fourier.filter.fc2')}
              value={fc2}
              min={fc + 5}
              max={150}
              step={5}
              unit="Hz"
              onChange={setFc2}
            />
          )}
        </Panel>

        {/* Panel 4 Controls */}
        <Panel title={t('fourier.panel.pairs')}>
          <Select
            label={t('fourier.pairs.kind')}
            value={pairKind}
            options={[
              { value: 'rect', label: t('fourier.pairs.kind.rect') },
              { value: 'tri', label: t('fourier.pairs.kind.tri') },
              { value: 'gauss', label: t('fourier.pairs.kind.gauss') },
            ]}
            onChange={setPairKind}
          />
          <Slider
            label={t('fourier.pairs.param')}
            value={pairParam}
            min={0.05}
            max={0.5}
            step={0.05}
            onChange={setPairParam}
          />
          <Slider
            label={t('fourier.pairs.shift')}
            value={timeShift}
            min={-0.5}
            max={0.5}
            step={0.05}
            onChange={setTimeShift}
          />
          <Slider
            label={t('fourier.pairs.scale')}
            value={ampScale}
            min={0.5}
            max={2}
            step={0.1}
            onChange={setAmpScale}
          />
        </Panel>

        {/* Panel 5 Controls */}
        <Panel title={t('fourier.panel.analytic')}>
          <Slider
            label={t('fourier.bp.fc')}
            value={fcBP}
            min={50}
            max={500}
            step={10}
            unit="Hz"
            onChange={setFcBP}
          />
          <Slider
            label={t('fourier.bp.fm')}
            value={fm}
            min={1}
            max={50}
            step={1}
            unit="Hz"
            onChange={setFm}
          />
          <Slider
            label={t('fourier.bp.m')}
            value={m}
            min={0.1}
            max={0.9}
            step={0.1}
            onChange={setM}
          />
        </Panel>
      </aside>

      <div className="fourier__content">
        {/* Readouts */}
        <div className="fourier__readouts">
          <Readout label={t('fourier.readout.dc')} value={seriesSynthData.dcMag.toFixed(3)} />
          <Readout label={t('fourier.readout.c1')} value={seriesSynthData.c1Mag.toFixed(3)} />
          <Readout
            label={t('fourier.readout.power')}
            value={(Math.abs(seriesSynthData.c1Mag) ** 2).toFixed(3)}
          />
          <Readout label={t('fourier.readout.env')} value={analyticData.envelope[256]?.toFixed(3) ?? '—'} />
        </div>

        {/* Plots */}
        <div className="fourier__plots">
          <Panel title={t('fourier.panel.synthesis')}>
            <SeriesSynthPlots data={seriesSynthData} />
          </Panel>

          <Panel title={t('fourier.panel.analyzer')}>
            <SpectrumAnalyzerPlots data={spectrumData} />
          </Panel>

          <Panel title={t('fourier.panel.filter')}>
            <FilterPlots data={filterData} />
          </Panel>

          <Panel title={t('fourier.panel.pairs')}>
            <PairsPlots data={pairsData} />
          </Panel>

          <Panel title={t('fourier.panel.analytic')}>
            <AnalyticPlots data={analyticData} />
          </Panel>
        </div>

        {/* Theory Box */}
        <TheoryBox title={t('fourier.theory.title')}>
          <h4>{t('fourier.theory.series')}</h4>
          <Formula
            tex="x(t) = \sum_{n=-\infty}^{\infty} c_n e^{j2\pi n f_0 t}"
            block
          />
          <p>
            Proakis § 2.1: Any periodic signal can be decomposed as a sum of complex exponentials at integer harmonics of the fundamental frequency.
          </p>

          <h4>{t('fourier.theory.dft')}</h4>
          <Formula
            tex="X[k] = \sum_{n=0}^{N-1} x[n] e^{-j2\pi kn/N}"
            block
          />
          <p>
            Proakis § 2.2: The DFT maps N time-domain samples to N frequency bins. Windowing reduces spectral leakage.
          </p>

          <h4>{t('fourier.theory.filter')}</h4>
          <Formula
            tex="Y(f) = H(f) X(f)"
            block
          />
          <p>
            Proakis § 2.2.2: Linear filtering is multiplication in the frequency domain. Ideal filters (bricks) have sharp cutoffs; practical filters (RC, Butterworth) roll off smoothly.
          </p>

          <h4>{t('fourier.theory.hilbert')}</h4>
          <Formula
            tex="\hat{x}(t) = \frac{1}{\pi} \int_{-\infty}^{\infty} \frac{x(\tau)}{t - \tau} d\tau"
            block
          />
          <p>
            Proakis § 2.5: The Hilbert transform applies a −π/2 phase shift, creating the imaginary part of the analytic signal.
          </p>

          <h4>{t('fourier.theory.analytic')}</h4>
          <Formula
            tex="z(t) = x(t) + j\hat{x}(t)"
            block
          />
          <p>
            Proakis § 2.5: The analytic signal has a one-sided spectrum (only positive frequencies). Its envelope V(t) = |z(t)| isolates the amplitude modulation of a bandpass signal.
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}
