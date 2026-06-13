import { useState, useMemo } from 'react';
import { Panel, Select, Slider, Readout, TheoryBox, Formula } from '@/components';
import { t } from '@/i18n';
import { buildEyeView, type EyeParams, type EqualizerKind } from './model';
import { EyePanel, TapStemPanel, CombinedPanel } from './panels';

export function EyeEqualizationSection() {
  const [M, setM] = useState<2 | 4>(2);
  const [c1, setC1] = useState(0.5);
  const [equalizer, setEqualizer] = useState<EqualizerKind>('off');
  const [nTaps, setNTaps] = useState(6);
  const [noiseVar, setNoiseVar] = useState(0.05);
  const view = useMemo(() => {
    const params: EyeParams = { M, channel: [1, c1], equalizer, nTaps, noiseVar, sps: 16 };
    return buildEyeView(params);
  }, [M, c1, equalizer, nTaps, noiseVar]);

  return (
    <div className="bb-section">
      <aside className="bb-controls">
        <Panel title={t('baseband.tab.eye')}>
          <Select
            label={t('baseband.eye.M')}
            value={String(M)}
            options={[
              { value: '2', label: '2-PAM' },
              { value: '4', label: '4-PAM' },
            ]}
            onChange={(v) => setM(Number(v) as 2 | 4)}
          />
          <Slider label={t('baseband.eye.channel')} value={c1} min={0} max={0.9} step={0.05} onChange={setC1} />
          <Select
            label={t('baseband.eye.equalizer')}
            value={equalizer}
            options={[
              { value: 'off', label: t('baseband.eq.off') },
              { value: 'zf', label: t('baseband.eq.zf') },
              { value: 'mmse', label: t('baseband.eq.mmse') },
            ]}
            onChange={(v) => setEqualizer(v as EqualizerKind)}
          />
          {equalizer !== 'off' && (
            <Slider label={t('baseband.eye.taps')} value={nTaps} min={3} max={12} step={1} onChange={setNTaps} />
          )}
          {equalizer === 'mmse' && (
            <Slider label={t('baseband.rx.n0')} value={noiseVar} min={0} max={0.5} step={0.01} onChange={setNoiseVar} />
          )}
        </Panel>
      </aside>
      <div className="bb-content">
        <div className="bb-readouts">
          <Readout label={t('baseband.readout.eyeHeight')} value={view.eyeHeightBefore.toFixed(2)} />
          <Readout
            label={`${t('baseband.readout.eyeHeight')} (eq)`}
            value={view.eyeHeightAfter.toFixed(2)}
            tone={view.eyeHeightAfter > view.eyeHeightBefore ? 'ok' : 'default'}
          />
          <Readout label={t('baseband.readout.residualIsi')} value={view.residualIsi.toFixed(4)} />
        </div>
        <Panel title={t('baseband.panel.eye')}>
          <EyePanel traces={view.tracesBefore} sps={view.sps} label="Eye diagram before equalization" />
        </Panel>
        {equalizer !== 'off' && (
          <Panel title={t('baseband.panel.eyeAfter')}>
            <EyePanel traces={view.tracesAfter} sps={view.sps} label="Eye diagram after equalization" />
          </Panel>
        )}
        <Panel title={t('baseband.panel.eqTaps')}>
          <TapStemPanel view={view} />
        </Panel>
        <Panel title={t('baseband.panel.combined')}>
          <CombinedPanel view={view} />
        </Panel>
        <TheoryBox title={t('baseband.theory.eye')}>
          <p><Formula tex="y_m=x_0 a_m+\sum_{n\neq m} a_n x_{m-n}+\nu_m\quad(\text{ISI})" block /></p>
          <p><Formula tex="W_{ZF}(z)=\frac{1}{H(z)}\qquad W_{MMSE}=\arg\min_w E|w*r-a|^2" block /></p>
        </TheoryBox>
      </div>
    </div>
  );
}
