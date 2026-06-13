import { Panel, Slider } from '@/components';
import { t } from '@/i18n';
import type { ScenarioParams } from './model';

interface Props {
  params: ScenarioParams;
  set: (patch: Partial<ScenarioParams>) => void;
}

export function ScenarioControls({ params, set }: Props) {
  return (
    <Panel title={t('wl.gen.title')}>
      <Slider
        label={t('wl.gen.nTaps')}
        min={1}
        max={12}
        step={1}
        value={params.nTaps}
        onChange={(v) => set({ nTaps: v })}
      />
      <Slider
        label={t('wl.gen.tauRms')}
        min={0.2}
        max={5}
        step={0.1}
        value={params.tauRmsUs}
        onChange={(v) => set({ tauRmsUs: v })}
      />
      <Slider
        label={t('wl.gen.tapSpacing')}
        min={0.1}
        max={2}
        step={0.1}
        value={params.tapSpacingUs}
        onChange={(v) => set({ tapSpacingUs: v })}
      />
      <Slider
        label={t('wl.gen.K')}
        min={0}
        max={10}
        step={0.5}
        value={params.K}
        onChange={(v) => set({ K: v })}
      />
      <Slider
        label={t('wl.gen.fD')}
        min={0}
        max={300}
        step={5}
        value={params.fD}
        onChange={(v) => set({ fD: v })}
      />
    </Panel>
  );
}
