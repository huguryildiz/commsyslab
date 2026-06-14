import { useState } from 'react';
import {
  Panel,
  Slider,
  Segmented,
  Select,
  Readout,
  TheoryBox,
  Formula,
  TransportControls,
} from '@/components';
import { t } from '@/i18n';
import type { AmMode } from '@/lib/dsp/analog';
import { buildAnalogAmView, buildAnalogPowerView, type AnalogAmParams } from '../model';
import { AmModulatorPanel } from '../panels';
import type { SectionProps } from './types';

type Scheme = 'dsb' | 'conventional' | 'ssb' | 'vsb';
type SsbSide = 'usb' | 'lsb';

export function AmSchemesSection({ clock, loop }: SectionProps) {
  const [scheme, setScheme] = useState<Scheme>('conventional');
  const [ssbSide, setSsbSide] = useState<SsbSide>('usb');
  const [msgFreq, setMsgFreq] = useState(1000);
  const [carrierFreq, setCarrierFreq] = useState(20000);
  const [carrierAmp, setCarrierAmp] = useState(1);
  const [modIndex, setModIndex] = useState(0.5);

  // Map the friendly scheme selector to the DSP AmMode enum.
  const mode: AmMode =
    scheme === 'ssb' ? (ssbSide === 'usb' ? 'ssb-usb' : 'ssb-lsb') : (scheme as AmMode);

  const amParams: AnalogAmParams = {
    mode,
    messageFreq: msgFreq,
    carrierFreq,
    carrierAmp,
    modIndex,
  };
  const amView = buildAnalogAmView(amParams, clock);
  const powerView = buildAnalogPowerView({ amParams });

  const showPower = scheme === 'conventional';

  return (
    <div className="module-layout">
      <aside className="analog__controls">
        <Panel title={t('analog.animation')}>
          <TransportControls loop={loop} />
        </Panel>
        <Panel title={t('analog.am.scheme')}>
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
            label={t('analog.am.messageFreq')}
            value={msgFreq}
            min={100}
            max={5000}
            step={100}
            unit="Hz"
            onChange={setMsgFreq}
          />
          <Slider
            label={t('analog.am.carrierFreq')}
            value={carrierFreq}
            min={5000}
            max={50000}
            step={1000}
            unit="Hz"
            onChange={setCarrierFreq}
          />
          <Slider
            label={t('analog.am.carrierAmp')}
            value={carrierAmp}
            min={0.1}
            max={3}
            step={0.1}
            unit="V"
            onChange={setCarrierAmp}
          />
          {(scheme === 'conventional' || scheme === 'dsb') && (
            <Slider
              label={t('analog.am.modIndex')}
              value={modIndex}
              min={0}
              max={2}
              step={0.05}
              onChange={setModIndex}
            />
          )}
        </Panel>
      </aside>

      <div className="analog__content">
        <div className="analog__readouts">
          <Readout
            label={t('analog.readout.bandwidth')}
            value={(scheme === 'ssb' ? msgFreq : 2 * msgFreq).toFixed(0)}
            unit="Hz"
          />
          {showPower && (
            <>
              <Readout label={t('analog.am.modIndex')} value={modIndex.toFixed(2)} />
              <Readout
                label={t('analog.power.carrierPower')}
                value={powerView.carrierPower.toFixed(3)}
              />
              <Readout
                label={t('analog.power.sidebandPower')}
                value={powerView.sidebandPower.toFixed(3)}
              />
              <Readout
                label={t('analog.readout.efficiency')}
                value={`${(powerView.efficiency * 100).toFixed(1)}%`}
              />
            </>
          )}
        </div>

        <div className="analog__plots">
          <Panel title={t('analog.am.title')}>
            <AmModulatorPanel view={amView} />
          </Panel>
        </div>

        <TheoryBox title={t('analog.theory.title')}>
          <p className="analog__hint">{t('analog.am.observe')}</p>
          {scheme === 'dsb' && (
            <p>
              <strong>{t('analog.am.scheme.dsb')}:</strong>
              <Formula tex="u(t) = m(t)\\cos(2\\pi f_c t)" block />
            </p>
          )}
          {scheme === 'conventional' && (
            <>
              <p>
                <strong>{t('analog.am.scheme.conventional')}:</strong>
                <Formula tex="u(t) = A_c[1 + a\\,m_n(t)]\\cos(2\\pi f_c t)" block />
              </p>
              <p>
                <strong>{t('analog.theory.efficiency')}:</strong>
                <Formula tex="\\eta = \\frac{a^2 P_{m_n}}{1 + a^2 P_{m_n}}" block />
              </p>
            </>
          )}
          {scheme === 'ssb' && (
            <p>
              <strong>{t('analog.am.scheme.ssb')}:</strong>
              <Formula
                tex="u(t) = A_c[m_n(t)\\cos(2\\pi f_c t) \\mp \\hat{m}_n(t)\\sin(2\\pi f_c t)]"
                block
              />
            </p>
          )}
          {scheme === 'vsb' && (
            <p>
              <strong>{t('analog.am.scheme.vsb')}:</strong>
              <Formula tex="U_{VSB}(f) = U_{DSB}(f)\\,H_{VSB}(f), \\quad H(f_c+\\delta)+H(f_c-\\delta)=1" block />
            </p>
          )}
        </TheoryBox>
      </div>
    </div>
  );
}
