import { useState, useRef, useEffect } from 'react';
import { Panel, Slider, Select, Segmented, HintText, Formula } from '@/components';
import { t } from '@/i18n';
import { playSignalSamples, audioSupported } from '@/lib/audio/signal-audio';
import type { AngleMode } from '@/lib/dsp/analog';
import { buildFmReprView, type FmReprParams, type FmMessageWave } from '../model';
import { FmReprPanel } from '../panels';
import { FmPmDiagram } from './FmPmDiagram';

const DEFAULTS = {
  messageWave: 'sine' as FmMessageWave,
  msgFreq: 1000,
  tone2Freq: 2000,
  tone3Freq: 3000,
  carrierFreq: 5000,
  carrierAmp: 1,
  beta: 2,
};

/**
 * Representation tab — Proakis & Salehi §4.1.
 * FM vs PM waveform, instantaneous frequency/phase, modulation index and the
 * narrowband (NBFM) approximation. Static (non-animated) view.
 */
export function RepresentationSection() {
  const [mode, setMode] = useState<AngleMode>('fm');
  const [messageWave, setMessageWave] = useState<FmMessageWave>(DEFAULTS.messageWave);
  const [msgFreq, setMsgFreq] = useState(DEFAULTS.msgFreq);
  const [tone2Freq, setTone2Freq] = useState(DEFAULTS.tone2Freq);
  const [tone3Freq, setTone3Freq] = useState(DEFAULTS.tone3Freq);
  const [carrierFreq, setCarrierFreq] = useState(DEFAULTS.carrierFreq);
  const [carrierAmp, setCarrierAmp] = useState(DEFAULTS.carrierAmp);
  const [beta, setBeta] = useState(DEFAULTS.beta);
  const [resetKey, setResetKey] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioHandle = useRef<{ stop: () => void } | null>(null);

  // Stop any audio on unmount.
  useEffect(() => () => audioHandle.current?.stop(), []);

  const reset = () => {
    setMessageWave(DEFAULTS.messageWave);
    setMsgFreq(DEFAULTS.msgFreq);
    setTone2Freq(DEFAULTS.tone2Freq);
    setTone3Freq(DEFAULTS.tone3Freq);
    setCarrierFreq(DEFAULTS.carrierFreq);
    setCarrierAmp(DEFAULTS.carrierAmp);
    setBeta(DEFAULTS.beta);
    setResetKey((k) => k + 1);
  };

  const params: FmReprParams = { mode, messageWave, messageFreq: msgFreq, tone2Freq, tone3Freq, carrierFreq, carrierAmp, beta };
  const view = buildFmReprView(params);

  const handlePlay = () => {
    if (playing) {
      audioHandle.current?.stop();
      audioHandle.current = null;
      setPlaying(false);
      return;
    }
    const handle = playSignalSamples(view.modulated, 220, 1.5);
    if (!handle) return;
    audioHandle.current = handle;
    setPlaying(true);
    setTimeout(() => {
      audioHandle.current = null;
      setPlaying(false);
    }, 1550);
  };

  return (
    <div className="analog__section">
      <div className="analog__subtabbar">
        <Segmented<AngleMode>
          ariaLabel={t('analog.fm.sub.ariaLabel')}
          value={mode}
          options={[
            { value: 'fm', label: t('analog.fm.sub.fm') },
            { value: 'pm', label: t('analog.fm.sub.pm') },
          ]}
          onChange={setMode}
        />
      </div>

      <div className="module-layout">
        <aside className="analog__controls">
          <Panel title={t('analog.fm.parameters')}>
            <Select<FmMessageWave>
              label={t('analog.am.messageWave')}
              value={messageWave}
              onChange={setMessageWave}
              options={[
                { value: 'sine', label: t('analog.am.wave.sine') },
                { value: 'square', label: t('analog.am.wave.square') },
                { value: 'triangle', label: t('analog.am.wave.triangle') },
                { value: 'sawtooth', label: t('analog.am.wave.sawtooth') },
                { value: 'twoTone', label: t('analog.am.wave.twoTone') },
                { value: 'threeTone', label: t('analog.am.wave.threeTone') },
              ]}
            />
            <Slider
              label={
                <HintText
                  text={
                    messageWave === 'twoTone' || messageWave === 'threeTone'
                      ? t('analog.fm.tone1Freq')
                      : t('analog.fm.msgFreq')
                  }
                />
              }
              value={msgFreq}
              min={100}
              max={5000}
              step={100}
              unit="Hz"
              onChange={setMsgFreq}
            />
            {(messageWave === 'twoTone' || messageWave === 'threeTone') && (
              <Slider
                label={<HintText text={t('analog.fm.tone2Freq')} />}
                value={tone2Freq}
                min={100}
                max={5000}
                step={100}
                unit="Hz"
                onChange={setTone2Freq}
              />
            )}
            {messageWave === 'threeTone' && (
              <Slider
                label={<HintText text={t('analog.fm.tone3Freq')} />}
                value={tone3Freq}
                min={100}
                max={5000}
                step={100}
                unit="Hz"
                onChange={setTone3Freq}
              />
            )}
            <Slider
              label={<HintText text={t('analog.fm.carrierFreqKHz')} />}
              value={carrierFreq / 1000}
              min={5}
              max={50}
              step={1}
              unit="kHz"
              onChange={(v) => setCarrierFreq(v * 1000)}
            />
            <Slider
              label={<HintText text={t('analog.fm.carrierAmpV')} />}
              value={carrierAmp}
              min={0.1}
              max={3}
              step={0.1}
              unit="V"
              onChange={setCarrierAmp}
            />
            <Slider
              label={<HintText text={mode === 'fm' ? t('analog.fm.betaFm') : t('analog.fm.betaPm')} />}
              value={beta}
              min={0.1}
              max={15}
              step={0.1}
              onChange={setBeta}
            />
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
              <button type="button" className="studio__audio__reset" onClick={reset}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21.5 2v6h-6" />
                  <path d="M2.5 22v-6h6" />
                  <path d="M22 11.5A10 10 0 0 0 3.2 7.2" />
                  <path d="M2 12.5a10 10 0 0 0 18.8 4.2" />
                </svg>
                {t('analog.fm.reset')}
              </button>
            </div>
          </Panel>
        </aside>

        <div className="analog__content">
          <div className="analog__readouts">
            <div className="analog__metric">
              <span className="analog__metric__label"><HintText text={t('analog.fm.readout.beta')} /></span>
              <span className="analog__metric__value">{beta.toFixed(2)}</span>
            </div>
            <div className="analog__metric">
              <span className="analog__metric__label"><HintText text={t('analog.fm.readout.deltaF')} /></span>
              <span className="analog__metric__value">{(view.deltaF / 1000).toFixed(2)}<small>kHz</small></span>
            </div>
            <div className="analog__metric analog__metric--text">
              <span className="analog__metric__label">{t('analog.fm.readout.regime')}</span>
              <span className={`analog__metric__value ${view.isNbfm ? 'analog__metric__value--warn' : 'analog__metric__value--ok'}`}>
                {t(view.isNbfm ? 'analog.fm.regime.nbfm' : 'analog.fm.regime.wbfm')}
              </span>
            </div>
            <div className="analog__metric">
              <span className="analog__metric__label"><HintText text={t('analog.fm.readout.fiRange')} /></span>
              <span className="analog__metric__value">{(view.fiMin / 1000).toFixed(1)}–{(view.fiMax / 1000).toFixed(1)}<small>kHz</small></span>
            </div>
          </div>

          <Panel title={t('analog.fm.tab.repr')}>
            <FmReprPanel key={resetKey} view={view} />
          </Panel>

          <Panel title="FM ↔ PM modulator equivalence (Fig. 4.1)">
            <div style={{ maxWidth: 720 }}>
              <FmPmDiagram />
            </div>
            <p className="analog__hint" style={{ marginBottom: 0 }}>
              Integrating <Formula tex="m(t)" /> then phase-modulating is identical to frequency
              modulation; differentiating then frequency-modulating is identical to phase modulation
              (Eq. 4.1.6).
            </p>
          </Panel>

          <div className="analog__cards">
            <div className="analog__card">
              <h3 className="analog__card__title analog__card__title--green">FM vs PM</h3>
              <div className="analog__card__body">
                <p>
                  An angle-modulated signal carries the message in a time-varying phase
                  <Formula tex="\phi(t)" /> (Eq. 4.1.1):
                </p>
                <div className="analog__card__formula">
                  <Formula tex="u(t) = A_c\cos\!\bigl(2\pi f_c t + \phi(t)\bigr)" block />
                </div>
                <p>Its instantaneous frequency is the rate of change of that phase (Eq. 4.1.2):</p>
                <div className="analog__card__formula">
                  <Formula tex="f_i(t) = f_c + \frac{1}{2\pi}\frac{d\phi(t)}{dt}" block />
                </div>
                <ul>
                  <li>PM: <Formula tex="\phi(t) = k_p\,m(t)" /> (Eq. 4.1.3)</li>
                  <li>FM: <Formula tex="\phi(t) = 2\pi k_f\!\int_{-\infty}^{t} m(\tau)\,d\tau" /> (Eq. 4.1.5)</li>
                  <li>Envelope stays constant — all information is in the angle</li>
                </ul>
                <p>For FM the frequency deviation tracks the message directly — the orange plot (Eq. 4.1.4):</p>
                <div className="analog__card__formula">
                  <Formula tex="f_i(t) - f_c = k_f\,m(t)" block />
                </div>
                <p>FM and PM are duals — FM with <Formula tex="dm/dt" /> equals PM with <Formula tex="m(t)" /> (Eq. 4.1.6):</p>
                <div className="analog__card__formula">
                  <Formula tex="\frac{d\phi}{dt} = \begin{cases} k_p\,\dfrac{dm}{dt}, & \text{PM} \\[6pt] 2\pi k_f\,m(t), & \text{FM} \end{cases}" block />
                </div>
              </div>
            </div>

            <div className="analog__card">
              <h3 className="analog__card__title analog__card__title--orange">Deviation &amp; index</h3>
              <div className="analog__card__body">
                <p>The peak deviation measures how hard the message drives the angle (Eqs. 4.1.7–4.1.8):</p>
                <div className="analog__card__formula">
                  <Formula tex="\Delta f_{\max} = k_f\max|m(t)| \qquad \Delta\phi_{\max} = k_p\max|m(t)|" block />
                </div>
                <p>
                  For a single tone <Formula tex="m(t)=a\cos(2\pi f_m t)" /> the modulated signal
                  takes the canonical single-tone form (Eqs. 4.1.11–4.1.14):
                </p>
                <div className="analog__card__formula">
                  <Formula tex="u(t)=\begin{cases} A_c\cos\!\bigl(2\pi f_c t + \beta_p\cos(2\pi f_m t)\bigr), & \text{PM} \\[6pt] A_c\cos\!\bigl(2\pi f_c t + \beta_f\sin(2\pi f_m t)\bigr), & \text{FM} \end{cases}" block />
                </div>
                <p>where the PM and FM modulation indices are:</p>
                <div className="analog__card__formula">
                  <Formula tex="\beta_p = k_p\,a \qquad \beta_f = \frac{k_f\,a}{f_m} = \frac{\Delta f}{f_m}" block />
                </div>
                <ul>
                  <li><Formula tex="\Delta f" /> — peak frequency deviation</li>
                  <li>For a general message: <Formula tex="\beta_p = k_p\max|m(t)|" />, <Formula tex="\beta_f = k_f\max|m(t)|/W" /> (Eq. 4.2.20)</li>
                  <li>Larger <Formula tex="\beta" /> → wider spectrum (see the Spectrum tab)</li>
                </ul>
              </div>
            </div>

            <div className="analog__card">
              <h3 className="analog__card__title analog__card__title--blue">Narrowband FM</h3>
              <div className="analog__card__body">
                <p>
                  When <Formula tex="\beta \ll 1" /> the angle stays small, so FM collapses to a DSB-like
                  form (Eq. 4.1.19) — shown as the dashed overlay below <Formula tex="\beta = 0.3" />:
                </p>
                <div className="analog__card__formula">
                  <Formula tex="u(t) \approx A_c\cos(2\pi f_c t) - A_c\,\phi(t)\sin(2\pi f_c t)" block />
                </div>
                <ul>
                  <li>Bandwidth ≈ <Formula tex="2f_m" /> — like AM</li>
                  <li>Grows past <Formula tex="\beta \approx 0.3" /> → use the full Bessel spectrum</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
