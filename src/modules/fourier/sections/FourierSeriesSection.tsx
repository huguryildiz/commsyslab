import { useState } from 'react';
import { Panel, Slider, Select, Formula } from '@/components';
import { t } from '@/i18n';
import { buildSeriesSynth, WAVEFORM_INFO, SERIES_WAVE_OPTIONS, type SeriesWaveKind } from '../model';
import { SeriesSynthPlots } from '../panels';
import type { SectionProps } from './types';

const DEFAULTS = { waveKind: 'square' as SeriesWaveKind, f0: 1, N: 20, duty: 0.5 };

export function FourierSeriesSection({ clock }: SectionProps) {
  const [waveKind, setWaveKind] = useState<SeriesWaveKind>(DEFAULTS.waveKind);
  const [f0, setF0] = useState(DEFAULTS.f0);
  const [N, setN] = useState(DEFAULTS.N);
  const [duty, setDuty] = useState(DEFAULTS.duty);

  function handleReset() {
    setWaveKind(DEFAULTS.waveKind);
    setF0(DEFAULTS.f0);
    setN(DEFAULTS.N);
    setDuty(DEFAULTS.duty);
  }

  const data = buildSeriesSynth(waveKind, f0, N, duty, clock);
  const info = WAVEFORM_INFO[waveKind];

  // Parseval: fraction of total signal power captured by the N retained harmonics.
  // mags are amplitudes Aₙ → power = DC² + Σ Aₙ²/2; total power = mean(x²).
  const capturedPower = data.mags.reduce(
    (s, m, i) => s + (data.freqs[i] === 0 ? m * m : (m * m) / 2),
    0,
  );
  const totalPower = data.ideal.reduce((s, v) => s + v * v, 0) / Math.max(1, data.ideal.length);
  const pct = totalPower > 1e-9 ? Math.min(100, (capturedPower / totalPower) * 100) : 0;
  const pctText = `${pct.toFixed(0)}%`;

  return (
    <div className="module-layout">
      <aside className="fourier__controls">
        <Panel title={t('fourier.panel.synthesis')}>
          <Select
            label={t('fourier.syn.waveform')}
            value={waveKind}
            options={SERIES_WAVE_OPTIONS}
            onChange={setWaveKind}
          />

          {/* Waveform formula */}
          <div className="series__wave-info__formula">
            <Formula tex={info.formula} />
          </div>

          <Slider label={<>Fundamental frequency <Formula tex="(f_0)" /></>} value={f0} min={0.5} max={5} step={0.1} unit="Hz" onChange={setF0} />
          <Slider label={<>Harmonic count <Formula tex="(N)" /></>} value={N} min={1} max={100} step={1} onChange={setN} />
          {waveKind === 'pulse' && (
            <Slider label={t('fourier.syn.duty')} value={duty} min={0.1} max={0.9} step={0.05} onChange={setDuty} />
          )}
          <div className="transport">
            <button type="button" className="btn--reset" onClick={handleReset}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21.5 2v6h-6" />
                <path d="M2.5 22v-6h6" />
                <path d="M22 11.5A10 10 0 0 0 3.2 7.2" />
                <path d="M2 12.5a10 10 0 0 0 18.8 4.2" />
              </svg>
              {t('fourier.series.reset')}
            </button>
          </div>
        </Panel>
      </aside>

      <div className="fourier__content">
        {/* Metric readouts row */}
        <div className="fourier__readouts">
          <div className="fourier__metric">
            <span className="fourier__metric__label">{t('fourier.readout.dc')}</span>
            <span className="fourier__metric__value">{data.dcMag.toFixed(3)}</span>
          </div>
          <div className="fourier__metric">
            <span className="fourier__metric__label">1st harmonic (<Formula tex="c_1" />)</span>
            <span className="fourier__metric__value">{data.c1Mag.toFixed(3)}</span>
          </div>
          <div className="fourier__metric">
            <span className="fourier__metric__label">{t('fourier.readout.powerN')}</span>
            <span className="fourier__metric__value">{pctText}</span>
          </div>
          <div className="fourier__metric">
            <span className="fourier__metric__label">{t('fourier.readout.harmonics')}</span>
            <span className="fourier__metric__value fourier__metric__value--text">{info.harmonics}</span>
          </div>
          <div className="fourier__metric">
            <span className="fourier__metric__label">{t('fourier.readout.convergence')}</span>
            <span className="fourier__metric__value fourier__metric__value--text">{info.convergence}</span>
          </div>
        </div>

        <Panel title={t('fourier.panel.synthesisPlot')}>
          <SeriesSynthPlots data={data} />

        </Panel>
        {/* Fourier Series reference cards — Proakis §2.2 */}
        <div className="sig-cards">

          {/* Card 1: Complex Exponential Form */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--green">
              Complex Exponential Form
            </h3>
            <div className="sig-card__body">
              <p>Any periodic signal with period <Formula tex="T_0=1/f_0" /> can be written as a sum of complex exponentials (§2.2):</p>
              <div className="sig-card__formula">
                <Formula tex="x(t)=\sum_{n=-\infty}^{\infty}c_n\,e^{\,j2\pi n f_0 t}" block />
              </div>
              <ul style={{ marginTop: 'var(--space-1)' }}>
                <li><Formula tex="f_0=1/T_0" /> — fundamental frequency</li>
                <li><Formula tex="n f_0" /> — the <Formula tex="n" />-th harmonic</li>
                <li><Formula tex="c_n" /> — complex amplitude of each harmonic</li>
              </ul>
            </div>
          </div>

          {/* Card 2: Analysis Formula */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--orange">
              Fourier Coefficients
            </h3>
            <div className="sig-card__body">
              <p>The complex coefficient <Formula tex="c_n" /> is found by projecting <Formula tex="x(t)" /> onto the <Formula tex="n" />-th harmonic:</p>
              <div className="sig-card__formula">
                <Formula tex="c_n=\frac{1}{T_0}\int_{T_0}x(t)\,e^{-j2\pi n f_0 t}\,dt" block />
              </div>
              <ul style={{ marginTop: 'var(--space-1)' }}>
                <li><Formula tex="c_0" /> — DC value (mean of <Formula tex="x(t)" />)</li>
                <li><Formula tex="|c_n|" /> — amplitude of the <Formula tex="n" />-th harmonic</li>
                <li><Formula tex="\angle c_n" /> — phase of the <Formula tex="n" />-th harmonic</li>
              </ul>
            </div>
          </div>

          {/* Card 3: Trigonometric Form */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--blue">
              Trigonometric Form
            </h3>
            <div className="sig-card__body">
              <p>For <em>real</em> signals, <Formula tex="c_{-n}=c_n^*" />, so we can write an equivalent real form:</p>
              <div className="sig-card__formula">
                <Formula tex="x(t)=a_0+\sum_{n=1}^{\infty}\bigl[a_n\cos(2\pi n f_0 t)+b_n\sin(2\pi n f_0 t)\bigr]" block />
              </div>
              <ul style={{ marginTop: 'var(--space-1)' }}>
                <li><Formula tex="a_0=c_0" /> (DC term)</li>
                <li><Formula tex="a_n=2\,\mathrm{Re}\{c_n\}" />, <Formula tex="b_n=-2\,\mathrm{Im}\{c_n\}" /></li>
                <li>Amplitude: <Formula tex="|c_n|=\tfrac{1}{2}\!\sqrt{a_n^2+b_n^2}" /></li>
              </ul>
            </div>
          </div>

          {/* Card 4: Parseval's Theorem */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--green">
              Parseval's Theorem
            </h3>
            <div className="sig-card__body">
              <p>Total average power equals the sum of powers in all harmonics (§2.2.3):</p>
              <div className="sig-card__formula">
                <Formula tex="\frac{1}{T_0}\int_{T_0}|x(t)|^2\,dt=\sum_{n=-\infty}^{\infty}|c_n|^2" block />
              </div>
              <p style={{ marginTop: 'var(--space-1)' }}>
                Each <Formula tex="|c_n|^2" /> is the power contribution of harmonic <Formula tex="n" />.
                The <strong>Power (N harmonics)</strong> metric above shows what fraction of total power the first <Formula tex="N" /> harmonics capture.
              </p>
            </div>
          </div>

          {/* Card 5: Gibbs Phenomenon */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--orange">
              Gibbs Phenomenon
            </h3>
            <div className="sig-card__body">
              <p>
                At a jump discontinuity, the partial sum always overshoots by about <strong>8.9 %</strong> of the jump height — regardless of how many harmonics <Formula tex="N" /> are used.
              </p>
              <ul style={{ marginTop: 'var(--space-1)' }}>
                <li>The overshoot does <em>not</em> vanish as <Formula tex="N\to\infty" /></li>
                <li>The <em>width</em> of the ringing shrinks to zero (energy converges)</li>
                <li>Worst for the <strong>square wave</strong> — try the preset above</li>
              </ul>
              <p style={{ marginTop: 'var(--space-1)' }}>
                Solution in practice: apply a <em>window</em> (e.g. Hann, Hamming) to taper the coefficients.
              </p>
            </div>
          </div>

          {/* Card 6: Symmetry Properties */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--blue">
              Symmetry Properties
            </h3>
            <div className="sig-card__body">
              <ul>
                <li>
                  <span className="sig-card__label">Even signal</span>{' '}
                  (<Formula tex="x(-t)=x(t)" />): all <Formula tex="c_n" /> real, <Formula tex="b_n=0" />
                </li>
                <li>
                  <span className="sig-card__label">Odd signal</span>{' '}
                  (<Formula tex="x(-t)=-x(t)" />): all <Formula tex="c_n" /> imaginary, <Formula tex="a_n=0" />
                </li>
                <li>
                  <span className="sig-card__label">Half-wave symmetry</span>{' '}
                  (<Formula tex="x(t+T_0/2)=-x(t)" />): only odd harmonics survive
                </li>
                <li>
                  <span className="sig-card__label">Real signal</span>: <Formula tex="c_{-n}=c_n^*" />, spectrum has conjugate symmetry
                </li>
              </ul>
              <p style={{ marginTop: 'var(--space-1)' }}>
                Square &amp; sawtooth waves have half-wave symmetry → only odd-<Formula tex="n" /> coefficients are non-zero.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
