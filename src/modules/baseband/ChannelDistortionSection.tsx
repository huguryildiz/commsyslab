// src/modules/baseband/ChannelDistortionSection.tsx — §10.1.2/§10.5/§10.5.1.
import { useState, useMemo } from 'react';
import { Panel, Slider, InfoCard, HintText, TheoryBox, Formula } from '@/components';
import { t } from '@/i18n';
import { buildDistortionView, type DistortionParams } from './model';
import { ChannelPanel, EnvelopeDelayPanel, DistortedPulsePanel } from './panels';

export function ChannelDistortionSection() {
  const [ampDistort, setAmpDistort] = useState(0.4);
  const [phaseDistort, setPhaseDistort] = useState(2);
  const [alpha, setAlpha] = useState(0.35);
  const [resetKey, setResetKey] = useState(0);

  const view = useMemo(() => {
    const params: DistortionParams = { ampDistort, phaseDistort, alpha };
    return buildDistortionView(params);
  }, [ampDistort, phaseDistort, alpha]);

  const reset = () => {
    setAmpDistort(0.4);
    setPhaseDistort(2);
    setAlpha(0.35);
    setResetKey((k) => k + 1);
  };

  return (
    <div className="module-layout">
      <aside className="baseband__controls">
        <Panel title={t('baseband.tab.distortion')}>
          <Slider
            label={t('baseband.dist.amp')}
            value={ampDistort}
            min={0}
            max={0.9}
            step={0.05}
            onChange={setAmpDistort}
          />
          <Slider
            label={t('baseband.dist.phase')}
            value={phaseDistort}
            min={0}
            max={6}
            step={0.25}
            onChange={setPhaseDistort}
          />
          <Slider label={t('baseband.pulse.alpha')} value={alpha} min={0} max={1} step={0.05} onChange={setAlpha} />
          <button type="button" onClick={reset}>
            {t('baseband.reset')}
          </button>
        </Panel>
      </aside>

      <div className="baseband__content">
        <Panel title={t('baseband.dist.panel.channel')}>
          <ChannelPanel key={resetKey} view={view} />
        </Panel>
        <Panel title={t('baseband.dist.panel.delay')}>
          <EnvelopeDelayPanel key={`${resetKey}-tau`} view={view} />
        </Panel>
        <Panel title={t('baseband.dist.panel.pulse')}>
          <DistortedPulsePanel key={`${resetKey}-pulse`} view={view} />
        </Panel>

        <div className="info-cards">
          <InfoCard title={t('baseband.dist.card.types.title')} accent="green">
            <p>
              <HintText text={t('baseband.dist.card.types.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('baseband.dist.card.delay.title')} accent="orange">
            <p>
              <HintText text={t('baseband.dist.card.delay.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('baseband.dist.card.design.title')} accent="blue">
            <p>
              <HintText text={t('baseband.dist.card.design.body')} />
            </p>
          </InfoCard>
        </div>

        <TheoryBox title={t('baseband.dist.theory')}>
          <p>
            <Formula tex="\tau(f)=-\frac{1}{2\pi}\frac{d\theta_c(f)}{df}" block />
          </p>
          <p>
            <Formula tex="|G_T(f)|\,|C(f)|\,|G_R(f)|=X_{rc}(f)\quad(\text{zero ISI})" block />
          </p>
          <p>
            <Formula tex="|G_T(f)|=|G_R(f)|=\sqrt{\frac{X_{rc}(f)}{|C(f)|}}" />
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}
