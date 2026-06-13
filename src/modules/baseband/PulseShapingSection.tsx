// src/modules/baseband/PulseShapingSection.tsx
import { useState, useMemo } from 'react';
import { Panel, Select, Slider, Readout, TheoryBox, Formula } from '@/components';
import { t } from '@/i18n';
import { buildPulseView, type PulseParams } from './model';
import { PulseTimePanel, SpectrumPanel } from './panels';
import type { PulseKind } from '@/lib/dsp/pulse';

export function PulseShapingSection() {
  const [kind, setKind] = useState<PulseKind>('rc');
  const [alpha, setAlpha] = useState(0.35);
  const [sps, setSps] = useState(16);
  const view = useMemo(() => {
    const params: PulseParams = { kind, alpha, sps, span: 5 };
    return buildPulseView(params);
  }, [kind, alpha, sps]);

  return (
    <div className="bb-section">
      <aside className="bb-controls">
        <Panel title={t('baseband.pulse.kind')}>
          <Select
            label={t('baseband.pulse.kind')}
            value={kind}
            options={[
              { value: 'rc', label: t('baseband.pulse.rc') },
              { value: 'rrc', label: t('baseband.pulse.rrc') },
              { value: 'sinc', label: t('baseband.pulse.sinc') },
            ]}
            onChange={(v) => setKind(v as PulseKind)}
          />
          {kind !== 'sinc' && (
            <Slider label={t('baseband.pulse.alpha')} value={alpha} min={0} max={1} step={0.05} onChange={setAlpha} />
          )}
          <Slider label={t('baseband.pulse.sps')} value={sps} min={8} max={32} step={4} onChange={setSps} />
        </Panel>
      </aside>

      <div className="bb-content">
        <div className="bb-readouts">
          <Readout label={t('baseband.readout.bandwidth')} value={view.bandwidth.toFixed(3)} unit="1/T" />
          <Readout label={t('baseband.readout.excess')} value={view.excess.toFixed(2)} />
          <Readout label={t('baseband.readout.nyquist')} value={view.nyquist.toFixed(3)} unit="1/T" />
        </div>
        <Panel title={t('baseband.panel.pulseTime')}>
          <PulseTimePanel view={view} />
        </Panel>
        <Panel title={t('baseband.panel.spectrum')}>
          <SpectrumPanel view={view} />
        </Panel>
        <TheoryBox title={t('baseband.theory.pulse')}>
          <p><Formula tex="x(t)=\operatorname{sinc}\!\left(\tfrac{t}{T}\right)\frac{\cos(\pi\alpha t/T)}{1-(2\alpha t/T)^2}" block /></p>
          <p><Formula tex="\sum_{m=-\infty}^{\infty} X\!\left(f+\tfrac{m}{T}\right)=T\quad\Rightarrow\quad x(nT)=\delta[n]" block /></p>
          <p><Formula tex="W=\frac{1+\alpha}{2T}" /></p>
        </TheoryBox>
      </div>
    </div>
  );
}
