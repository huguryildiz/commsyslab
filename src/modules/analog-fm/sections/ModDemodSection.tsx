import { useMemo, useState } from 'react';
import { Panel, Slider, HintText, Formula, Segmented } from '@/components';
import { t } from '@/i18n';
import type { useSimulationLoop } from '@/lib/sim/useSimulationLoop';
import { buildFmDemodView, buildFmPllView, type FmDemodParams, type FmPllParams } from '../model';
import { FmDiscrimPanel, FmPllPanel } from '../panels';
import { FmModulatorDiagram, FmDiscriminatorDiagram, FmPllDiagram } from './FmModDemodDiagram';
import { ResetButton } from './ResetButton';
import '@/lib/plot/schematic.css';

interface SectionProps {
  clock: number;
  loop: ReturnType<typeof useSimulationLoop>;
}

const DEFAULTS: FmDemodParams = {
  carrierFreq: 10_000,
  beta: 3,
  msgFreq: 1_000,
  noiseEnabled: false,
  snrDb: 20,
};

const PLL_DEFAULTS = { loopBn: 3000, damping: 0.707 };

type DemodSubTab = 'discriminator' | 'pll';

/**
 * Modulators & Demodulators tab — §4.3 (Proakis & Salehi).
 * Shows FM modulator block diagrams (Direct FM / Armstrong) and an FM
 * discriminator simulation (§4.3.2, Eq. 4.3.12) with animated signal flow.
 */
export function ModDemodSection({ clock: _clock, loop: _loop }: SectionProps) {
  const [carrierFreq, setCarrierFreq] = useState(DEFAULTS.carrierFreq);
  const [beta, setBeta] = useState(DEFAULTS.beta);
  const [msgFreq, setMsgFreq] = useState(DEFAULTS.msgFreq);
  const [noiseEnabled, setNoiseEnabled] = useState(DEFAULTS.noiseEnabled);
  const [snrDb, setSnrDb] = useState(DEFAULTS.snrDb);
  const [loopBn, setLoopBn] = useState(PLL_DEFAULTS.loopBn);
  const [damping, setDamping] = useState(PLL_DEFAULTS.damping);
  const [subTab, setSubTab] = useState<DemodSubTab>('discriminator');
  const [resetKey, setResetKey] = useState(0);

  const reset = () => {
    setCarrierFreq(DEFAULTS.carrierFreq);
    setBeta(DEFAULTS.beta);
    setMsgFreq(DEFAULTS.msgFreq);
    setNoiseEnabled(DEFAULTS.noiseEnabled);
    setSnrDb(DEFAULTS.snrDb);
    setLoopBn(PLL_DEFAULTS.loopBn);
    setDamping(PLL_DEFAULTS.damping);
    setResetKey((k) => k + 1);
  };

  const params: FmDemodParams = { carrierFreq, beta, msgFreq, noiseEnabled, snrDb };
  // Discriminator DSP is moderately expensive; memoize on params.
  const view = useMemo(() => buildFmDemodView(params), [carrierFreq, beta, msgFreq, noiseEnabled, snrDb]); // eslint-disable-line react-hooks/exhaustive-deps

  const pllParams: FmPllParams = { carrierFreq, beta, msgFreq, noiseEnabled, snrDb, loopBn, damping };
  const pllView = useMemo(() => buildFmPllView(pllParams), [carrierFreq, beta, msgFreq, noiseEnabled, snrDb, loopBn, damping]); // eslint-disable-line react-hooks/exhaustive-deps

  const snrLabel = view.measuredSnr > 50 ? '>50' : isFinite(view.measuredSnr) ? view.measuredSnr.toFixed(1) : '—';

  return (
    <div className="analog__section">
      <div className="module-layout">
        {/* ── Left sidebar ── */}
        <aside className="analog__controls">
          <Panel title={t('analog.fm.parameters')}>
            <Slider
              label={<HintText text={t('analog.fm.carrierFreqKHz')} />}
              value={carrierFreq / 1000}
              min={5}
              max={20}
              step={0.5}
              unit="kHz"
              onChange={(v) => setCarrierFreq(v * 1000)}
            />
            <Slider
              label={<HintText text={t('analog.fm.betaFm')} />}
              value={beta}
              min={0.5}
              max={10}
              step={0.5}
              onChange={setBeta}
            />
            <Slider
              label={<HintText text={t('analog.fm.msgFreq')} />}
              value={msgFreq}
              min={200}
              max={5_000}
              step={100}
              unit="Hz"
              onChange={setMsgFreq}
            />

            {/* AWGN noise toggle */}
            <label className="analog__toggle">
              <input
                type="checkbox"
                checked={noiseEnabled}
                onChange={(e) => setNoiseEnabled(e.target.checked)}
              />
              <span>{t('analog.fm.moddemod.noise')}</span>
            </label>

            {noiseEnabled && (
              <Slider
                label={<HintText text={t('analog.fm.moddemod.snrDb')} />}
                value={snrDb}
                min={0}
                max={40}
                step={1}
                unit="dB"
                onChange={setSnrDb}
              />
            )}

            <ResetButton onClick={reset} />
          </Panel>

          {subTab === 'pll' && (
            <Panel title={t('analog.fm.pll.parameters')}>
              <Slider
                label={<HintText text={t('analog.fm.pll.loopBn')} />}
                value={loopBn}
                min={100}
                max={3000}
                step={50}
                unit="Hz"
                onChange={setLoopBn}
              />
              <Slider
                label={<HintText text={t('analog.fm.pll.damping')} />}
                value={damping}
                min={0.3}
                max={2.0}
                step={0.05}
                onChange={setDamping}
              />
            </Panel>
          )}
        </aside>

        {/* ── Right content ── */}
        <div className="analog__content">
          {/* Readout strip */}
          <div className="analog__readouts">
            <div className="analog__metric">
              <span className="analog__metric__label"><HintText text={t('analog.fm.readout.beta')} /></span>
              <span className="analog__metric__value">{beta.toFixed(1)}</span>
            </div>
            <div className="analog__metric">
              <span className="analog__metric__label"><HintText text={t('analog.fm.readout.deltaF')} /></span>
              <span className="analog__metric__value">{(view.deltaF / 1000).toFixed(2)}<small>kHz</small></span>
            </div>
            {noiseEnabled && subTab === 'discriminator' && (
              <div className="analog__metric">
                <span className="analog__metric__label"><HintText text={t('analog.fm.moddemod.readout.snr')} /></span>
                <span className={`analog__metric__value ${view.measuredSnr >= 10 ? 'analog__metric__value--ok' : 'analog__metric__value--warn'}`}>
                  {snrLabel}<small>dB</small>
                </span>
              </div>
            )}
          </div>

          {/* FM Modulator block diagrams — capped at 720 px so the SVG doesn't scale up on wide panels */}
          <Panel>
            <div className="analog__plot-title">
              <HintText text={t('analog.fm.moddemod.panel.modulator')} />
            </div>
            <div style={{ maxWidth: 720 }}>
              <FmModulatorDiagram />
            </div>
          </Panel>

          {/* Modulator theory cards (shared — apply to both demodulators) */}
          <div className="analog__cards">
            <div className="analog__card">
              <h3 className="analog__card__title analog__card__title--green">Direct FM (§4.3.1)</h3>
              <div className="analog__card__body">
                <p>
                  In a direct FM modulator a voltage-controlled oscillator (VCO) produces a
                  carrier whose instantaneous frequency is proportional to the message:
                </p>
                <div className="analog__card__formula">
                  <Formula tex="f_i(t) = f_c + k_f\,m(t)" block />
                </div>
                <p>
                  A varactor diode acts as a voltage-dependent capacitor
                  <Formula tex="C(t)=C_0+k_0 m(t)" /> in the LC tank. For small deviations the tank
                  frequency tracks the message almost linearly (Eq. 4.3.5):
                </p>
                <div className="analog__card__formula">
                  <Formula tex="f_i(t)=\frac{1}{2\pi\sqrt{L_0 C(t)}}\approx f_c\!\left[1-\frac{k_0}{2C_0}m(t)\right]" block />
                </div>
              </div>
            </div>

            <div className="analog__card">
              <h3 className="analog__card__title analog__card__title--orange">Armstrong indirect FM (§4.3.1)</h3>
              <div className="analog__card__body">
                <p>
                  Indirect FM starts by generating a narrowband FM signal (NBFM) at a low carrier,
                  then multiplies the instantaneous frequency deviation by <Formula tex="n" /> via a
                  frequency multiplier (Fig. 4.9):
                </p>
                <p>
                  An <Formula tex="\times n" /> frequency multiplier raises both the carrier and the
                  phase deviation by the factor <Formula tex="n" /> (Eqs. 4.3.6–4.3.7):
                </p>
                <div className="analog__card__formula">
                  <Formula tex="u(t)=A_c\cos\!\bigl(2\pi n f_1 t + n\,\phi(t)\bigr)\;\Rightarrow\;\Delta f_{\text{out}} = n\,\Delta f_{\text{NBFM}}" block />
                </div>
                <p>A mixer then translates the carrier down to the desired band (Eq. 4.3.8):</p>
                <div className="analog__card__formula">
                  <Formula tex="u(t)=A_c\cos\!\bigl(2\pi(n f_1 - f_{LO})t + n\,\phi(t)\bigr)" block />
                </div>
                <ul>
                  <li>Maintains a crystal-stable carrier (no free-running VCO)</li>
                  <li>NBFM constraint: <Formula tex="\beta_{\text{NBFM}} \ll 1" /></li>
                </ul>
              </div>
            </div>
          </div>

          {/* ── Demodulator sub-tab bar: Discriminator (§4.3.2) vs PLL (§4.3.3) ── */}
          <div className="analog__subtabbar">
            <Segmented<DemodSubTab>
              ariaLabel={t('analog.fm.moddemod.subtab.ariaLabel')}
              value={subTab}
              options={[
                { value: 'discriminator', label: t('analog.fm.moddemod.subtab.discriminator') },
                { value: 'pll', label: t('analog.fm.moddemod.subtab.pll') },
              ]}
              onChange={setSubTab}
            />
          </div>

          {/* ── Discriminator demodulator (§4.3.2) ── */}
          {subTab === 'discriminator' && (
            <>
              <Panel key={resetKey}>
                <FmDiscrimPanel view={view} />
              </Panel>

              {/* FM Discriminator block diagram — capped at 690 px */}
              <Panel>
                <div className="analog__plot-title">
                  <HintText text={t('analog.fm.moddemod.panel.discriminatorDiagram')} />
                </div>
                <div style={{ maxWidth: 690 }}>
                  <FmDiscriminatorDiagram />
                </div>
              </Panel>

              <div className="analog__cards">
                <div className="analog__card">
                  <h3 className="analog__card__title analog__card__title--blue">FM Discriminator (§4.3.2)</h3>
                  <div className="analog__card__body">
                    <p>
                      A frequency discriminator converts the instantaneous frequency <Formula tex="f_i(t)" /> back
                      to a voltage proportional to <Formula tex="m(t)" /> in three stages (Eq. 4.3.12):
                    </p>
                    <ol>
                      <li><strong>Differentiator</strong> — converts FM → AM: <Formula tex="|H(f)| = 2\pi f" /></li>
                      <li><strong>Envelope detector</strong> — extracts <Formula tex="A_c + k_f m(t)" /></li>
                      <li><strong>LPF + DC block</strong> — removes carrier ripple and DC bias</li>
                    </ol>
                    <div className="analog__card__formula">
                      <Formula tex="\hat{m}(t) \propto f_i(t) - f_c = k_f\,m(t)" block />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── PLL demodulator (§4.3.3) ── */}
          {subTab === 'pll' && (
            <>
              <Panel key={`pll-${resetKey}`}>
                <FmPllPanel view={pllView} />
              </Panel>

              {/* PLL FM Demodulator block diagram — capped at 720 px */}
              <Panel>
                <div className="analog__plot-title">
                  <HintText text={t('analog.fm.moddemod.panel.pllDiagram')} />
                </div>
                <div style={{ maxWidth: 720 }}>
                  <FmPllDiagram />
                </div>
              </Panel>

              <div className="analog__cards">
                <div className="analog__card">
                  <h3 className="analog__card__title analog__card__title--blue">PLL FM Demodulator (§4.3.3)</h3>
                  <div className="analog__card__body">
                    <p>
                      A Phase-Locked Loop (PLL) tracks the instantaneous phase of the FM carrier and
                      recovers <Formula tex="m(t)" /> from the VCO control voltage (Fig. 4.14).
                      The loop consists of three elements:
                    </p>
                    <ol>
                      <li><strong>Phase comparator</strong> — multiplies received signal by VCO output
                        <Formula tex="y_v(t)" />; produces error proportional to phase difference</li>
                      <li><strong>Loop filter <Formula tex="G(f)" /></strong> — 2nd-order PI: sets noise
                        bandwidth <Formula tex="B_n" /> and damping <Formula tex="\zeta" /></li>
                      <li><strong>VCO</strong> — integrates control voltage to track carrier phase</li>
                    </ol>
                    <p>
                      When the loop is locked the phase error <Formula tex="\phi_e=\phi-\phi_v" /> is
                      small, so <Formula tex="\sin\phi_e\approx\phi_e" /> and the loop is linear. The
                      phase error then obeys (Eq. 4.3.21):
                    </p>
                    <div className="analog__card__formula">
                      <Formula tex="\frac{d\phi_e}{dt} + 2\pi k_v\,v(t) = \frac{d\phi}{dt}" block />
                    </div>
                    <p>In the frequency domain the control voltage follows (Eqs. 4.3.24–4.3.25):</p>
                    <div className="analog__card__formula">
                      <Formula tex="V(f) = \frac{G(f)}{1 + \dfrac{k_v}{jf}G(f)}\,\Phi(f)" block />
                    </div>
                    <p>
                      Designing <Formula tex="|k_v G(f)/jf|\gg 1" /> over the message band makes the
                      output track the phase derivative, so at lock the VCO control voltage is
                      proportional to the message (Eq. 4.3.28):
                    </p>
                    <div className="analog__card__formula">
                      <Formula tex="v(t) = \frac{1}{2\pi k_v}\frac{d\phi(t)}{dt} = \frac{k_f}{k_v}\,m(t)" block />
                    </div>
                    <p>
                      The 2nd-order loop filter uses natural frequency <Formula tex="\omega_n = 2\pi B_n" />
                      {' '}and damping ratio <Formula tex="\zeta" />. The Butterworth (maximally-flat)
                      choice <Formula tex="\zeta = 1/\sqrt{2} \approx 0.707" /> minimises overshoot
                      while keeping a flat passband. Larger <Formula tex="B_n" /> means faster
                      lock-on but admits more noise.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
