import { useMemo, useState } from 'react';
import { Panel, Slider, Select, Segmented, Readout, TheoryBox, Formula, TransportControls } from '@/components';
import { t } from '@/i18n';
import type { AmMode } from '@/lib/dsp/analog';
import {
  buildAnalogDemodView,
  buildModulatorView,
  type AnalogAmParams,
  type AnalogDemodParams,
  type ModulatorKind,
} from '../model';
import { DemodulationPanel, ModulatorSpectrumPanel } from '../panels';
import { ModulatorBlockDiagram, ModulatorCircuit, EnvelopeDetectorCircuit } from '../circuits';
import type { SectionProps } from './types';
import '@/lib/plot/schematic.css';

type Group = 'modulator' | 'demodulator';
type DemodMethod = AnalogDemodParams['method'];

/** Map a modulator kind to the camelCase suffix used by its observe-hint i18n key. */
function modKindCamel(kind: ModulatorKind): string {
  return kind === 'power-law' ? 'powerLaw' : kind;
}

export function ModDemodSection({ clock, loop }: SectionProps) {
  const [group, setGroup] = useState<Group>('modulator');
  const [modKind, setModKind] = useState<ModulatorKind>('switching');
  const [demodMethod, setDemodMethod] = useState<DemodMethod>('envelope');
  const [msgFreq, setMsgFreq] = useState(1000);
  const [carrierFreq, setCarrierFreq] = useState(20000);
  const [modIndex, setModIndex] = useState(0.5);

  // Slow conduction phase (toggles ~1 Hz) so diodes visibly switch.
  const phase: 0 | 1 = Math.floor(clock * 2) % 2 === 0 ? 0 : 1;

  // The modulator view runs 4 FFTs and does not depend on the clock, so memoize
  // it on the control values — otherwise it recomputes on every animation tick.
  const modView = useMemo(
    () => buildModulatorView({ modulator: modKind, messageFreq: msgFreq, carrierFreq, carrierAmp: 1 }),
    [modKind, msgFreq, carrierFreq],
  );

  const amParams: AnalogAmParams = {
    mode: 'conventional' as AmMode,
    messageFreq: msgFreq,
    carrierFreq,
    carrierAmp: 1,
    modIndex,
  };
  const demodView = buildAnalogDemodView({ method: demodMethod, amParams }, clock);

  return (
    <div className="module-layout">
      <aside className="analog__controls">
        <Panel title={t('analog.animation')}>
          <TransportControls loop={loop} />
        </Panel>
        <Panel title={t('analog.tab.modimpl')}>
          <Segmented<Group>
            ariaLabel={t('analog.tab.modimpl')}
            value={group}
            options={[
              { value: 'modulator', label: t('analog.mod.group') },
              { value: 'demodulator', label: t('analog.demod.group') },
            ]}
            onChange={setGroup}
          />
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
          <Slider label={t('analog.am.messageFreq')} value={msgFreq} min={100} max={5000} step={100} unit="Hz" onChange={setMsgFreq} />
          <Slider label={t('analog.am.carrierFreq')} value={carrierFreq} min={5000} max={50000} step={1000} unit="Hz" onChange={setCarrierFreq} />
          {group === 'demodulator' && (
            <Slider label={t('analog.am.modIndex')} value={modIndex} min={0} max={2} step={0.05} onChange={setModIndex} />
          )}
        </Panel>
      </aside>

      <div className="analog__content">
        {group === 'modulator' && (
          <>
            <div className="analog__readouts">
              <Readout label={t('analog.mod.kind')} value={t(`analog.mod.kind.${modKind}`)} />
              <Readout
                label={t('analog.mod.outputType')}
                value={t(modView.producesDsb ? 'analog.mod.producesDsb' : 'analog.mod.producesConv')}
                tone={modView.producesDsb ? 'warn' : 'ok'}
              />
            </div>
            <div className="analog__plots">
              <Panel title={t('analog.mod.block')}>
                <ModulatorBlockDiagram kind={modKind} />
              </Panel>
              <Panel title={t('analog.mod.circuit')}>
                <ModulatorCircuit kind={modKind} phase={phase} />
              </Panel>
            </div>
            <Panel title={`${t('analog.mod.dirty')} / ${t('analog.mod.clean')}`}>
              <ModulatorSpectrumPanel view={modView} />
            </Panel>
            <TheoryBox title={t('analog.theory.title')}>
              <p className="analog__hint">{t(`analog.mod.observe.${modKindCamel(modKind)}`)}</p>
              {modView.producesDsb ? (
                <Formula tex="u(t) = 2 A_c\\, m(t)\\cos(2\\pi f_c t)" block />
              ) : (
                <Formula tex="u(t) = A_c[1 + k\\, m(t)]\\cos(2\\pi f_c t)" block />
              )}
            </TheoryBox>
          </>
        )}

        {group === 'demodulator' && (
          <>
            <div className="analog__readouts">
              <Readout label={t('analog.demod.method')} value={t(`analog.demod.method.${demodMethod}`)} />
              <Readout
                label={t('analog.demod.fidelity')}
                value={t(demodView.faithful ? 'analog.demod.faithful' : 'analog.demod.distorted')}
                tone={demodView.faithful ? 'ok' : 'err'}
              />
            </div>
            {demodMethod === 'envelope' && (
              <div className="analog__plots">
                <Panel title={t('analog.mod.circuit')}>
                  <EnvelopeDetectorCircuit phase={phase} />
                </Panel>
              </div>
            )}
            <Panel title={t('analog.demod.title')}>
              <DemodulationPanel view={demodView} />
            </Panel>
            <TheoryBox title={t('analog.theory.title')}>
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
            </TheoryBox>
          </>
        )}
      </div>
    </div>
  );
}
