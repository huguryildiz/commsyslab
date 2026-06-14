import { useMemo, useState } from 'react';
import { Panel, Slider, Segmented, Readout, TheoryBox, Formula, TransportControls } from '@/components';
import { t } from '@/i18n';
import { buildFdmView, buildQamView } from '../model';
import { FdmPanel, QamPanel } from '../panels';
import type { SectionProps } from './types';

type MuxKind = 'fdm' | 'qam';

export function MultiplexingSection({ loop }: SectionProps) {
  const [kind, setKind] = useState<MuxKind>('fdm');
  const [spacing, setSpacing] = useState(20000);
  const [bandwidth, setBandwidth] = useState(3000);
  const [selected, setSelected] = useState(0);
  const [phaseErrorDeg, setPhaseErrorDeg] = useState(0);

  const fdmView = useMemo(
    () => buildFdmView({ messageFreqs: [1000, 1500, 2000], spacing, bandwidth, selected }),
    [spacing, bandwidth, selected],
  );
  const qamView = useMemo(
    () => buildQamView({ m1Freq: 1000, m2Freq: 2000, carrierFreq: 20000, phaseErrorDeg }),
    [phaseErrorDeg],
  );

  return (
    <div className="module-layout">
      <aside className="analog__controls">
        <Panel title={t('analog.animation')}>
          <TransportControls loop={loop} />
        </Panel>
        <Panel title={t('analog.tab.mux')}>
          <Segmented<MuxKind>
            ariaLabel={t('analog.mux.kind')}
            value={kind}
            options={[
              { value: 'fdm', label: t('analog.mux.kind.fdm') },
              { value: 'qam', label: t('analog.mux.kind.qam') },
            ]}
            onChange={setKind}
          />
          {kind === 'fdm' && (
            <>
              <Slider label={t('analog.mux.fdm.spacing')} value={spacing} min={4000} max={30000} step={1000} unit="Hz" onChange={setSpacing} />
              <Slider label={t('analog.mux.fdm.bandwidth')} value={bandwidth} min={1000} max={6000} step={500} unit="Hz" onChange={setBandwidth} />
              <Slider label={t('analog.mux.fdm.channel')} value={selected} min={0} max={2} step={1} onChange={setSelected} />
            </>
          )}
          {kind === 'qam' && (
            <Slider label={t('analog.mux.qam.phase')} value={phaseErrorDeg} min={0} max={90} step={5} unit="°" onChange={setPhaseErrorDeg} />
          )}
        </Panel>
      </aside>

      <div className="analog__content">
        {kind === 'fdm' && (
          <>
            <div className="analog__readouts">
              <Readout
                label={t('analog.mux.kind.fdm')}
                value={t(fdmView.overlap ? 'analog.mux.fdm.overlap' : 'analog.mux.fdm.ok')}
                tone={fdmView.overlap ? 'err' : 'ok'}
              />
            </div>
            <Panel title={t('analog.tab.mux')}>
              <FdmPanel view={fdmView} />
            </Panel>
            <TheoryBox title={t('analog.theory.title')}>
              <p className="analog__hint">{t('analog.mux.observe.fdm')}</p>
              <Formula tex="\\text{separation} \\ge 2W \\ (\\text{DSB}), \\quad \\ge W \\ (\\text{SSB})" block />
            </TheoryBox>
          </>
        )}
        {kind === 'qam' && (
          <>
            <div className="analog__readouts">
              <Readout label={t('analog.mux.qam.crosstalk')} value={`${qamView.crosstalkDb.toFixed(1)} dB`} tone={qamView.crosstalkDb > -15 ? 'err' : 'ok'} />
              <Readout label={t('analog.mux.qam.phase')} value={`${phaseErrorDeg}°`} />
            </div>
            <Panel title={t('analog.tab.mux')}>
              <QamPanel view={qamView} />
            </Panel>
            <TheoryBox title={t('analog.theory.title')}>
              <p className="analog__hint">{t('analog.mux.observe.qam')}</p>
              <Formula tex="u(t) = A_c m_1(t)\\cos(2\\pi f_c t) + A_c m_2(t)\\sin(2\\pi f_c t)" block />
            </TheoryBox>
          </>
        )}
      </div>
    </div>
  );
}
