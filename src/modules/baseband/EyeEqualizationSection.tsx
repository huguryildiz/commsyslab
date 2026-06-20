// src/modules/baseband/EyeEqualizationSection.tsx
import { useState, useMemo } from 'react';
import { Panel, Select, Slider, Readout, InfoCard, HintText, TheoryBox, Formula } from '@/components';
import { t } from '@/i18n';
import { buildEyeView, type EyeParams, type EqualizerKind } from './model';
import { EyePanel, TapStemPanel, CombinedPanel } from './panels';

export function EyeEqualizationSection() {
  const [M, setM] = useState<2 | 4>(2);
  const [c1, setC1] = useState(0.5);
  const [equalizer, setEqualizer] = useState<EqualizerKind>('off');
  const [nTaps, setNTaps] = useState(6);
  const [noiseVar, setNoiseVar] = useState(0.05);
  const [resetKey, setResetKey] = useState(0);

  const view = useMemo(() => {
    const params: EyeParams = { M, channel: [1, c1], equalizer, nTaps, noiseVar, sps: 16 };
    return buildEyeView(params);
  }, [M, c1, equalizer, nTaps, noiseVar]);

  const reset = () => {
    setM(2);
    setC1(0.5);
    setEqualizer('off');
    setNTaps(6);
    setNoiseVar(0.05);
    setResetKey((k) => k + 1);
  };

  return (
    <div className="module-layout">
      <aside className="baseband__controls">
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
          <Slider
            label={t('baseband.eye.channel')}
            value={c1}
            min={0}
            max={0.9}
            step={0.05}
            onChange={setC1}
          />
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
          <Slider
            label={t('baseband.eye.noise')}
            value={noiseVar}
            min={0}
            max={0.5}
            step={0.01}
            onChange={setNoiseVar}
          />
          {equalizer !== 'off' && (
            <Slider
              label={t('baseband.eye.taps')}
              value={nTaps}
              min={3}
              max={12}
              step={1}
              onChange={setNTaps}
            />
          )}
          <button type="button" onClick={reset}>
            {t('baseband.reset')}
          </button>
        </Panel>
      </aside>

      <div className="baseband__content">
        <div className="baseband__readouts">
          <Readout label={t('baseband.readout.eyeHeight')} value={view.eyeHeightBefore.toFixed(2)} />
          <Readout
            label={`${t('baseband.readout.eyeHeight')} (eq)`}
            value={view.eyeHeightAfter.toFixed(2)}
            tone={view.eyeHeightAfter > view.eyeHeightBefore ? 'ok' : 'default'}
          />
          <Readout label={t('baseband.readout.residualIsi')} value={view.residualIsi.toFixed(4)} />
        </div>
        <Panel title={t('baseband.panel.eye')}>
          <EyePanel key={resetKey} traces={view.tracesBefore} sps={view.sps} label="Eye diagram before equalization" />
        </Panel>
        {equalizer !== 'off' && (
          <Panel title={t('baseband.panel.eyeAfter')}>
            <EyePanel key={`${resetKey}-eq`} traces={view.tracesAfter} sps={view.sps} label="Eye diagram after equalization" />
          </Panel>
        )}
        <Panel title={t('baseband.panel.eqTaps')}>
          <TapStemPanel key={resetKey} view={view} />
        </Panel>
        <Panel title={t('baseband.panel.combined')}>
          <CombinedPanel key={resetKey} view={view} />
        </Panel>

        <div className="info-cards">
          <InfoCard title={t('baseband.card.isi.title')} accent="green">
            <p>
              <HintText text={t('baseband.card.isi.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('baseband.card.zf.title')} accent="orange">
            <p>
              <HintText text={t('baseband.card.zf.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('baseband.card.mmse.title')} accent="blue">
            <p>
              <HintText text={t('baseband.card.mmse.body')} />
            </p>
          </InfoCard>
        </div>

        <TheoryBox title={t('baseband.theory.eye')}>
          <p>
            <Formula tex="y_m=x_0 a_m+\sum_{n\neq m} a_n x_{m-n}+\nu_m\quad(\text{ISI})" block />
          </p>
          <p>
            <Formula tex="W_{ZF}(z)=\frac{1}{H(z)}\qquad W_{MMSE}=\arg\min_w E|w*r-a|^2" block />
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}
