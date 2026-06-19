import { useMemo, useState } from 'react';
import { Panel, Slider, Select, Segmented, HintText, Formula } from '@/components';
import { t } from '@/i18n';
import type { AmMode } from '@/lib/dsp/analog';
import {
  buildAnalogDemodView,
  buildEnvelopeDetectorView,
  buildModulatorView,
  type AnalogAmParams,
  type AnalogDemodParams,
  type MessageWave,
  type ModulatorKind,
} from '../model';
import { DemodulationPanel, EnvelopeDetectorPanel, ModulatorSpectrumPanel } from '../panels';
import {
  ModulatorBlockDiagram,
  ModulatorCircuit,
  EnvelopeDetectorCircuit,
  CoherentDetectorCircuit,
  PllCircuit,
} from '../circuits';
import type { SectionProps } from './types';
import '@/lib/plot/schematic.css';

type Group = 'modulator' | 'demodulator';
type DemodMethod = AnalogDemodParams['method'];

/** Glass metric card for a categorical readout (label + tone-colored value). */
function StatCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'ok' | 'warn' | 'err';
}) {
  return (
    <div className="analog__metric analog__metric--text">
      <span className="analog__metric__label">{label}</span>
      <span
        className={`analog__metric__value${tone === 'default' ? '' : ` analog__metric__value--${tone}`}`}
      >
        {value}
      </span>
    </div>
  );
}

/** Single info card — active variant adds neon border highlight. */
function InfoCard({
  title,
  accent = 'green',
  active = false,
  children,
}: {
  title: string;
  accent?: 'green' | 'orange' | 'blue';
  active?: boolean;
  children: React.ReactNode;
}) {
  const titleClass = `analog__card__title analog__card__title--${accent}`;
  return (
    <div
      className="analog__card"
      style={
        active
          ? {
              borderColor:
                accent === 'green'
                  ? 'var(--accent)'
                  : accent === 'orange'
                    ? 'var(--accent-2)'
                    : 'var(--accent-blue)',
              boxShadow:
                accent === 'green'
                  ? '0 0 16px rgba(57,255,133,0.14)'
                  : accent === 'orange'
                    ? '0 0 16px rgba(255,140,50,0.14)'
                    : '0 0 16px rgba(100,120,255,0.14)',
            }
          : undefined
      }
    >
      <h3 className={titleClass}>{title}</h3>
      <div className="analog__card__body">{children}</div>
    </div>
  );
}

/** Info cards for all 4 modulator types; highlights the active selection. */
function ModulatorInfoCards({ active }: { active: ModulatorKind }) {
  return (
    <div className="analog__cards">
      <InfoCard title="Power-law Modulator" accent="green" active={active === 'power-law'}>
        <p>
          A nonlinear device (e.g. P-N diode) with characteristic{' '}
          <Formula tex="v_o = a_1 v_i + a_2 v_i^2" /> is driven by the sum{' '}
          <Formula tex="v_i = m(t) + A_c\cos(2\pi f_c t)" />.
          Expanding the square term produces an AM component; a BPF centred on{' '}
          <Formula tex="f_c" /> discards DC and the <Formula tex="2f_c" /> image (§3.3.1).
        </p>
        <div className="analog__card__formula">
          <Formula tex="v_o(t) = a_1 v_i + a_2 v_i^2 \xrightarrow{\text{BPF}} (a_1 + 2a_2 A_c)\!\left[1+\tfrac{a_2}{a_1+2a_2 A_c}m(t)\right]\!\cos(2\pi f_c t)" block />
        </div>
        <ul>
          <li><span className="analog__card__label">Output:</span> Conventional AM (carrier retained)</li>
          <li><span className="analog__card__label">Device:</span> P-N diode, BJT, or FET in nonlinear region</li>
          <li><span className="analog__card__label">Filter:</span> BPF removes DC, <Formula tex="2f_m" />, and <Formula tex="2f_c" /> terms</li>
        </ul>
      </InfoCard>

      <InfoCard title="Switching Modulator" accent="orange" active={active === 'switching'}>
        <p>
          A diode switch is driven by the carrier, effectively multiplying the input by a
          periodic unit square wave <Formula tex="p(t)" /> whose Fourier series contains only
          odd harmonics of <Formula tex="f_c" /> (Eq. 3.3.7):
        </p>
        <div className="analog__card__formula">
          <Formula tex="p(t)=\tfrac{1}{2}+\tfrac{2}{\pi}\sum_{n=1}^{\infty}\frac{(-1)^{n-1}}{2n-1}\cos\!\bigl(2\pi f_c(2n-1)t\bigr)" block />
        </div>
        <p>A BPF at <Formula tex="f_c" /> retains only the fundamental term:</p>
        <div className="analog__card__formula">
          <Formula tex="x_p(t)=m(t)\cdot p(t)\xrightarrow{\text{BPF}}\tfrac{1}{2}m(t)\cos(2\pi f_c t)+\tfrac{A_c}{2}\cos(2\pi f_c t)" block />
        </div>
        <ul>
          <li><span className="analog__card__label">Output:</span> Conventional AM (carrier retained)</li>
          <li><span className="analog__card__label">Switch:</span> Single diode opened/closed at carrier rate</li>
          <li><span className="analog__card__label">Filter:</span> BPF removes odd harmonics <Formula tex="3f_c,\,5f_c,\ldots" /></li>
        </ul>
      </InfoCard>

      <InfoCard title="Balanced Modulator" accent="blue" active={active === 'balanced'}>
        <p>
          Two switching (or power-law) modulators are fed the same message but opposite-polarity
          carriers. Their outputs are subtracted so the carrier terms cancel exactly, leaving
          only the sideband components — DSB-SC (§3.3.3).
        </p>
        <div className="analog__card__formula">
          <Formula tex="u(t)=x_{p1}(t)-x_{p2}(t)=m(t)\cos(2\pi f_c t)" block />
        </div>
        <ul>
          <li><span className="analog__card__label">Output:</span> DSB-SC (carrier cancelled)</li>
          <li><span className="analog__card__label">Method:</span> Difference of two AM branches</li>
          <li><span className="analog__card__label">Efficiency:</span> 100 % — all power in sidebands</li>
        </ul>
      </InfoCard>

      <InfoCard title="Ring (Bridge) Modulator" accent="green" active={active === 'ring'}>
        <p>
          Four diodes arranged in a bridge ring switch polarity in sync with the carrier,
          effectively multiplying <Formula tex="m(t)" /> by a ±1 square wave. The result
          is a DSB-SC signal; harmonics at <Formula tex="3f_c,5f_c,\ldots" /> are removed
          by the BPF (§3.3.3).
        </p>
        <div className="analog__card__formula">
          <Formula tex="u(t)=m(t)\cdot\mathrm{sgn}\!\left(\cos(2\pi f_c t)\right)\xrightarrow{\text{BPF}}m(t)\cos(2\pi f_c t)" block />
        </div>
        <ul>
          <li><span className="analog__card__label">Output:</span> DSB-SC (carrier cancelled)</li>
          <li><span className="analog__card__label">Advantage:</span> No DC path — carrier fully suppressed</li>
          <li><span className="analog__card__label">Circuit:</span> 4 diodes + center-tapped transformer</li>
        </ul>
      </InfoCard>
    </div>
  );
}

/** Info cards for all 3 demodulator methods; highlights the active selection. */
function DemodulatorInfoCards({ active }: { active: DemodMethod }) {
  return (
    <div className="analog__cards">
      <InfoCard title="Envelope Detector" accent="green" active={active === 'envelope'}>
        <p>
          A half-wave rectifier followed by an RC low-pass filter tracks the amplitude
          envelope of the AM signal. No carrier reference is needed, making this the
          simplest AM receiver (§3.4.1).
        </p>
        <div className="analog__card__formula">
          <Formula tex="\hat{m}(t)\approx A_c\bigl[1+a\,m_n(t)\bigr]\xrightarrow{\text{DC block}}a\,A_c\,m_n(t)" block />
        </div>
        <ul>
          <li><span className="analog__card__label">Condition:</span> Works only when <Formula tex="a\le 1" /> (no over-modulation)</li>
          <li><span className="analog__card__label">RC time constant:</span> <Formula tex="\tfrac{1}{f_c}\ll RC\ll\tfrac{1}{W}" /></li>
          <li><span className="analog__card__label">Advantage:</span> Extremely simple — no local oscillator</li>
          <li><span className="analog__card__label">Limitation:</span> Fails for DSB-SC; distorts when <Formula tex="a>1" /></li>
        </ul>
      </InfoCard>

      <InfoCard title="Coherent (Synchronous) Detector" accent="orange" active={active === 'coherent'}>
        <p>
          The received AM signal is multiplied by a locally generated carrier{' '}
          <Formula tex="\cos(2\pi f_c t)" />, then filtered by an LPF.
          The product recovers the message regardless of modulation index (§3.4.2).
        </p>
        <div className="analog__card__formula">
          <Formula tex="u(t)\cdot\cos(2\pi f_c t)=\tfrac{A_c}{2}\bigl[1+a\,m_n(t)\bigr]+\text{(2}f_c\text{ term)}\xrightarrow{\text{LPF}}m(t)" block />
        </div>
        <ul>
          <li><span className="analog__card__label">Condition:</span> Requires phase-coherent local oscillator</li>
          <li><span className="analog__card__label">Advantage:</span> Works for all <Formula tex="a" /> including over-modulation and DSB-SC</li>
          <li><span className="analog__card__label">Cost:</span> Needs carrier synchronisation circuit</li>
        </ul>
      </InfoCard>

      <InfoCard title="PLL Carrier Recovery" accent="blue" active={active === 'pll'}>
        <p>
          A phase-locked loop (PLL) extracts the carrier phase from the received signal.
          The VCO output tracks <Formula tex="\hat{\theta}(t)\to 2\pi f_c t" />,
          providing the coherent reference for demodulation (§3.4.2 / §3.5).
        </p>
        <div className="analog__card__formula">
          <Formula tex="\dot{\hat{\theta}}(t)=\omega_c+K_v\,e(t),\quad e(t)=u(t)\sin\hat{\theta}(t)" block />
        </div>
        <ul>
          <li><span className="analog__card__label">Components:</span> Phase detector, loop filter, VCO</li>
          <li><span className="analog__card__label">Lock range:</span> Determined by loop bandwidth</li>
          <li><span className="analog__card__label">Advantage:</span> Tracks frequency/phase drift; no pilot tone needed</li>
          <li><span className="analog__card__label">Trade-off:</span> Pull-in time and false-lock risk</li>
        </ul>
      </InfoCard>
    </div>
  );
}

// Default parameter values (used on first render and by the Reset button).
const DEFAULTS = {
  modKind: 'switching' as ModulatorKind,
  demodMethod: 'envelope' as DemodMethod,
  messageWave: 'sine' as MessageWave,
  msgFreq: 1000,
  carrierFreq: 20000,
  modIndex: 0.5,
  rcUs: 200, // envelope-detector RC time constant (µs); good for the default f_c/f_m
};

export function ModDemodSection({ clock }: SectionProps) {
  const [group, setGroup] = useState<Group>('modulator');
  const [modKind, setModKind] = useState<ModulatorKind>(DEFAULTS.modKind);
  const [demodMethod, setDemodMethod] = useState<DemodMethod>(DEFAULTS.demodMethod);
  const [messageWave, setMessageWave] = useState<MessageWave>(DEFAULTS.messageWave);
  const [msgFreq, setMsgFreq] = useState(DEFAULTS.msgFreq);
  const [carrierFreq, setCarrierFreq] = useState(DEFAULTS.carrierFreq);
  const [modIndex, setModIndex] = useState(DEFAULTS.modIndex);
  const [rcUs, setRcUs] = useState(DEFAULTS.rcUs);
  // Incrementing this key remounts the plot panels, which resets all useZoom hooks.
  const [resetKey, setResetKey] = useState(0);

  // Slow conduction phase (toggles ~1 Hz) so diodes visibly switch.
  const phase: 0 | 1 = Math.floor(clock * 2) % 2 === 0 ? 0 : 1;

  // The modulator view runs 4 FFTs and does not depend on the clock, so memoize
  // it on the control values — otherwise it recomputes on every animation tick.
  const modView = useMemo(
    () =>
      buildModulatorView({
        modulator: modKind,
        messageFreq: msgFreq,
        carrierFreq,
        carrierAmp: 1,
        messageWave,
      }),
    [modKind, msgFreq, carrierFreq, messageWave],
  );

  const amParams = useMemo<AnalogAmParams>(
    () => ({
      mode: 'conventional' as AmMode,
      messageFreq: msgFreq,
      carrierFreq,
      carrierAmp: 1,
      modIndex,
      messageWave,
    }),
    [msgFreq, carrierFreq, modIndex, messageWave],
  );
  // Static signal plots (tStart = 0): the demodulation waveforms stay put so
  // students can read them; the controls reshape them live. Memoized on the
  // control values so they do not recompute on every animation tick.
  const demodView = useMemo(
    () => buildAnalogDemodView({ method: demodMethod, amParams }, 0),
    [demodMethod, amParams],
  );
  // Envelope-detector dynamics (Fig 3.28) — only for the envelope method, also static.
  const envView = useMemo(
    () =>
      demodMethod === 'envelope'
        ? buildEnvelopeDetectorView({ amParams, rc: rcUs * 1e-6 }, 0)
        : null,
    [demodMethod, amParams, rcUs],
  );

  // Fidelity readout: envelope detector reports its RC regime (ripple / lag /
  // over-modulation / faithful); coherent & PLL keep the binary faithful flag.
  const fidelity: { value: string; tone: 'ok' | 'warn' | 'err' } = envView
    ? {
        value:
          envView.regime === 'good'
            ? t('analog.demod.faithful')
            : t(`analog.demod.status.${envView.regime}`),
        tone: envView.regime === 'good' ? 'ok' : envView.regime === 'over' ? 'err' : 'warn',
      }
    : {
        value: t(demodView.faithful ? 'analog.demod.faithful' : 'analog.demod.distorted'),
        tone: demodView.faithful ? 'ok' : 'err',
      };

  // Reset every parameter control to its default and re-fit all plot zooms.
  const resetParams = () => {
    setModKind(DEFAULTS.modKind);
    setDemodMethod(DEFAULTS.demodMethod);
    setMessageWave(DEFAULTS.messageWave);
    setMsgFreq(DEFAULTS.msgFreq);
    setCarrierFreq(DEFAULTS.carrierFreq);
    setModIndex(DEFAULTS.modIndex);
    setRcUs(DEFAULTS.rcUs);
    setResetKey((k) => k + 1);
  };

  return (
    <div className="analog__section">
      <div className="analog__subtabbar">
        <Segmented<Group>
          ariaLabel={t('analog.tab.modimpl')}
          value={group}
          options={[
            { value: 'modulator', label: t('analog.mod.group') },
            { value: 'demodulator', label: t('analog.demod.group') },
          ]}
          onChange={setGroup}
        />
      </div>

      <div className="module-layout">
        <aside className="analog__controls">
          <Panel title={t('analog.am.parameters')}>
            {group === 'modulator' && (
              <Select<ModulatorKind>
                label={t('analog.mod.kind')}
                value={modKind}
                onChange={setModKind}
                options={[
                  { value: 'power-law', label: t('analog.mod.kind.power-law') },
                  { value: 'switching', label: t('analog.mod.kind.switching') },
                  { value: 'balanced', label: t('analog.mod.kind.balanced') },
                  { value: 'ring', label: t('analog.mod.kind.ring') },
                ]}
              />
            )}
            {group === 'demodulator' && (
              <Select<DemodMethod>
                label={t('analog.demod.method')}
                value={demodMethod}
                onChange={setDemodMethod}
                options={[
                  { value: 'envelope', label: t('analog.demod.method.envelope') },
                  { value: 'coherent', label: t('analog.demod.method.coherent') },
                  { value: 'pll', label: t('analog.demod.method.pll') },
                ]}
              />
            )}
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
            {group === 'demodulator' && (
              <Slider
                label={<HintText text={t('analog.am.modIndex')} />}
                value={modIndex}
                min={0}
                max={2}
                step={0.05}
                onChange={setModIndex}
              />
            )}
            {group === 'demodulator' && demodMethod === 'envelope' && (
              <Slider
                label={<HintText text={t('analog.demod.rc')} />}
                value={rcUs}
                min={5}
                max={2000}
                step={5}
                unit="µs"
                onChange={setRcUs}
              />
            )}
            <button type="button" className="analog__reset" onClick={resetParams}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21.5 2v6h-6" />
                <path d="M2.5 22v-6h6" />
                <path d="M22 11.5A10 10 0 0 0 3.2 7.2" />
                <path d="M2 12.5a10 10 0 0 0 18.8 4.2" />
              </svg>
              {t('analog.am.reset')}
            </button>
          </Panel>
        </aside>

        <div className="analog__content">
          {group === 'modulator' && (
            <>
              <div className="analog__readouts">
                <StatCard label={t('analog.mod.kind')} value={t(`analog.mod.kind.${modKind}`)} />
                <StatCard
                  label={t('analog.mod.outputType')}
                  value={t(modView.producesDsb ? 'analog.mod.producesDsb' : 'analog.mod.producesConv')}
                  tone={modView.producesDsb ? 'warn' : 'ok'}
                />
              </div>
              <div className="analog__plots">
                <Panel title={t('analog.mod.block')}>
                  <ModulatorBlockDiagram key={resetKey} kind={modKind} carrierFreq={carrierFreq} />
                </Panel>
                <Panel title={t('analog.mod.circuit')}>
                  <ModulatorCircuit key={resetKey} kind={modKind} phase={phase} />
                </Panel>
              </div>
              <Panel title={`${t('analog.mod.dirty')} / ${t('analog.mod.clean')}`}>
                <ModulatorSpectrumPanel key={resetKey} view={modView} />
              </Panel>
              <div className="analog__hint">{t(`analog.mod.observe.${modKind === 'power-law' ? 'powerLaw' : modKind}`)}</div>
              <ModulatorInfoCards active={modKind} />
            </>
          )}

          {group === 'demodulator' && (
            <>
              <div className="analog__readouts">
                <StatCard label={t('analog.demod.method')} value={t(`analog.demod.method.${demodMethod}`)} />
                <StatCard label={t('analog.demod.fidelity')} value={fidelity.value} tone={fidelity.tone} />
                {envView && (
                  <StatCard
                    label={t('analog.demod.rcWindow')}
                    value={`${Math.round(envView.rcMin * 1e6)} … ${Math.round(envView.rcMax * 1e6)} µs`}
                    tone={envView.faithful ? 'ok' : 'default'}
                  />
                )}
              </div>
              <Panel title={t('analog.mod.circuit')}>
                <div className="analog__demod-circuit">
                  {demodMethod === 'envelope' && (
                    <EnvelopeDetectorCircuit key={resetKey} phase={phase} clock={clock} />
                  )}
                  {demodMethod === 'coherent' && <CoherentDetectorCircuit key={resetKey} clock={clock} />}
                  {demodMethod === 'pll' && <PllCircuit key={resetKey} clock={clock} />}
                </div>
              </Panel>
              <Panel title={t('analog.demod.title')}>
                {envView ? (
                  <EnvelopeDetectorPanel key={resetKey} view={envView} />
                ) : (
                  <DemodulationPanel key={resetKey} view={demodView} />
                )}
              </Panel>
              <DemodulatorInfoCards active={demodMethod} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
