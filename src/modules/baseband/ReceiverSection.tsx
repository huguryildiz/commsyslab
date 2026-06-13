import { useState, useMemo } from 'react';
import { Panel, Slider, Toggle, Readout, TheoryBox, Formula } from '@/components';
import { t } from '@/i18n';
import { buildReceiverView, type ReceiverParams } from './model';
import { MatchedFilterPanel, MfOutputPanel, RrcSplitPanel } from './panels';

export function ReceiverSection() {
  const [alpha, setAlpha] = useState(0.35);
  const [noise, setNoise] = useState(false);
  const [n0, setN0] = useState(0.1);
  const view = useMemo(() => {
    const params: ReceiverParams = { alpha, sps: 16, span: 4, noise, n0 };
    return buildReceiverView(params);
  }, [alpha, noise, n0]);

  return (
    <div className="bb-section">
      <aside className="bb-controls">
        <Panel title={t('baseband.tab.receiver')}>
          <Slider label={t('baseband.pulse.alpha')} value={alpha} min={0} max={1} step={0.05} onChange={setAlpha} />
          <Toggle label={t('baseband.rx.noise')} checked={noise} onChange={setNoise} />
          {noise && <Slider label={t('baseband.rx.n0')} value={n0} min={0.01} max={1} step={0.01} onChange={setN0} />}
        </Panel>
      </aside>
      <div className="bb-content">
        <div className="bb-readouts">
          <Readout label={t('baseband.readout.energy')} value={view.energy.toFixed(3)} />
          <Readout label={t('baseband.readout.peakSnr')} value={view.peakSnr.toFixed(2)} />
          <Readout label={t('baseband.panel.correlator')} value={view.correlatorValue.toFixed(3)} />
        </div>
        <Panel title={t('baseband.panel.matchedFilter')}>
          <MatchedFilterPanel view={view} />
        </Panel>
        <Panel title={t('baseband.panel.mfOutput')}>
          <MfOutputPanel view={view} />
        </Panel>
        <Panel title={t('baseband.panel.rrcSplit')}>
          <RrcSplitPanel view={view} />
        </Panel>
        <TheoryBox title={t('baseband.theory.receiver')}>
          <p><Formula tex="h(t)=p(T-t)\qquad y(T)=\int r(t)\,p(t)\,dt=\textstyle\sum_n r_n p_n" block /></p>
          <p><Formula tex="\left(\tfrac{S}{N}\right)_{\max}=\frac{2E}{N_0}" /></p>
          <p><Formula tex="\sqrt{X_{rc}(f)}\cdot\sqrt{X_{rc}(f)}=X_{rc}(f)\ \Rightarrow\ \text{matched \& zero-ISI}" block /></p>
        </TheoryBox>
      </div>
    </div>
  );
}
