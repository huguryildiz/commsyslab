import { useState, useRef, useEffect } from 'react';
import {
  Panel,
  Slider,
  Segmented,
  Select,
  Formula,
  HintText,
} from '@/components';
import { t } from '@/i18n';
import { playSignalSamples, audioSupported } from '@/lib/audio/signal-audio';
import type { AmMode } from '@/lib/dsp/analog';
import {
  buildAnalogAmView,
  buildAnalogPowerView,
  type AnalogAmParams,
  type MessageWave,
} from '../model';
import { AmModulatorPanel } from '../panels';
import type { SectionProps } from './types';

type Scheme = 'dsb' | 'conventional' | 'ssb' | 'vsb';
type SsbSide = 'usb' | 'lsb';

// Default parameter values (used on first render and by the Reset button).
const DEFAULTS = {
  ssbSide: 'usb' as SsbSide,
  messageWave: 'sine' as MessageWave,
  msgFreq: 1000,
  carrierFreq: 20000,
  carrierAmp: 1,
  modIndex: 0.5,
};

export function AmSchemesSection(_props: SectionProps) {
  const [scheme, setScheme] = useState<Scheme>('conventional');
  const [ssbSide, setSsbSide] = useState<SsbSide>(DEFAULTS.ssbSide);
  const [messageWave, setMessageWave] = useState<MessageWave>(DEFAULTS.messageWave);
  const [msgFreq, setMsgFreq] = useState(DEFAULTS.msgFreq);
  const [carrierFreq, setCarrierFreq] = useState(DEFAULTS.carrierFreq);
  const [carrierAmp, setCarrierAmp] = useState(DEFAULTS.carrierAmp);
  const [modIndex, setModIndex] = useState(DEFAULTS.modIndex);
  // Incrementing this key remounts AmModulatorPanel, which resets all useZoom hooks.
  const [resetKey, setResetKey] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioHandle = useRef<{ stop: () => void } | null>(null);

  // Stop audio on unmount
  useEffect(() => () => { audioHandle.current?.stop(); }, []);

  // Reset every parameter control to its default (keeps the active scheme sub-tab).
  const resetParams = () => {
    setSsbSide(DEFAULTS.ssbSide);
    setMessageWave(DEFAULTS.messageWave);
    setMsgFreq(DEFAULTS.msgFreq);
    setCarrierFreq(DEFAULTS.carrierFreq);
    setCarrierAmp(DEFAULTS.carrierAmp);
    setModIndex(DEFAULTS.modIndex);
    setResetKey((k) => k + 1);
  };

  // Map the friendly scheme selector to the DSP AmMode enum.
  const mode: AmMode =
    scheme === 'ssb' ? (ssbSide === 'usb' ? 'ssb-usb' : 'ssb-lsb') : (scheme as AmMode);

  const amParams: AnalogAmParams = {
    mode,
    messageFreq: msgFreq,
    carrierFreq,
    carrierAmp,
    modIndex,
    messageWave,
  };
  // Static (non-animated) render: build the view at t = 0.
  const amView = buildAnalogAmView(amParams);
  const powerView = buildAnalogPowerView({ amParams });

  function handlePlay() {
    if (playing) {
      audioHandle.current?.stop();
      audioHandle.current = null;
      setPlaying(false);
      return;
    }
    const handle = playSignalSamples(amView.modulated, 220, 1.5);
    if (!handle) return;
    audioHandle.current = handle;
    setPlaying(true);
    setTimeout(() => {
      audioHandle.current = null;
      setPlaying(false);
    }, 1550);
  }

  const showPower = scheme === 'conventional';

  return (
    <div className="analog__section">
      <div className="analog__subtabbar">
        <Segmented<Scheme>
          ariaLabel={t('analog.am.scheme')}
          value={scheme}
          options={[
            { value: 'dsb', label: t('analog.am.scheme.dsb') },
            { value: 'conventional', label: t('analog.am.scheme.conventional') },
            { value: 'ssb', label: t('analog.am.scheme.ssb') },
            { value: 'vsb', label: t('analog.am.scheme.vsb') },
          ]}
          onChange={setScheme}
        />
      </div>

      <div className="module-layout">
        <aside className="analog__controls">
          <Panel title={t('analog.am.parameters')}>
            <Select<MessageWave>
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
            {scheme === 'ssb' && (
              <Select<SsbSide>
                label={t('analog.am.ssbSide')}
                value={ssbSide}
                onChange={setSsbSide}
                options={[
                  { value: 'usb', label: t('analog.am.ssbSide.usb') },
                  { value: 'lsb', label: t('analog.am.ssbSide.lsb') },
                ]}
              />
            )}
            <Slider
              label={<HintText text={t('analog.am.messageFreq')} />}
              value={msgFreq}
              min={100}
              max={5000}
              step={100}
              unit="Hz"
              onChange={setMsgFreq}
            />
            <Slider
              label={<HintText text={t('analog.am.carrierFreq')} />}
              value={carrierFreq / 1000}
              min={5}
              max={50}
              step={1}
              unit="kHz"
              onChange={(v) => setCarrierFreq(v * 1000)}
            />
            <Slider
              label={<HintText text={t('analog.am.carrierAmp')} />}
              value={carrierAmp}
              min={0.1}
              max={3}
              step={0.1}
              unit="V"
              onChange={setCarrierAmp}
            />
            {(scheme === 'conventional' || scheme === 'dsb') && (
              <Slider
                label={<HintText text={t('analog.am.modIndex')} />}
                value={modIndex}
                min={0}
                max={2}
                step={0.05}
                onChange={setModIndex}
              />
            )}
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
              <button type="button" className="studio__audio__reset" onClick={resetParams}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21.5 2v6h-6" />
                  <path d="M2.5 22v-6h6" />
                  <path d="M22 11.5A10 10 0 0 0 3.2 7.2" />
                  <path d="M2 12.5a10 10 0 0 0 18.8 4.2" />
                </svg>
                {t('analog.am.reset')}
              </button>
            </div>
          </Panel>
        </aside>

        <div className="analog__content">
          <div className="analog__readouts">
            <div className="analog__metric">
              <span className="analog__metric__label">{t('analog.readout.bandwidth')}</span>
              <span className="analog__metric__value">
                {(scheme === 'ssb' ? msgFreq : 2 * msgFreq).toFixed(0)}
                <small>Hz</small>
              </span>
            </div>
            {showPower && (
              <>
                <div className="analog__metric">
                  <span className="analog__metric__label">
                    <HintText text={t('analog.am.modIndex')} />
                  </span>
                  <span className="analog__metric__value">{modIndex.toFixed(2)}</span>
                </div>
                <div className="analog__metric">
                  <span className="analog__metric__label"><HintText text={t('analog.power.carrierPower')} /></span>
                  <span className="analog__metric__value">{powerView.carrierPower.toFixed(3)}</span>
                </div>
                <div className="analog__metric">
                  <span className="analog__metric__label"><HintText text={t('analog.power.sidebandPower')} /></span>
                  <span className="analog__metric__value">{powerView.sidebandPower.toFixed(3)}</span>
                </div>
                <div className="analog__metric">
                  <span className="analog__metric__label"><HintText text={t('analog.readout.efficiency')} /></span>
                  <span className="analog__metric__value">
                    {(powerView.efficiency * 100).toFixed(1)}
                    <small>%</small>
                  </span>
                </div>
              </>
            )}
          </div>

          <Panel title={t('analog.am.title')}>
            <AmModulatorPanel key={resetKey} view={amView} />
          </Panel>

          {/* Scheme-specific reference cards — Proakis & Salehi Ch. 3 */}
          {scheme === 'dsb' && (
            <div className="analog__cards">
              <div className="analog__card">
                <h3 className="analog__card__title analog__card__title--green">Signal Definition</h3>
                <div className="analog__card__body">
                  <p>
                    DSB-SC multiplies the message directly by the carrier — the carrier term
                    disappears entirely (§3.1):
                  </p>
                  <div className="analog__card__formula">
                    <Formula tex="u(t) = m(t)\cos(2\pi f_c t)" block />
                  </div>
                  <ul style={{ marginTop: 'var(--space-1)' }}>
                    <li><Formula tex="m(t)" /> — baseband message signal</li>
                    <li><Formula tex="f_c" /> — carrier frequency</li>
                    <li>No carrier component in the transmitted signal</li>
                  </ul>
                </div>
              </div>

              <div className="analog__card">
                <h3 className="analog__card__title analog__card__title--orange">Spectrum</h3>
                <div className="analog__card__body">
                  <p>
                    Multiplication in time ↔ convolution in frequency; the baseband spectrum
                    shifts to <Formula tex="\pm f_c" />:
                  </p>
                  <div className="analog__card__formula">
                    <Formula tex="U(f) = \tfrac{1}{2}\bigl[M(f-f_c)+M(f+f_c)\bigr]" block />
                  </div>
                  <ul style={{ marginTop: 'var(--space-1)' }}>
                    <li>Upper sideband (USB): <Formula tex="f_c + W" /></li>
                    <li>Lower sideband (LSB): <Formula tex="f_c - W" /></li>
                    <li>Both sidebands present; no carrier spike</li>
                  </ul>
                </div>
              </div>

              <div className="analog__card">
                <h3 className="analog__card__title analog__card__title--blue">Bandwidth &amp; Power</h3>
                <div className="analog__card__body">
                  <p>
                    Transmitting both sidebands doubles the bandwidth of the message signal:
                  </p>
                  <div className="analog__card__formula">
                    <Formula tex="B_T = 2W" block />
                  </div>
                  <ul style={{ marginTop: 'var(--space-1)' }}>
                    <li><Formula tex="W" /> — message bandwidth</li>
                    <li>Power efficiency: <strong>100 %</strong> — all transmitted power is in the sidebands</li>
                    <li>No power wasted on a carrier component</li>
                  </ul>
                </div>
              </div>

              <div className="analog__card">
                <h3 className="analog__card__title analog__card__title--green">Coherent Demodulation</h3>
                <div className="analog__card__body">
                  <p>
                    Because there is no carrier reference in the signal, the receiver must
                    generate a phase-synchronized local carrier:
                  </p>
                  <div className="analog__card__formula">
                    <Formula tex="\hat{m}(t) = \mathrm{LPF}\!\left\{u(t)\cdot 2\cos(2\pi f_c t)\right\}" block />
                  </div>
                  <ul style={{ marginTop: 'var(--space-1)' }}>
                    <li>Phase error in local carrier → signal attenuation</li>
                    <li>A phase-locked loop (PLL) is commonly used for carrier recovery</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {scheme === 'conventional' && (
            <div className="analog__cards">
              <div className="analog__card">
                <h3 className="analog__card__title analog__card__title--green">Signal Definition</h3>
                <div className="analog__card__body">
                  <p>
                    The carrier is added before multiplication so the envelope tracks the
                    message (§3.2):
                  </p>
                  <div className="analog__card__formula">
                    <Formula tex="u(t) = A_c\bigl[1 + a\,m_n(t)\bigr]\cos(2\pi f_c t)" block />
                  </div>
                  <ul style={{ marginTop: 'var(--space-1)' }}>
                    <li><Formula tex="A_c" /> — carrier amplitude</li>
                    <li><Formula tex="a" /> — modulation index (<Formula tex="0 < a \le 1" /> for no distortion)</li>
                    <li><Formula tex="m_n(t)" /> — normalized message (<Formula tex="\max|m_n|=1" />)</li>
                  </ul>
                </div>
              </div>

              <div className="analog__card">
                <h3 className="analog__card__title analog__card__title--orange">Modulation Index</h3>
                <div className="analog__card__body">
                  <p>
                    The modulation index <Formula tex="a" /> controls how deeply the
                    message modulates the carrier envelope:
                  </p>
                  <div className="analog__card__formula">
                    <Formula tex="a = \frac{A_{\max} - A_{\min}}{A_{\max} + A_{\min}}" block />
                  </div>
                  <ul style={{ marginTop: 'var(--space-1)' }}>
                    <li><Formula tex="a < 1" /> — under-modulation, envelope always positive</li>
                    <li><Formula tex="a = 1" /> — 100 % modulation</li>
                    <li><Formula tex="a > 1" /> — over-modulation, envelope goes negative → distortion</li>
                  </ul>
                </div>
              </div>

              <div className="analog__card">
                <h3 className="analog__card__title analog__card__title--blue">Power &amp; Efficiency</h3>
                <div className="analog__card__body">
                  <p>
                    Total transmitted power splits between a large carrier and useful sidebands:
                  </p>
                  <div className="analog__card__formula">
                    <Formula tex="\eta = \frac{a^2 P_{m_n}}{1 + a^2 P_{m_n}}" block />
                  </div>
                  <ul style={{ marginTop: 'var(--space-1)' }}>
                    <li><Formula tex="P_{m_n}" /> — normalized message power</li>
                    <li>For a sinusoid with <Formula tex="a=1" />: <Formula tex="\eta = 1/3" /> (33 %)</li>
                    <li>Carrier always wastes power, but enables simple envelope detection</li>
                  </ul>
                </div>
              </div>

              <div className="analog__card">
                <h3 className="analog__card__title analog__card__title--green">Envelope Detection</h3>
                <div className="analog__card__body">
                  <p>
                    When <Formula tex="a \le 1" />, the envelope of <Formula tex="u(t)" /> is
                    proportional to <Formula tex="m(t)" /> — no coherent carrier needed:
                  </p>
                  <div className="analog__card__formula">
                    <Formula tex="\hat{m}(t) \propto A_c\bigl[1 + a\,m_n(t)\bigr]" block />
                  </div>
                  <ul style={{ marginTop: 'var(--space-1)' }}>
                    <li>Envelope detector: diode + RC low-pass filter</li>
                    <li>Simple, low-cost hardware — used in AM broadcast radios</li>
                    <li>Over-modulation (<Formula tex="a>1" />) breaks the envelope tracker</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {scheme === 'ssb' && (
            <div className="analog__cards">
              <div className="analog__card">
                <h3 className="analog__card__title analog__card__title--green">Signal Definition</h3>
                <div className="analog__card__body">
                  <p>
                    SSB transmits only one sideband. The Hilbert transform cancels the unwanted
                    sideband (§3.3):
                  </p>
                  <div className="analog__card__formula">
                    <Formula
                      tex="u(t) = A_c\!\left[m_n(t)\cos(2\pi f_c t) \mp \hat{m}_n(t)\sin(2\pi f_c t)\right]"
                      block
                    />
                  </div>
                  <ul style={{ marginTop: 'var(--space-1)' }}>
                    <li><Formula tex="-" /> → Upper Sideband (USB)</li>
                    <li><Formula tex="+" /> → Lower Sideband (LSB)</li>
                    <li><Formula tex="\hat{m}_n(t)" /> — Hilbert transform of <Formula tex="m_n(t)" /></li>
                  </ul>
                </div>
              </div>

              <div className="analog__card">
                <h3 className="analog__card__title analog__card__title--orange">Hilbert Transform</h3>
                <div className="analog__card__body">
                  <p>
                    The Hilbert transform shifts every frequency component by <Formula tex="-90°" />,
                    producing the analytic signal's imaginary part:
                  </p>
                  <div className="analog__card__formula">
                    <Formula tex="\hat{m}(t) = \frac{1}{\pi}\int_{-\infty}^{\infty}\frac{m(\tau)}{t-\tau}\,d\tau" block />
                  </div>
                  <ul style={{ marginTop: 'var(--space-1)' }}>
                    <li>In the frequency domain: <Formula tex="\hat{M}(f) = -j\,\mathrm{sgn}(f)\,M(f)" /></li>
                    <li>Magnitudes unchanged; all phases shifted <Formula tex="-\pi/2" /></li>
                  </ul>
                </div>
              </div>

              <div className="analog__card">
                <h3 className="analog__card__title analog__card__title--blue">Bandwidth</h3>
                <div className="analog__card__body">
                  <p>
                    Only one sideband is transmitted, halving the bandwidth compared to DSB-SC:
                  </p>
                  <div className="analog__card__formula">
                    <Formula tex="B_T = W" block />
                  </div>
                  <ul style={{ marginTop: 'var(--space-1)' }}>
                    <li>Most spectrum-efficient AM scheme</li>
                    <li>Power efficiency: <strong>100 %</strong> (all power is in the useful sideband)</li>
                    <li>Used in voice HF radio (ham, aviation, military) and telephone FDM</li>
                  </ul>
                </div>
              </div>

              <div className="analog__card">
                <h3 className="analog__card__title analog__card__title--green">Coherent Demodulation</h3>
                <div className="analog__card__body">
                  <p>
                    SSB requires a phase- and frequency-accurate local carrier for demodulation:
                  </p>
                  <div className="analog__card__formula">
                    <Formula tex="\hat{m}(t) = \mathrm{LPF}\!\left\{u(t)\cdot 2\cos(2\pi f_c t)\right\}" block />
                  </div>
                  <ul style={{ marginTop: 'var(--space-1)' }}>
                    <li>Phase error <Formula tex="\phi" /> → output <Formula tex="\propto\cos\phi" /> (attenuation)</li>
                    <li>Frequency error <Formula tex="\Delta f" /> → voice pitch shift (Donald Duck effect)</li>
                    <li>Sideband filter design is the key practical challenge</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {scheme === 'vsb' && (
            <div className="analog__cards">
              <div className="analog__card">
                <h3 className="analog__card__title analog__card__title--green">Signal Definition</h3>
                <div className="analog__card__body">
                  <p>
                    VSB filters the DSB-SC signal with a sideband shaping filter <Formula tex="H_{VSB}(f)" />
                    that retains one full sideband plus a vestige of the other (§3.4):
                  </p>
                  <div className="analog__card__formula">
                    <Formula tex="U_{VSB}(f) = U_{DSB}(f)\,H_{VSB}(f)" block />
                  </div>
                  <ul style={{ marginTop: 'var(--space-1)' }}>
                    <li>Between SSB (one sideband) and DSB-SC (both sidebands)</li>
                    <li>Practical compromise: simpler filter than SSB, narrower BW than DSB</li>
                  </ul>
                </div>
              </div>

              <div className="analog__card">
                <h3 className="analog__card__title analog__card__title--orange">VSB Filter Condition</h3>
                <div className="analog__card__body">
                  <p>
                    For distortion-free coherent demodulation, the VSB filter must satisfy
                    vestigial symmetry around <Formula tex="f_c" />:
                  </p>
                  <div className="analog__card__formula">
                    <Formula tex="H(f_c+\delta) + H(f_c-\delta) = 1, \quad |\delta| \le W" block />
                  </div>
                  <ul style={{ marginTop: 'var(--space-1)' }}>
                    <li>Complementary roll-off at the sideband edge</li>
                    <li>The two partial sidebands combine to reconstruct the full baseband spectrum</li>
                  </ul>
                </div>
              </div>

              <div className="analog__card">
                <h3 className="analog__card__title analog__card__title--blue">Bandwidth</h3>
                <div className="analog__card__body">
                  <p>
                    The vestige adds a small frequency guard <Formula tex="f_v" /> beyond the
                    message bandwidth:
                  </p>
                  <div className="analog__card__formula">
                    <Formula tex="W < B_T = W + f_v < 2W" block />
                  </div>
                  <ul style={{ marginTop: 'var(--space-1)' }}>
                    <li>Slightly wider than SSB — allows a gentler filter transition band</li>
                    <li>Much narrower than DSB-SC — saves valuable spectrum</li>
                    <li>Easier to implement than a brick-wall SSB filter</li>
                  </ul>
                </div>
              </div>

              <div className="analog__card">
                <h3 className="analog__card__title analog__card__title--green">Applications</h3>
                <div className="analog__card__body">
                  <p>
                    VSB was the standard for analog TV broadcasting because it handles DC
                    components and sharp spectral edges well:
                  </p>
                  <ul>
                    <li><span className="analog__card__label">ATSC / NTSC:</span> 6 MHz channel — VSB carries video (DC-sensitive)</li>
                    <li><span className="analog__card__label">ISDB-T:</span> digital variant of VSB-like filtering in terrestrial TV</li>
                    <li>Allows a pilot carrier for sync — simpler receiver than SSB</li>
                    <li>DC component of video preserved (SSB would distort it)</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
