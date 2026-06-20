// src/modules/baseband/PowerSpectrumSection.tsx — §10.2 power spectrum of digital signals.
import { useState, useMemo } from 'react';
import { Panel, Select, Slider, Toggle, InfoCard, HintText, TheoryBox, Formula } from '@/components';
import { t } from '@/i18n';
import { buildPsdView, type PsdParams } from './model';
import { SvPanel, SaPanel } from './panels';

type Gt = 'nrz' | 'rc';
type Symbols = 'iid' | 'corr';

export function PowerSpectrumSection() {
  const [gt, setGt] = useState<Gt>('nrz');
  const [symbols, setSymbols] = useState<Symbols>('iid');
  const [zeroMean, setZeroMean] = useState(true);
  const [alpha, setAlpha] = useState(0.35);
  const [resetKey, setResetKey] = useState(0);

  const view = useMemo(() => {
    const params: PsdParams = { gt, symbols, zeroMean, alpha };
    return buildPsdView(params);
  }, [gt, symbols, zeroMean, alpha]);

  const reset = () => {
    setGt('nrz');
    setSymbols('iid');
    setZeroMean(true);
    setAlpha(0.35);
    setResetKey((k) => k + 1);
  };

  return (
    <div className="module-layout">
      <aside className="baseband__controls">
        <Panel title={t('baseband.tab.psd')}>
          <Select
            label={t('baseband.psd.gt')}
            value={gt}
            options={[
              { value: 'nrz', label: t('baseband.psd.nrz') },
              { value: 'rc', label: t('baseband.psd.rc') },
            ]}
            onChange={(v) => setGt(v as Gt)}
          />
          {gt === 'rc' && (
            <Slider label={t('baseband.pulse.alpha')} value={alpha} min={0} max={1} step={0.05} onChange={setAlpha} />
          )}
          <Select
            label={t('baseband.psd.symbols')}
            value={symbols}
            options={[
              { value: 'iid', label: t('baseband.psd.iid') },
              { value: 'corr', label: t('baseband.psd.corr') },
            ]}
            onChange={(v) => setSymbols(v as Symbols)}
          />
          <Toggle label={t('baseband.psd.zeroMean')} checked={zeroMean} onChange={setZeroMean} />
          <button type="button" onClick={reset}>
            {t('baseband.reset')}
          </button>
        </Panel>
      </aside>

      <div className="baseband__content">
        <Panel title={t('baseband.psd.panel.sv')}>
          <SvPanel key={resetKey} view={view} />
        </Panel>
        <Panel title={t('baseband.psd.panel.sa')}>
          <SaPanel key={`${resetKey}-sa`} view={view} />
        </Panel>

        <div className="info-cards">
          <InfoCard title={t('baseband.psd.card.parts.title')} accent="green">
            <p>
              <HintText text={t('baseband.psd.card.parts.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('baseband.psd.card.shape.title')} accent="orange">
            <p>
              <HintText text={t('baseband.psd.card.shape.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('baseband.psd.card.lines.title')} accent="blue">
            <p>
              <HintText text={t('baseband.psd.card.lines.body')} />
            </p>
          </InfoCard>
        </div>

        <TheoryBox title={t('baseband.psd.theory')}>
          <p>
            <Formula tex="S_v(f)=\frac{1}{T}\,S_a(f)\,|G_T(f)|^2" block />
          </p>
          <p>
            <Formula
              tex="S_v(f)=\frac{\sigma_a^2}{T}|G_T(f)|^2+\frac{m_a^2}{T^2}\sum_m \left|G_T\!\left(\tfrac{m}{T}\right)\right|^2\delta\!\left(f-\tfrac{m}{T}\right)"
              block
            />
          </p>
          <p>
            <Formula tex="m_a=0\ \Rightarrow\ \text{no discrete spectral lines}" />
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}
