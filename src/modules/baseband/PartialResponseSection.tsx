// src/modules/baseband/PartialResponseSection.tsx — §10.3.2 partial-response signaling.
import { useState, useMemo } from 'react';
import { Panel, Select, Slider, InfoCard, HintText, TheoryBox, Formula } from '@/components';
import { t } from '@/i18n';
import { buildPartialResponseView, type PartialResponseParams } from './model';
import { PrPulsePanel, PrSpectrumPanel } from './panels';

type PrKind = 'duo' | 'mod';

export function PartialResponseSection() {
  const [kind, setKind] = useState<PrKind>('duo');
  const [span, setSpan] = useState(5);
  const [resetKey, setResetKey] = useState(0);

  const view = useMemo(() => {
    const params: PartialResponseParams = { kind, span };
    return buildPartialResponseView(params);
  }, [kind, span]);

  const reset = () => {
    setKind('duo');
    setSpan(5);
    setResetKey((k) => k + 1);
  };

  return (
    <div className="module-layout">
      <aside className="baseband__controls">
        <Panel title={t('baseband.tab.pr')}>
          <Select
            label={t('baseband.pr.kind')}
            value={kind}
            options={[
              { value: 'duo', label: t('baseband.pr.duo') },
              { value: 'mod', label: t('baseband.pr.mod') },
            ]}
            onChange={(v) => setKind(v as PrKind)}
          />
          <Slider label={t('baseband.pr.span')} value={span} min={3} max={8} step={1} onChange={setSpan} />
          <button type="button" onClick={reset}>
            {t('baseband.reset')}
          </button>
        </Panel>
      </aside>

      <div className="baseband__content">
        <Panel title={t('baseband.pr.panel.pulse')}>
          <PrPulsePanel key={resetKey} view={view} />
        </Panel>
        <Panel title={t('baseband.pr.panel.spectrum')}>
          <PrSpectrumPanel key={resetKey} view={view} />
        </Panel>

        <div className="info-cards">
          <InfoCard title={t('baseband.pr.card.rate.title')} accent="green">
            <p>
              <HintText text={t('baseband.pr.card.rate.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('baseband.pr.card.duo.title')} accent="orange">
            <p>
              <HintText text={t('baseband.pr.card.duo.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('baseband.pr.card.mod.title')} accent="blue">
            <p>
              <HintText text={t('baseband.pr.card.mod.body')} />
            </p>
          </InfoCard>
        </div>

        <TheoryBox title={t('baseband.pr.theory')}>
          <p>
            <Formula tex="x(t)=\operatorname{sinc}(2Wt)+\operatorname{sinc}(2Wt-1)\quad(\text{duobinary})" block />
          </p>
          <p>
            <Formula tex="|X(f)|=\tfrac{1}{W}\cos\!\left(\tfrac{\pi f}{2W}\right),\quad |f|<W" block />
          </p>
          <p>
            <Formula tex="x(t)=\operatorname{sinc}\!\tfrac{t+T}{T}-\operatorname{sinc}\!\tfrac{t-T}{T}\quad(\text{modified duobinary})" block />
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}
