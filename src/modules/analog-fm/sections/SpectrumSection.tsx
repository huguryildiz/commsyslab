import { useState } from 'react';
import { Panel, Slider, Segmented, HintText, Formula } from '@/components';
import { t } from '@/i18n';
import { buildFmSpectrumView, type FmSpectrumParams } from '../model';
import { FmSpectrumPanel, BesselCurvesPanel } from '../panels';
import { ResetButton } from './ResetButton';

type MessageType = 'tone' | 'arbitrary';

const DEFAULTS = {
  carrierFreq: 100000, // 100 kHz — leaves room for a wide Carson band
  msgFreq: 5000,
  beta: 5,
  bandwidth: 5000,
  deltaF: 25000,
};

/**
 * Spectrum tab — Proakis & Salehi §4.2.
 * Sinusoidal message → Bessel line spectrum + Carson's rule (§4.2.1);
 * arbitrary message → magnitude spectrum + generalized Carson rule (§4.2.2).
 */
export function SpectrumSection() {
  const [messageType, setMessageType] = useState<MessageType>('tone');
  const [carrierFreq, setCarrierFreq] = useState(DEFAULTS.carrierFreq);
  const [msgFreq, setMsgFreq] = useState(DEFAULTS.msgFreq);
  const [beta, setBeta] = useState(DEFAULTS.beta);
  const [bandwidth, setBandwidth] = useState(DEFAULTS.bandwidth);
  const [deltaF, setDeltaF] = useState(DEFAULTS.deltaF);
  const [resetKey, setResetKey] = useState(0);

  const reset = () => {
    setCarrierFreq(DEFAULTS.carrierFreq);
    setMsgFreq(DEFAULTS.msgFreq);
    setBeta(DEFAULTS.beta);
    setBandwidth(DEFAULTS.bandwidth);
    setDeltaF(DEFAULTS.deltaF);
    setResetKey((k) => k + 1);
  };

  const params: FmSpectrumParams = {
    messageType,
    carrierFreq,
    carrierAmp: 1,
    messageFreq: msgFreq,
    beta,
    bandwidth,
    deltaF,
  };
  const view = buildFmSpectrumView(params);
  const isTone = messageType === 'tone';

  return (
    <div className="analog__section">
      <div className="analog__subtabbar">
        <Segmented<MessageType>
          ariaLabel={t('analog.fm.sub.msgAriaLabel')}
          value={messageType}
          options={[
            { value: 'tone', label: t('analog.fm.sub.tone') },
            { value: 'arbitrary', label: t('analog.fm.sub.arbitrary') },
          ]}
          onChange={setMessageType}
        />
      </div>

      <div className="module-layout">
        <aside className="analog__controls">
          <Panel title={t('analog.fm.parameters')}>
            <Slider
              label={<HintText text={t('analog.fm.carrierFreqKHz')} />}
              value={carrierFreq / 1000}
              min={50}
              max={200}
              step={5}
              unit="kHz"
              onChange={(v) => setCarrierFreq(v * 1000)}
            />
            {isTone ? (
              <>
                <Slider
                  label={<HintText text={t('analog.fm.msgFreq')} />}
                  value={msgFreq}
                  min={500}
                  max={10000}
                  step={500}
                  unit="Hz"
                  onChange={setMsgFreq}
                />
                <Slider
                  label={<HintText text={t('analog.fm.betaFm')} />}
                  value={beta}
                  min={0.1}
                  max={20}
                  step={0.1}
                  onChange={setBeta}
                />
              </>
            ) : (
              <>
                <Slider
                  label={<HintText text={t('analog.fm.msgBandwidth')} />}
                  value={bandwidth}
                  min={1000}
                  max={10000}
                  step={500}
                  unit="Hz"
                  onChange={setBandwidth}
                />
                <Slider
                  label={<HintText text={t('analog.fm.deltaFkHz')} />}
                  value={deltaF / 1000}
                  min={1}
                  max={75}
                  step={1}
                  unit="kHz"
                  onChange={(v) => setDeltaF(v * 1000)}
                />
              </>
            )}
            <ResetButton onClick={reset} />
          </Panel>
        </aside>

        <div className="analog__content">
          <div className="analog__readouts">
            <div className="analog__metric">
              <span className="analog__metric__label"><HintText text={t('analog.fm.readout.beta')} /></span>
              <span className="analog__metric__value">{view.beta.toFixed(2)}</span>
            </div>
            <div className="analog__metric">
              <span className="analog__metric__label"><HintText text={t('analog.fm.spectrum.carson')} /></span>
              <span className="analog__metric__value">{(view.carsonBw / 1000).toFixed(1)}<small>kHz</small></span>
            </div>
            {isTone && (
              <div className="analog__metric">
                <span className="analog__metric__label">{t('analog.fm.spectrum.nSidebands')}</span>
                <span className="analog__metric__value">{view.nSignificant}</span>
              </div>
            )}
            <div className="analog__metric analog__metric--text">
              <span className="analog__metric__label">{t('analog.fm.readout.regime')}</span>
              <span className={`analog__metric__value ${view.beta < 0.3 ? 'analog__metric__value--warn' : 'analog__metric__value--ok'}`}>
                {t(view.beta < 0.3 ? 'analog.fm.regime.nbfm' : 'analog.fm.regime.wbfm')}
              </span>
            </div>
          </div>

          <Panel title={t('analog.fm.tab.spectrum')}>
            <FmSpectrumPanel key={resetKey} view={view} />
          </Panel>

          <Panel title={t('analog.fm.spectrum.besselPanel')}>
            <BesselCurvesPanel beta={beta} />
          </Panel>

          <div className="analog__cards">
            {isTone ? (
              <>
                <div className="analog__card">
                  <h3 className="analog__card__title analog__card__title--green">Bessel sidebands</h3>
                  <div className="analog__card__body">
                    <p>
                      Tone FM is a sum of carriers spaced by <Formula tex="f_m" />, weighted by Bessel
                      functions of the first kind (§4.2.1):
                    </p>
                    <div className="analog__card__formula">
                      <Formula tex="u(t) = A_c\sum_{n=-\infty}^{\infty} J_n(\beta)\cos\!\bigl(2\pi(f_c + n f_m)t\bigr)" block />
                    </div>
                    <p>
                      For a small index <Formula tex="\beta" /> only the carrier and the first
                      sideband pair survive — this is why NBFM looks like AM (Eq. 4.2.6):
                    </p>
                    <div className="analog__card__formula">
                      <Formula tex="J_0(\beta)\approx 1,\quad J_1(\beta)\approx \tfrac{\beta}{2},\quad J_n(\beta)\approx 0\ (n>1)" block />
                    </div>
                    <ul>
                      <li>Theoretically infinite sidebands; most power sits near the carrier</li>
                      <li><Formula tex="J_{-n}(\beta) = (-1)^n J_n(\beta)" /></li>
                    </ul>
                  </div>
                </div>

                <div className="analog__card">
                  <h3 className="analog__card__title analog__card__title--green">Constant-envelope power</h3>
                  <div className="analog__card__body">
                    <p>
                      Angle modulation only changes the phase, so the total power is independent
                      of <Formula tex="\beta" /> — the Bessel coefficients always satisfy Parseval:
                    </p>
                    <div className="analog__card__formula">
                      <Formula tex="\sum_{n=-\infty}^{\infty} J_n^2(\beta) = 1 \;\Longrightarrow\; P = \tfrac{A_c^2}{2}" block />
                    </div>
                    <ul>
                      <li>Increasing <Formula tex="\beta" /> redistributes power into more sidebands, never adds power</li>
                      <li>Constant envelope → FM tolerates nonlinear (saturated) amplifiers</li>
                    </ul>
                  </div>
                </div>

                <div className="analog__card">
                  <h3 className="analog__card__title analog__card__title--orange">Carson&apos;s rule</h3>
                  <div className="analog__card__body">
                    <p>The band that holds ~98% of the power (§4.2):</p>
                    <div className="analog__card__formula">
                      <Formula tex="B_c = 2(\beta + 1)f_m \;=\; 2(\Delta f + f_m)" block />
                    </div>
                    <ul>
                      <li>Modulation index: <Formula tex="\beta = \Delta f / f_m" /></li>
                      <li>Marked by the dashed band on the plot</li>
                    </ul>
                  </div>
                </div>

                <div className="analog__card">
                  <h3 className="analog__card__title analog__card__title--blue">Narrowband vs wideband</h3>
                  <div className="analog__card__body">
                    <p>The index <Formula tex="\beta" /> decides the spectral character:</p>
                    <ul>
                      <li><span className="analog__card__label">NBFM</span> (<Formula tex="\beta < 0.3" />): one significant sideband pair, <Formula tex="B \approx 2f_m" /></li>
                      <li><span className="analog__card__label">WBFM</span> (<Formula tex="\beta \gtrsim 1" />): many sidebands, bandwidth grows with <Formula tex="\Delta f" /></li>
                    </ul>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="analog__card">
                  <h3 className="analog__card__title analog__card__title--green">Nonlinear spectrum</h3>
                  <div className="analog__card__body">
                    <p>
                      For a general message <Formula tex="m(t)" /> the FM spectrum cannot be expressed
                      in closed form — the modulation is nonlinear (§4.2.2). The magnitude spectrum
                      <Formula tex="|U(f)|" /> is computed numerically via FFT of:
                    </p>
                    <div className="analog__card__formula">
                      <Formula tex="u(t) = A_c \cos\!\Bigl(2\pi f_c t + 2\pi k_f \int_0^t m(\tau)\,d\tau\Bigr)" block />
                    </div>
                  </div>
                </div>

                <div className="analog__card">
                  <h3 className="analog__card__title analog__card__title--orange">Carson&apos;s rule (Eq. 4.2.19)</h3>
                  <div className="analog__card__body">
                    <p>An approximate bandwidth holding ~98% of the power:</p>
                    <div className="analog__card__formula">
                      <Formula tex="B_c = 2(\beta + 1)W" block />
                    </div>
                    <p>where <Formula tex="W" /> is the message bandwidth and the modulation index is (Eq. 4.2.20):</p>
                    <div className="analog__card__formula">
                      <Formula tex="\beta = \frac{k_f \max[|m(t)|]}{W} = \frac{\Delta f}{W}" block />
                    </div>
                    <ul>
                      <li>Marked by the dashed band on the plot</li>
                    </ul>
                  </div>
                </div>

                <div className="analog__card">
                  <h3 className="analog__card__title analog__card__title--blue">Narrowband vs wideband</h3>
                  <div className="analog__card__body">
                    <p>The ratio <Formula tex="\beta = \Delta f / W" /> determines the regime:</p>
                    <ul>
                      <li><span className="analog__card__label">NBFM</span> (<Formula tex="\beta \ll 1" />): spectrum ≈ AM, bandwidth <Formula tex="\approx 2W" /></li>
                      <li><span className="analog__card__label">WBFM</span> (<Formula tex="\beta \gg 1" />): bandwidth dominated by <Formula tex="\Delta f" />, much wider than AM</li>
                      <li>WBFM trades bandwidth for improved noise performance (§4.4)</li>
                    </ul>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
