/**
 * LTI Filter sub-tab (Filters → LTI). The clean theoretical view of Y = H·X:
 * pick a harmonic-rich input, pick an ideal filter, and see three separate
 * spectra — input |X(f)|, filter |H(f)|, output |Y(f)| = |H(f)||X(f)|.
 * Reuses the Filter Studio engine with the response fixed to the ideal brick-wall
 * (the realizable approximations live in the Butterworth sub-tab).
 * Proakis & Salehi §2.4 (p. 85).
 */

import { useState } from 'react';
import { Panel, Slider, Select, Formula, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { useZoom } from '@/lib/plot/useZoom';
import { linScale, drawAxes, drawLine, drawVLine, shadeRegion, type Axes } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { t } from '@/i18n';
import {
  buildFilterStudio, DEFAULT_STUDIO,
  type FilterStudioParams, type StudioSource, type StudioFilterType,
} from './filterStudio';

const PAD = { l: 56, r: 20, t: 18, b: 40 };

const DEFAULTS = {
  source: 'square' as StudioSource,
  f0: 50,
  filterType: 'lpf' as StudioFilterType,
  fc: DEFAULT_STUDIO.fc,
  fc2: DEFAULT_STUDIO.fc2,
  toneFreqs: DEFAULT_STUDIO.tones.map((t) => t.freq) as [number, number, number],
};

export function LtiFilterPanel() {
  const [source, setSource] = useState<StudioSource>(DEFAULTS.source);
  const [f0, setF0] = useState(DEFAULTS.f0);
  const [filterType, setFilterType] = useState<StudioFilterType>(DEFAULTS.filterType);
  const [fc, setFc] = useState(DEFAULTS.fc);
  const [fc2, setFc2] = useState(DEFAULTS.fc2);
  const [toneFreqs, setToneFreqs] = useState<[number, number, number]>(DEFAULTS.toneFreqs);

  const tones = toneFreqs.map((freq, i) => ({ freq, amp: [1, 0.7, 0.5][i] }));

  const params: FilterStudioParams = {
    ...DEFAULT_STUDIO, source, f0, filterType, response: 'ideal', fc, fc2, tones, tStart: 0,
  };
  const view = buildFilterStudio(params);
  const showFc2 = filterType === 'bpf' || filterType === 'bsf';
  const isWave = source !== 'multitone';

  // One shared frequency axis across all three spectra (zoom/pan together).
  const [fLo, fHi, onWheel, resetZoom, onPan] = useZoom(0, view.fMax, {
    minSpan: 20, maxSpan: view.fMax * 2, clampMin: 0,
  });

  const magMax = Math.max(...view.magX, 1e-6) * 1.15;

  function handleReset() {
    setSource(DEFAULTS.source);
    setF0(DEFAULTS.f0);
    setFilterType(DEFAULTS.filterType);
    setFc(DEFAULTS.fc);
    setFc2(DEFAULTS.fc2);
    setToneFreqs(DEFAULTS.toneFreqs);
    resetZoom();
  }

  /** Draw one spectrum trace on the shared frequency axis, with cutoff markers. */
  const drawSpectrum =
    (mag: number[], color: string, yMax: number, yLabel: string, shadePass = false) =>
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.clearRect(0, 0, w, h);
      const ax: Axes = {
        x: linScale([fLo, fHi], [PAD.l, w - PAD.r]),
        y: linScale([0, yMax], [h - PAD.b, PAD.t]),
      };
      if (shadePass) {
        for (let i = 1; i < view.freqs.length; i++) {
          if (view.magH[i] >= 0.5) {
            shadeRegion(ctx, ax, view.freqs[i - 1], view.freqs[i], 0, yMax, 'rgba(255,140,66,0.10)');
          }
        }
      }
      drawAxes(ctx, ax, [fLo, fHi], { xLabel: '$f\\,(\\mathrm{Hz})$', yLabel });
      drawLine(ctx, ax, view.freqs, mag, color, 2);
      drawVLine(ctx, ax, fc, 0, yMax, CHART.pink, false, 1.5);
      if (showFc2) drawVLine(ctx, ax, fc2, 0, yMax, CHART.pink, false, 1.5);
    };

  return (
    <div className="module-layout">
      <aside className="fourier__controls">
        <Panel title={t('fourier.panel.filter')}>
          <Select
            label={t('fourier.studio.source')} value={source} onChange={setSource}
            options={[
              { value: 'square', label: t('fourier.studio.source.square') },
              { value: 'sawtooth', label: t('fourier.studio.source.sawtooth') },
              { value: 'triangle', label: t('fourier.studio.source.triangle') },
              { value: 'pulse', label: t('fourier.studio.source.pulse') },
              { value: 'multitone', label: t('fourier.studio.source.multitone') },
            ]}
          />
          {isWave && (
            <Slider label={<HintText text={t('fourier.studio.f0')} />} value={f0} min={5} max={200} step={5} unit="Hz" onChange={setF0} />
          )}
          {source === 'multitone' && ([0, 1, 2] as const).map((i) => (
            <Slider
              key={i}
              label={`Tone ${i + 1}`}
              value={toneFreqs[i]}
              min={10}
              max={view.fMax - 10}
              step={5}
              unit="Hz"
              onChange={(v) => setToneFreqs((prev) => { const next = [...prev] as [number,number,number]; next[i] = v; return next; })}
            />
          ))}
          <Select
            label={t('fourier.studio.filterType')} value={filterType} onChange={setFilterType}
            options={[
              { value: 'lpf', label: t('fourier.filter.type.lpf') },
              { value: 'hpf', label: t('fourier.filter.type.hpf') },
              { value: 'bpf', label: t('fourier.filter.type.bpf') },
              { value: 'bsf', label: t('fourier.filter.type.bsf') },
            ]}
          />
          <Slider label={<HintText text={t('fourier.studio.fc')} />} value={fc} min={5} max={view.fMax - 5} step={5} unit="Hz" onChange={setFc} />
          {showFc2 && (
            <Slider label={<HintText text={t('fourier.studio.fc2')} />} value={fc2} min={fc + 5} max={view.fMax - 5} step={5} unit="Hz" onChange={setFc2} />
          )}
          <div className="transport">
            <button type="button" className="btn--reset" onClick={handleReset}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21.5 2v6h-6" />
                <path d="M2.5 22v-6h6" />
                <path d="M22 11.5A10 10 0 0 0 3.2 7.2" />
                <path d="M2 12.5a10 10 0 0 0 18.8 4.2" />
              </svg>
              {t('fourier.filter.reset')}
            </button>
          </div>
        </Panel>
      </aside>

      <div className="fourier__content">
        <Panel title={t('fourier.panel.filterPlot')}>
          <p className="fourier__plot-title"><HintText text={t('fourier.lti.inTitle')} /></p>
          <Canvas
            height={170}
            ariaLabel="Input spectrum"
            deps={[view, fLo, fHi]}
            onWheel={onWheel}
            onPan={onPan}
            draw={drawSpectrum(view.magX, CHART.green, magMax, '$|X(f)|$')}
          />

          <p className="fourier__plot-title"><HintText text={t('fourier.lti.filtTitle')} /></p>
          <Canvas
            height={170}
            ariaLabel="Filter magnitude response"
            deps={[view, fLo, fHi]}
            onWheel={onWheel}
            onPan={onPan}
            draw={drawSpectrum(view.magH, CHART.orange, 1.1, '$|H(f)|$', true)}
          />

          <p className="fourier__plot-title"><HintText text={t('fourier.lti.outTitle')} /></p>
          <Canvas
            height={170}
            ariaLabel="Output spectrum"
            deps={[view, fLo, fHi]}
            onWheel={onWheel}
            onPan={onPan}
            draw={drawSpectrum(view.magY, CHART.blue, magMax, '$|Y(f)|$', true)}
          />
          <p className="fourier__hint"><HintText text={t('fourier.lti.hint')} /></p>
        </Panel>

        {/* LTI filter reference cards — Proakis & Salehi §2.4 (p. 85) */}
        <div className="sig-cards">

          {/* Card 1: Transfer Function */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--green">
              Transfer Function
            </h3>
            <div className="sig-card__body">
              <p>
                In the frequency domain the output spectrum is simply the <em>product</em> of the input spectrum
                and the filter's frequency response:
              </p>
              <div className="sig-card__formula">
                <Formula tex="Y(f)=H(f)\cdot X(f)" block />
              </div>
              <ul style={{ marginTop: 'var(--space-1)' }}>
                <li><Formula tex="X(f)" /> — Fourier transform of the input signal</li>
                <li><Formula tex="H(f)" /> — transfer function (frequency response) of the filter</li>
                <li><Formula tex="Y(f)" /> — Fourier transform of the output signal</li>
              </ul>
              <p style={{ marginTop: 'var(--space-1)' }}>
                This is the frequency-domain equivalent of convolution: <Formula tex="y(t)=x(t)*h(t)" />.
              </p>
            </div>
          </div>

          {/* Card 2: Ideal Lowpass & Highpass */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--orange">
              Ideal LPF &amp; HPF
            </h3>
            <div className="sig-card__body">
              <p>
                An <strong>ideal lowpass filter</strong> passes all frequencies below the cutoff <Formula tex="f_c" /> and
                blocks everything above:
              </p>
              <div className="sig-card__formula">
                <Formula tex="H_{\text{LP}}(f)=\begin{cases}1,&|f|\le f_c\\0,&|f|>f_c\end{cases}" block />
              </div>
              <p style={{ marginTop: 'var(--space-1)' }}>
                Its <em>impulse response</em> is a sinc function — infinite and non-causal, hence physically
                unrealizable:
              </p>
              <div className="sig-card__formula">
                <Formula tex="h_{\text{LP}}(t)=2f_c\,\mathrm{sinc}(2f_c t)" block />
              </div>
              <p style={{ marginTop: 'var(--space-1)' }}>
                An <strong>ideal highpass filter</strong> is the complement: <Formula tex="H_{\text{HP}}(f)=1-H_{\text{LP}}(f)" />.
              </p>
            </div>
          </div>

          {/* Card 3: Ideal Bandpass & Band-Stop */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--blue">
              Ideal BPF &amp; BSF
            </h3>
            <div className="sig-card__body">
              <p>
                A <strong>bandpass filter</strong> passes only frequencies in the band
                <Formula tex="f_L\le|f|\le f_H" />:
              </p>
              <div className="sig-card__formula">
                <Formula tex="H_{\text{BP}}(f)=\begin{cases}1,&f_L\le|f|\le f_H\\0,&\text{otherwise}\end{cases}" block />
              </div>
              <p style={{ marginTop: 'var(--space-1)' }}>
                Its bandwidth is <Formula tex="B=f_H-f_L" />. A <strong>band-stop (notch) filter</strong> is the complement:
              </p>
              <div className="sig-card__formula">
                <Formula tex="H_{\text{BS}}(f)=1-H_{\text{BP}}(f)" block />
              </div>
              <p style={{ marginTop: 'var(--space-1)' }}>
                Band-stop filters are used to remove interference at a specific frequency band
                (e.g. 50/60 Hz power-line hum).
              </p>
            </div>
          </div>

          {/* Card 4: Passband, Stopband & Transition Band */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--green">
              Passband &amp; Stopband
            </h3>
            <div className="sig-card__body">
              <ul>
                <li>
                  <span className="sig-card__label">Passband:</span>{' '}
                  frequency range where <Formula tex="|H(f)|\approx 1" />; input components pass through unchanged.
                </li>
                <li style={{ marginTop: 'var(--space-1)' }}>
                  <span className="sig-card__label">Stopband:</span>{' '}
                  frequency range where <Formula tex="|H(f)|\approx 0" />; input components are blocked.
                </li>
                <li style={{ marginTop: 'var(--space-1)' }}>
                  <span className="sig-card__label">Transition band:</span>{' '}
                  the region between passband and stopband (zero-width for ideal, finite for realizable filters).
                </li>
                <li style={{ marginTop: 'var(--space-1)' }}>
                  <span className="sig-card__label">Cutoff frequency</span> <Formula tex="f_c" />: the boundary at which
                  <Formula tex="|H(f_c)|=1/\sqrt{2}\approx 0.707" /> (−3 dB point) for realizable filters.
                </li>
              </ul>
            </div>
          </div>

          {/* Card 5: Distortionless Transmission */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--orange">
              Distortionless Transmission
            </h3>
            <div className="sig-card__body">
              <p>
                A system transmits a signal <em>without distortion</em> if the output is a scaled, delayed version of
                the input: <Formula tex="y(t)=c\,x(t-t_0)" />.
              </p>
              <p style={{ marginTop: 'var(--space-1)' }}>
                In the frequency domain this requires:
              </p>
              <div className="sig-card__formula">
                <Formula tex="H(f)=c\,e^{-j2\pi f t_0}" block />
              </div>
              <ul style={{ marginTop: 'var(--space-1)' }}>
                <li><strong>Flat magnitude:</strong> <Formula tex="|H(f)|=c" /> (constant for all <Formula tex="f" />)</li>
                <li><strong>Linear phase:</strong> <Formula tex="\angle H(f)=-2\pi f t_0" /></li>
              </ul>
              <p style={{ marginTop: 'var(--space-1)' }}>
                Any deviation from flat magnitude causes <em>amplitude distortion</em>; nonlinear phase
                causes <em>phase (delay) distortion</em>.
              </p>
            </div>
          </div>

          {/* Card 6: Ideal vs. Realizable */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--blue">
              Ideal vs. Realizable Filters
            </h3>
            <div className="sig-card__body">
              <p>
                Ideal (brick-wall) filters have a perfectly sharp cutoff but are <em>physically unrealizable</em>
                because their impulse responses are infinitely long and non-causal.
              </p>
              <ul style={{ marginTop: 'var(--space-1)' }}>
                <li>
                  <span className="sig-card__label">Paley–Wiener criterion:</span>{' '}
                  a causal filter must satisfy{' '}
                  <Formula tex="\int_{-\infty}^{\infty}\frac{|\ln|H(f)||}{1+f^2}\,df<\infty" />.
                  A brick-wall response violates this.
                </li>
                <li style={{ marginTop: 'var(--space-1)' }}>
                  <span className="sig-card__label">Butterworth / Chebyshev:</span>{' '}
                  realizable approximations with a finite-order rational transfer function.
                  The <em>Butterworth</em> sub-tab lets you explore these.
                </li>
              </ul>
              <p style={{ marginTop: 'var(--space-1)' }}>
                In practice, a steeper roll-off requires a higher filter order — and therefore more delay and complexity.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
