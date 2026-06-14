import { Panel, Slider } from '@/components';
import { t } from '@/i18n';
import type { MimoParams } from './mimo-model';

interface Props {
  params: MimoParams;
  set: (patch: Partial<MimoParams>) => void;
}

export function MimoControls({ params, set }: Props) {
  return (
    <Panel title={t('wl.mimo.title')}>
      <Slider label={t('wl.mimo.nt')} min={1} max={4} step={1} value={params.nt} onChange={(v) => set({ nt: v })} />
      <Slider label={t('wl.mimo.nr')} min={1} max={4} step={1} value={params.nr} onChange={(v) => set({ nr: v })} />
      <Slider label={t('wl.mimo.trials')} min={50} max={800} step={50} value={params.trials} onChange={(v) => set({ trials: v })} />
      <Slider label={t('wl.mimo.seed')} min={1} max={9999} step={1} value={params.seed} onChange={(v) => set({ seed: v })} />
    </Panel>
  );
}
