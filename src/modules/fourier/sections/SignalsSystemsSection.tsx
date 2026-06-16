import { useState, useEffect, useRef } from 'react';
import { Panel, Slider, Toggle, Formula } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { useZoom } from '@/lib/plot/useZoom';
import { linScale, drawAxes, drawLine, type Axes } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { t } from '@/i18n';
import { playSignalSamples, audioSupported } from '@/lib/audio/signal-audio';
import { buildSignalExplorer, type BasicKind } from '../model';

const PERIODIC_KINDS = new Set<BasicKind>([
  'sine', 'cosine', 'square', 'sawtooth', 'tri_wave',
  'half_rect', 'full_rect', 'dirac_comb', 'damped_sine', 'chirp',
]);
const TAU_KINDS = new Set<BasicKind>(['exp', 'exp2', 'gaussian', 'damped_sine']);
// Signals where the F (time-scale) slider has no meaningful independent effect:
// exp/exp2/gaussian already have tau for shape; step/sgn are invariant under F>0;
// impulse: unitImpulse(F·t) shrinks the approximation spike below visibility at high F.
const NO_SCALE_KINDS = new Set<BasicKind>(['exp', 'exp2', 'gaussian', 'step', 'sgn', 'impulse']);
import type { SectionProps } from './types';

const PAD = { l: 50, r: 20, t: 20, b: 40 };

/** Inline label: plain text with KaTeX symbol in parentheses. */
function L({ text, tex }: { text: string; tex: string }) {
  return <><span>{text} (</span><Formula tex={tex} /><span>)</span></>;
}

const DEFAULTS = {
  kind: 'rect' as BasicKind,
  amp: 1,
  t0: 0,
  F: 1,
  tau: 0.5,
  reverse: false,
  tMin: -10,
  tMax: 10,
  N: 4096,
};

export function SignalsSystemsSection(_props: SectionProps) {
  const [kind, setKind] = useState<BasicKind>(DEFAULTS.kind);
  const [amp, setAmp] = useState(DEFAULTS.amp);
  const [t0, setT0] = useState(DEFAULTS.t0);
  const [F, setF] = useState(DEFAULTS.F);
  const [tau, setTau] = useState(DEFAULTS.tau);
  const [reverse, setReverse] = useState(DEFAULTS.reverse);
  const [tMin, tMax, handleZoom, resetZoom, handlePan] = useZoom(DEFAULTS.tMin, DEFAULTS.tMax, {
    minSpan: 0.5, maxSpan: 40, clampMin: -20, clampMax: 20,
  });
  const [playing, setPlaying] = useState(false);

  // High sample density so signals stay smooth at any zoom level (500 samples/unit, cap 8192)
  const N = Math.min(8192, Math.max(1024, Math.round(500 * (tMax - tMin))));
  const audioHandle = useRef<{ stop: () => void } | null>(null);

  const sig = buildSignalExplorer(kind, { amp, t0, F, tau, reverse, tMin, tMax, N });

  function handleReset() {
    setKind(DEFAULTS.kind);
    setAmp(DEFAULTS.amp);
    setT0(DEFAULTS.t0);
    setF(DEFAULTS.F);
    setTau(DEFAULTS.tau);
    setReverse(DEFAULTS.reverse);
    resetZoom();
  }

  function handlePlay() {
    if (playing) {
      audioHandle.current?.stop();
      audioHandle.current = null;
      setPlaying(false);
      return;
    }
    // audioWavetable is fixed over t∈[-1,1] (axis-independent) for stable pitch
    const handle = playSignalSamples(sig.audioWavetable, 220, 1.5);
    if (!handle) return;
    audioHandle.current = handle;
    setPlaying(true);
    setTimeout(() => {
      audioHandle.current = null;
      setPlaying(false);
    }, 1550);
  }

  // Stop audio on unmount
  useEffect(() => () => { audioHandle.current?.stop(); }, []);

  // Y-range: derive from actual signal values so ramp/chirp/etc. always fit
  const yMaxData = sig.transformed.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  const yPad = Math.max(yMaxData * 1.1, 1.5);

  return (
    <div className="module-layout">
      <aside className="fourier__controls">
        <Panel title={t('fourier.panel.signal')}>
          <label className="ctl-select">
            <span>{t('fourier.sig.kind')}</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as BasicKind)}>
              <optgroup label="Periodic">
                <option value="sine">Sine</option>
                <option value="cosine">Cosine</option>
                <option value="square">Square wave</option>
                <option value="sawtooth">Sawtooth</option>
                <option value="tri_wave">Triangle wave</option>
                <option value="half_rect">Half-wave rectified</option>
                <option value="full_rect">Full-wave rectified</option>
                <option value="dirac_comb">Dirac comb</option>
              </optgroup>
              <optgroup label="Aperiodic">
                <option value="impulse">Unit impulse δ(t)</option>
                <option value="step">Unit step u(t)</option>
                <option value="ramp">Ramp r(t)</option>
                <option value="sgn">Signum sgn(t)</option>
                <option value="rect">Rectangular pulse Π(t)</option>
                <option value="tri">Triangular pulse Λ(t)</option>
                <option value="exp">Decaying exponential</option>
                <option value="exp2">Two-sided exponential</option>
                <option value="damped_sine">Damped sine</option>
                <option value="gaussian">Gaussian pulse</option>
                <option value="sinc">Sinc</option>
                <option value="chirp">Linear chirp</option>
              </optgroup>
            </select>
          </label>
          <Slider label={<L text="Amplitude" tex="A" />} value={amp} min={-2} max={2} step={0.1} onChange={setAmp} />
          <Slider label={<L text="Time shift" tex="t_0" />} unit="(s)" value={t0} min={-5} max={5} step={0.05} onChange={setT0} />
          {!NO_SCALE_KINDS.has(kind) && (
            PERIODIC_KINDS.has(kind)
              ? <Slider label={<L text="Frequency" tex="f" />} unit="(Hz)" value={F} min={0.1} max={5} step={0.1} onChange={setF} />
              : <Slider label={<L text="Time scale" tex="\alpha" />} value={F} min={0.1} max={5} step={0.1} onChange={setF} />
          )}
          {TAU_KINDS.has(kind) && (
            kind === 'gaussian'
              ? <Slider label={<L text="Width" tex="\sigma" />} unit="(s)" value={tau} min={0.05} max={5} step={0.05} onChange={setTau} />
              : <Slider label={<L text="Decay" tex="\tau" />} unit="(s)" value={tau} min={0.05} max={5} step={0.05} onChange={setTau} />
          )}
          <Toggle label={t('fourier.sig.reverse')} checked={reverse} onChange={setReverse} />
          <div className="studio__audio studio__audio--row">
            {audioSupported() && (
              <button
                type="button"
                className={`studio__audio__listen${playing ? ' studio__audio__listen--playing' : ''}`}
                onClick={handlePlay}
              >
                {playing ? t('fourier.studio.stop') : t('fourier.studio.listen')}
              </button>
            )}
            <button type="button" className="studio__audio__reset btn--reset" onClick={handleReset}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21.5 2v6h-6" />
                <path d="M2.5 22v-6h6" />
                <path d="M22 11.5A10 10 0 0 0 3.2 7.2" />
                <path d="M2 12.5a10 10 0 0 0 18.8 4.2" />
              </svg>
              {t('fourier.sig.reset')}
            </button>
          </div>
        </Panel>

      </aside>

      <div className="fourier__content">
        <div className="fourier__readouts">
          <div className="fourier__metric">
            <span className="fourier__metric__label">{t('fourier.readout.type')}</span>
            <span className="fourier__metric__value">{sig.classification.type}</span>
          </div>
          <div className="fourier__metric">
            <span className="fourier__metric__label">{t('fourier.readout.sym')}</span>
            <span className="fourier__metric__value">
              {sig.classification.even ? 'even' : sig.classification.odd ? 'odd' : '—'}
            </span>
          </div>
        </div>

        <Panel title={t('fourier.panel.signalPlot')}>
          <Canvas
            height={200}
            ariaLabel="Signal: original vs transformed"
            deps={[sig, tMin, tMax, yPad]}
            onWheel={handleZoom}
            onPan={handlePan}
            draw={(ctx, w, h) => {
              ctx.clearRect(0, 0, w, h);
              const ax: Axes = {
                x: linScale([tMin, tMax], [PAD.l, w - PAD.r]),
                y: linScale([-yPad, yPad], [h - PAD.b, PAD.t]),
              };
              drawAxes(ctx, ax, [tMin, tMax], { xLabel: '$t\\,(s)$', yLabel: '$x(t)$' });
              drawLine(ctx, ax, sig.time, sig.transformed, CHART.orange, 2);
            }}
          />
        </Panel>

        {/* Signal reference cards — Proakis §2.1 */}
        <div className="sig-cards">

          {/* Card 1: Periodic & Aperiodic */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--green">
              Periodic &amp; Aperiodic Signals
            </h3>
            <div className="sig-card__body">
              <p>
                A signal <Formula tex="x(t)" /> is <strong>periodic</strong> if, for the
                smallest <Formula tex="T_0 > 0" />, at every <Formula tex="t" />
              </p>
              <div className="sig-card__formula">
                <Formula tex="x(t+T_0)=x(t),\quad \forall t\in\mathbb{R}" block />
              </div>
              <p style={{ marginTop: 'var(--space-1)' }}>
                <Formula tex="T_0" /> is the <em>fundamental period</em>,{' '}
                <Formula tex="f_0=1/T_0" /> the <em>fundamental frequency</em>, and{' '}
                <Formula tex="\Omega_0=2\pi f_0" /> the <em>angular fundamental frequency</em>.
                Otherwise the signal is <strong>aperiodic</strong>.
              </p>
              <ul>
                <li>
                  <span className="sig-card__label">example</span>{' '}
                  <Formula tex="\sin(\Omega_0 t)" /> → periodic,{' '}
                  <Formula tex="T_0=2\pi/\Omega_0" />
                </li>
                <li>
                  <span className="sig-card__label">example</span>{' '}
                  <Formula tex="e^{-\alpha t}u(t)" /> → aperiodic
                </li>
                <li>
                  Sum of two periodic signals is periodic only if{' '}
                  <Formula tex="T_1/T_2" /> is rational.
                </li>
              </ul>
            </div>
          </div>

          {/* Card 2: Dirac Delta */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--orange">
              Dirac Delta <Formula tex="\delta(t)" />
            </h3>
            <div className="sig-card__body">
              <p>
                The Dirac delta is a <em>generalized function</em> (distribution); it is not a
                function in the classical sense. It is defined by two fundamental properties:
              </p>
              <div className="sig-card__formula">
                <Formula tex="\delta(t)=0,\;t\neq 0;\qquad \int_{-\infty}^{\infty}\delta(t)\,dt=1" block />
              </div>
              <p style={{ marginTop: 'var(--space-1)' }}>
                <span className="sig-card__label">Sifting property:</span> for any
                continuous <Formula tex="f(t)" />
              </p>
              <div className="sig-card__formula">
                <Formula tex="\int_{-\infty}^{\infty}f(t)\,\delta(t-t_0)\,dt=f(t_0)" block />
              </div>
              <ul style={{ marginTop: 'var(--space-1)' }}>
                <li>Scaling: <Formula tex="\delta(at)=\tfrac{1}{|a|}\delta(t)" /></li>
                <li>Evenness: <Formula tex="\delta(-t)=\delta(t)" /></li>
                <li>Derivative: <Formula tex="u'(t)=\delta(t)" /> (distributional sense)</li>
                <li>Impulse response <Formula tex="h(t)" /> of an LTI system is the
                  response to a <Formula tex="\delta(t)" /> input.</li>
              </ul>
            </div>
          </div>

          {/* Card 3: Unit Step */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--blue">
              Unit Step <Formula tex="u(t)" />
            </h3>
            <div className="sig-card__body">
              <div className="sig-card__formula">
                <Formula tex="u(t)=\begin{cases}1, & t>0\\0, & t<0\end{cases}" block />
              </div>
              <ul style={{ marginTop: 'var(--space-1)' }}>
                <li>Derivative: <Formula tex="u'(t)=\delta(t)" /></li>
                <li>Integral: <Formula tex="\int_{-\infty}^{t}u(\tau)\,d\tau = t\,u(t)" /> (ramp)</li>
              </ul>
              <p style={{ marginTop: 'var(--space-1)' }}>
                The unit step is used to <em>switch on</em> a signal at <Formula tex="t=0" />.
                Any causal signal can be written as{' '}
                <Formula tex="x(t)\,u(t)" />.
              </p>
            </div>
          </div>

          {/* Card 4: Exponential & Sinusoidal */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--green">
              Exponential &amp; Sinusoidal Signals
            </h3>
            <div className="sig-card__body">
              <p>
                Two fundamental <em>eigenfunctions</em> of continuous-time LTI systems:
              </p>
              <div className="sig-card__formula">
                <Formula tex="x(t)=e^{st},\quad s=\sigma+j\Omega\in\mathbb{C}" block />
              </div>
              <ul style={{ marginTop: 'var(--space-1)' }}>
                <li>
                  <Formula tex="\sigma<0" />: decaying exponential —{' '}
                  <em>energy signal</em>
                </li>
                <li>
                  <Formula tex="\sigma=0" />: pure sinusoid{' '}
                  <Formula tex="e^{j\Omega_0 t}" /> — <em>power signal</em>
                </li>
                <li>
                  Real sinusoid:{' '}
                  <Formula tex="A\cos(\Omega_0 t+\phi)=A\operatorname{Re}\!\{e^{j(\Omega_0 t+\phi)}\}" />
                </li>
                <li>
                  Euler:{' '}
                  <Formula tex="e^{j\theta}=\cos\theta+j\sin\theta" />
                </li>
              </ul>
            </div>
          </div>

          {/* Card 5: Energy & Power Signals */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--orange">
              Energy &amp; Power Signals
            </h3>
            <div className="sig-card__body">
              <div className="sig-card__formula">
                <Formula tex="E_\infty=\int_{-\infty}^{\infty}|x(t)|^2\,dt" block />
              </div>
              <div className="sig-card__formula" style={{ marginTop: 6 }}>
                <Formula tex="P_\infty=\lim_{T\to\infty}\frac{1}{T}\int_{-T/2}^{T/2}|x(t)|^2\,dt" block />
              </div>
              <ul style={{ marginTop: 'var(--space-1)' }}>
                <li>
                  <span className="sig-card__label">Energy signal:</span>{' '}
                  <Formula tex="0<E_\infty<\infty,\;P_\infty=0" />
                </li>
                <li>
                  <span className="sig-card__label">Power signal:</span>{' '}
                  <Formula tex="0<P_\infty<\infty,\;E_\infty=\infty" />
                </li>
                <li>Periodic signals are power signals.</li>
                <li>Finite-duration signals are energy signals.</li>
              </ul>
            </div>
          </div>

          {/* Card 6: Even & Odd Decomposition */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--blue">
              Even &amp; Odd Decomposition
            </h3>
            <div className="sig-card__body">
              <p>Any signal can be uniquely split into even and odd parts:</p>
              <div className="sig-card__formula">
                <Formula tex="x_e(t)=\tfrac{1}{2}[x(t)+x(-t)]" block />
              </div>
              <div className="sig-card__formula" style={{ marginTop: 6 }}>
                <Formula tex="x_o(t)=\tfrac{1}{2}[x(t)-x(-t)]" block />
              </div>
              <ul style={{ marginTop: 'var(--space-1)' }}>
                <li>
                  <Formula tex="x(t)=x_e(t)+x_o(t)" />
                </li>
                <li>
                  Even: <Formula tex="x_e(-t)=x_e(t)" /> (symmetric about 0)
                </li>
                <li>
                  Odd: <Formula tex="x_o(-t)=-x_o(t)" /> (anti-symmetric, <Formula tex="x_o(0)=0" />)
                </li>
                <li>
                  <Formula tex="\operatorname{sgn}(t)" /> is odd;{' '}
                  <Formula tex="\cos(\Omega_0 t)" /> is even.
                </li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
