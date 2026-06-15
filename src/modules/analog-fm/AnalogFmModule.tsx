import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Panel,
  Slider,
  Select,
  Readout,
  TheoryBox,
  Formula,
  TransportControls,
} from '@/components';
import { t } from '@/i18n';
import { useSimulationLoop } from '@/lib/sim/useSimulationLoop';
import type { AngleMode } from '@/lib/dsp/analog';
import { buildAnalogFmView, buildAnalogDemodView, type AnalogFmParams } from './model';
import { FmModulatorPanel, FmDemodulationPanel } from './panels';
import './analog-fm.css';

type ActivePanel = 'fm' | 'demod';

export function AnalogFmModule() {
  const [fmMode, setFmMode] = useState<AngleMode>('fm');
  const [fmMsgFreq, setFmMsgFreq] = useState(1000); // Hz
  const [fmCarrierFreq, setFmCarrierFreq] = useState(20000); // Hz
  const [fmCarrierAmp, setFmCarrierAmp] = useState(1); // V
  const [fmModIndex, setFmModIndex] = useState(5); // β or kp

  const { tab: slug = '' } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const activePanel: ActivePanel = (slug as ActivePanel) || 'fm';

  const handlePanelChange = (v: string) => {
    navigate(v === 'fm' ? '/analog-fm' : `/analog-fm/${v}`, { replace: true });
  };

  const [clock, setClock] = useState(0);
  const loop = useSimulationLoop({
    ticksPerSecond: 30,
    onTick: (_dt, simTime) => setClock(simTime),
    onReset: () => setClock(0),
  });
  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) loop.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const fmView = useMemo(() => buildAnalogFmView(fmParams, clock), [fmParams, clock]);
  const demodView = useMemo(() => buildAnalogDemodView({ fmParams }, clock), [fmParams, clock]);

  return (
    <div className="module-layout">
      <aside className="analog__controls">
        <Panel title={t('analog.animation')}>
          <TransportControls loop={loop} />
        </Panel>
        <Panel title={t('nav.analogFm')}>
          <Select<ActivePanel>
            label={t('analog.fm.panel.select')}
            value={activePanel}
            onChange={handlePanelChange}
            options={[
              { value: 'fm', label: t('analog.fm.title') },
              { value: 'demod', label: t('analog.demod.title') },
            ]}
          />

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
        </Panel>
      </aside>

      <div className="analog__content">
        <div className="analog__readouts">
          {activePanel === 'fm' && (
            <>
              <Readout label={t('analog.fm.modIndex')} value={fmModIndex.toFixed(2)} />
              <Readout
                label={t('analog.fm.carson')}
                value={(fmView.carsonBw / 1000).toFixed(1)}
                unit="kHz"
              />
              <Readout label={t('analog.fm.sidebands')} value={fmView.sidebandFreqs.length} />
            </>
          )}
          {activePanel === 'demod' && (
            <Readout
              label={t('analog.demod.fidelity')}
              value={t(demodView.faithful ? 'analog.demod.faithful' : 'analog.demod.distorted')}
              tone={demodView.faithful ? 'ok' : 'err'}
            />
          )}
        </div>

        <div className="analog__plots">
          {activePanel === 'fm' && (
            <Panel title={t('analog.fm.title')}>
              <FmModulatorPanel view={fmView} />
            </Panel>
          )}
          {activePanel === 'demod' && (
            <Panel title={t('analog.demod.title')}>
              <FmDemodulationPanel view={demodView} />
            </Panel>
          )}
        </div>

        <TheoryBox title={t('analog.theory.title')}>
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
          {activePanel === 'demod' && (
            <p>
              <strong>{t('analog.demod.method.fmdiscrim')}:</strong>
              <Formula tex="y(t) \\propto f_i(t) - f_c \\propto m(t)" block />
            </p>
          )}
        </TheoryBox>
      </div>
    </div>
  );
}
