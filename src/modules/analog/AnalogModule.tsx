import { useMemo, useState } from 'react';
import {
  Panel,
  Slider,
  Select,
  Readout,
  TheoryBox,
  Formula,
} from '@/components';
import { t } from '@/i18n';
import type { AmMode, AngleMode } from '@/lib/dsp/analog';
import {
  buildAnalogAmView,
  buildAnalogFmView,
  buildAnalogPowerView,
  buildAnalogDemodView,
  buildAnalogSuperView,
  type AnalogAmParams,
  type AnalogFmParams,
  type AnalogDemodParams,
} from './model';
import {
  AmModulatorPanel,
  FmModulatorPanel,
  PowerPanel,
  DemodulationPanel,
  SuperheterodynePanel,
} from './panels';
import './analog.css';

type ActivePanel = 'am' | 'fm' | 'power' | 'demod' | 'super';
type DemodMethod = AnalogDemodParams['method'];

export function AnalogModule() {
  // AM controls
  const [amMode, setAmMode] = useState<AmMode>('conventional');
  const [amMsgFreq, setAmMsgFreq] = useState(1000); // Hz
  const [amCarrierFreq, setAmCarrierFreq] = useState(20000); // Hz
  const [amCarrierAmp, setAmCarrierAmp] = useState(1); // V
  const [amModIndex, setAmModIndex] = useState(0.5); // a

  // FM controls
  const [fmMode, setFmMode] = useState<AngleMode>('fm');
  const [fmMsgFreq, setFmMsgFreq] = useState(1000); // Hz
  const [fmCarrierFreq, setFmCarrierFreq] = useState(20000); // Hz
  const [fmCarrierAmp, setFmCarrierAmp] = useState(1); // V
  const [fmModIndex, setFmModIndex] = useState(5); // β or kp

  // Demodulation controls
  const [demodMethod, setDemodMethod] = useState<DemodMethod>('envelope');

  // Superheterodyne controls
  const [stationFreq, setStationFreq] = useState(1_000_000); // 1 MHz (AM band)
  const [ifFreq, setIfFreq] = useState(455_000); // 455 kHz standard IF

  // Module selection
  const [activePanel, setActivePanel] = useState<ActivePanel>('am');

  const amParams: AnalogAmParams = useMemo(
    () => ({
      mode: amMode,
      messageFreq: amMsgFreq,
      carrierFreq: amCarrierFreq,
      carrierAmp: amCarrierAmp,
      modIndex: amModIndex,
    }),
    [amMode, amMsgFreq, amCarrierFreq, amCarrierAmp, amModIndex],
  );

  const fmParams: AnalogFmParams = useMemo(
    () => ({
      mode: fmMode,
      messageFreq: fmMsgFreq,
      carrierFreq: fmCarrierFreq,
      carrierAmp: fmCarrierAmp,
      modIndex: fmModIndex,
    }),
    [fmMode, fmMsgFreq, fmCarrierFreq, fmCarrierAmp, fmModIndex],
  );

  const amView = useMemo(() => buildAnalogAmView(amParams), [amParams]);
  const fmView = useMemo(() => buildAnalogFmView(fmParams), [fmParams]);
  const powerView = useMemo(
    () => buildAnalogPowerView({ amParams }),
    [amParams],
  );
  const demodView = useMemo(
    () =>
      buildAnalogDemodView({
        method: demodMethod,
        amParams,
        fmParams,
      }),
    [demodMethod, amParams, fmParams],
  );
  const superView = useMemo(
    () => buildAnalogSuperView({ stationFreq, ifFreq }),
    [stationFreq, ifFreq],
  );

  return (
    <div className="module-layout">
      <aside className="analog__controls">
        <Panel title={t('nav.analog')}>
          <Select<ActivePanel>
            label={t('analog.panel.select')}
            value={activePanel}
            onChange={setActivePanel}
            options={[
              { value: 'am', label: t('analog.am.title') },
              { value: 'fm', label: t('analog.fm.title') },
              { value: 'power', label: t('analog.power.title') },
              { value: 'demod', label: t('analog.demod.title') },
              { value: 'super', label: t('analog.super.title') },
            ]}
          />

          {activePanel === 'am' && (
            <>
              <Select<AmMode>
                label={t('analog.am.mode')}
                value={amMode}
                onChange={setAmMode}
                options={[
                  { value: 'dsb', label: t('analog.am.mode.dsb') },
                  { value: 'conventional', label: t('analog.am.mode.conventional') },
                  { value: 'ssb-usb', label: t('analog.am.mode.ssb-usb') },
                  { value: 'ssb-lsb', label: t('analog.am.mode.ssb-lsb') },
                  { value: 'vsb', label: t('analog.am.mode.vsb') },
                ]}
              />
              <Slider
                label={t('analog.am.messageFreq')}
                value={amMsgFreq}
                min={100}
                max={5000}
                step={100}
                unit="Hz"
                onChange={setAmMsgFreq}
              />
              <Slider
                label={t('analog.am.carrierFreq')}
                value={amCarrierFreq}
                min={5000}
                max={50000}
                step={1000}
                unit="Hz"
                onChange={setAmCarrierFreq}
              />
              <Slider
                label={t('analog.am.carrierAmp')}
                value={amCarrierAmp}
                min={0.1}
                max={3}
                step={0.1}
                unit="V"
                onChange={setAmCarrierAmp}
              />
              <Slider
                label={t('analog.am.modIndex')}
                value={amModIndex}
                min={0}
                max={2}
                step={0.05}
                onChange={setAmModIndex}
              />
            </>
          )}

          {activePanel === 'fm' && (
            <>
              <Select<AngleMode>
                label={t('analog.fm.mode')}
                value={fmMode}
                onChange={setFmMode}
                options={[
                  { value: 'fm', label: t('analog.fm.mode.fm') },
                  { value: 'pm', label: t('analog.fm.mode.pm') },
                ]}
              />
              <Slider
                label={t('analog.fm.messageFreq')}
                value={fmMsgFreq}
                min={100}
                max={5000}
                step={100}
                unit="Hz"
                onChange={setFmMsgFreq}
              />
              <Slider
                label={t('analog.fm.carrierFreq')}
                value={fmCarrierFreq}
                min={5000}
                max={50000}
                step={1000}
                unit="Hz"
                onChange={setFmCarrierFreq}
              />
              <Slider
                label={t('analog.fm.carrierAmp')}
                value={fmCarrierAmp}
                min={0.1}
                max={3}
                step={0.1}
                unit="V"
                onChange={setFmCarrierAmp}
              />
              <Slider
                label={t('analog.fm.modIndex')}
                value={fmModIndex}
                min={0.1}
                max={15}
                step={0.5}
                onChange={setFmModIndex}
              />
            </>
          )}

          {activePanel === 'demod' && (
            <Select<DemodMethod>
              label={t('analog.demod.method')}
              value={demodMethod}
              onChange={setDemodMethod}
              options={[
                { value: 'envelope', label: t('analog.demod.method.envelope') },
                { value: 'coherent', label: t('analog.demod.method.coherent') },
                { value: 'pll', label: t('analog.demod.method.pll') },
                { value: 'fmdiscrim', label: t('analog.demod.method.fmdiscrim') },
              ]}
            />
          )}

          {activePanel === 'super' && (
            <>
              <Slider
                label={t('analog.super.station')}
                value={stationFreq}
                min={530_000}
                max={1_600_000}
                step={10_000}
                unit="Hz"
                onChange={setStationFreq}
              />
              <Slider
                label={t('analog.super.if')}
                value={ifFreq}
                min={100_000}
                max={500_000}
                step={5_000}
                unit="Hz"
                onChange={setIfFreq}
              />
            </>
          )}
        </Panel>
      </aside>

      <div className="analog__content">
        <div className="analog__readouts">
          {activePanel === 'am' && (
            <>
              <Readout
                label={t('analog.readout.bandwidth')}
                value={(amCarrierFreq - amMsgFreq).toFixed(0)}
                unit="Hz"
              />
              <Readout
                label={t('analog.am.modIndex')}
                value={amModIndex.toFixed(2)}
              />
              <Readout
                label={t('analog.readout.efficiency')}
                value={`${(powerView.efficiency * 100).toFixed(1)}%`}
              />
            </>
          )}
          {activePanel === 'fm' && (
            <>
              <Readout
                label={t('analog.fm.modIndex')}
                value={fmModIndex.toFixed(2)}
              />
              <Readout
                label={t('analog.fm.carson')}
                value={(fmView.carsonBw / 1000).toFixed(1)}
                unit="kHz"
              />
              <Readout
                label={t('analog.fm.sidebands')}
                value={fmView.sidebandFreqs.length}
              />
            </>
          )}
          {activePanel === 'demod' && (
            <>
              <Readout label={t('analog.demod.method')} value={t(`analog.demod.method.${demodMethod}`)} />
              <Readout
                label={t('analog.demod.fidelity')}
                value={t(demodView.faithful ? 'analog.demod.faithful' : 'analog.demod.distorted')}
                tone={demodView.faithful ? 'ok' : 'err'}
              />
            </>
          )}
          {activePanel === 'super' && (
            <>
              <Readout label={t('analog.super.lo')} value={(superView.loFreq / 1000).toFixed(0)} unit="kHz" />
              <Readout label={t('analog.super.image')} value={(superView.imageFreq / 1000).toFixed(0)} unit="kHz" tone="warn" />
            </>
          )}
          {activePanel === 'power' && (
            <>
              <Readout
                label={t('analog.power.carrierPower')}
                value={powerView.carrierPower.toFixed(3)}
              />
              <Readout
                label={t('analog.power.sidebandPower')}
                value={powerView.sidebandPower.toFixed(3)}
              />
              <Readout
                label={t('analog.power.efficiency')}
                value={`${(powerView.efficiency * 100).toFixed(1)}%`}
              />
            </>
          )}
        </div>

        <div className="analog__plots">
          {activePanel === 'am' && (
            <Panel title={t('analog.am.title')}>
              <AmModulatorPanel view={amView} />
            </Panel>
          )}
          {activePanel === 'fm' && (
            <Panel title={t('analog.fm.title')}>
              <FmModulatorPanel view={fmView} />
            </Panel>
          )}
          {activePanel === 'power' && (
            <Panel title={t('analog.power.title')}>
              <PowerPanel view={powerView} />
            </Panel>
          )}
          {activePanel === 'demod' && (
            <Panel title={t('analog.demod.title')}>
              <DemodulationPanel view={demodView} />
            </Panel>
          )}
          {activePanel === 'super' && (
            <Panel title={t('analog.super.title')}>
              <SuperheterodynePanel view={superView} />
            </Panel>
          )}
        </div>

        <TheoryBox title={t('analog.theory.title')}>
          {activePanel === 'am' && (
            <>
              <p>
                <strong>{t('analog.am.mode.conventional')}:</strong>
                <Formula tex="u(t) = A_c[1 + a \\cdot m_n(t)] \\cos(2\\pi f_c t)" block />
              </p>
              <p>
                <strong>{t('analog.theory.efficiency')}:</strong>
                <Formula tex="\\eta = \\frac{a^2 P_{mn}}{1 + a^2 P_{mn}}" block />
              </p>
              <p>
                <strong>SSB-USB:</strong>
                <Formula tex="u(t) = A_c[m_n(t)\\cos(2\\pi f_c t) - \\hat{m}_n(t)\\sin(2\\pi f_c t)]" block />
              </p>
            </>
          )}
          {activePanel === 'fm' && (
            <>
              <p>
                <strong>FM Modulation:</strong>
                <Formula tex="u(t) = A_c \\cos(2\\pi f_c t + \\beta \\sin(2\\pi f_m t))" block />
              </p>
              <p>
                <strong>{t('analog.theory.carson')}:</strong>
                <Formula tex="B = 2(\\beta + 1) f_m" block />
              </p>
              <p>
                <strong>Bessel Sidebands:</strong>
                <Formula tex="|u(f)| = A_c |J_n(\\beta)|" block />
              </p>
            </>
          )}
          {activePanel === 'power' && (
            <>
              <p>
                <strong>Power Distribution:</strong>
                <Formula tex="P_c = \\frac{A_c^2}{2}, \\quad P_s = \\frac{(a A_c)^2}{4}" block />
              </p>
              <p>
                <strong>Modulation Efficiency:</strong>
                <Formula tex="\\eta = \\frac{P_s}{P_c + P_s}" block />
              </p>
            </>
          )}
          {activePanel === 'demod' && (
            <>
              <p>
                <strong>{t('analog.demod.method.coherent')}:</strong>
                <Formula tex="\\mathrm{LPF}\\{u(t)\\cos 2\\pi f_c t\\} \\propto \\tfrac{1}{2} m(t)" block />
              </p>
              <p>
                <strong>{t('analog.demod.method.envelope')}:</strong>
                <Formula tex="v(t) \\propto A_c[1 + a\\,m_n(t)], \\quad a \\le 1" block />
              </p>
              <p>
                <strong>{t('analog.demod.method.pll')}:</strong>
                <Formula tex="\\dot{\\hat{\\theta}}(t) = 2\\pi f_c + G\\,e(t)" block />
              </p>
            </>
          )}
          {activePanel === 'super' && (
            <>
              <p>
                <strong>{t('analog.super.title')}:</strong>
                <Formula tex="f_{LO} = f_c + f_{IF}" block />
              </p>
              <p>
                <strong>{t('analog.super.image')}:</strong>
                <Formula tex="f_{image} = f_c + 2 f_{IF}" block />
              </p>
            </>
          )}
        </TheoryBox>
      </div>
    </div>
  );
}
