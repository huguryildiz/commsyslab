import { Panel, Slider } from '@/components';
import { t } from '@/i18n';
import type { RakeParams } from './rake-model';

interface Props {
  params: RakeParams;
  set: (patch: Partial<RakeParams>) => void;
}

export function RakeControls({ params, set }: Props) {
  return (
    <Panel title={t('wl.rake.title')}>
      <Slider label={t('wl.rake.nTaps')} min={1} max={12} step={1} value={params.nTaps} onChange={(v) => set({ nTaps: v })} />
      <Slider label={t('wl.rake.tauRms')} min={50} max={2000} step={50} value={params.tauRmsNs} onChange={(v) => set({ tauRmsNs: v })} />
      <Slider label={t('wl.rake.tapSpacing')} min={50} max={1000} step={50} value={params.tapSpacingNs} onChange={(v) => set({ tapSpacingNs: v })} />
      <Slider label={t('wl.rake.chipRate')} min={0.5} max={10} step={0.5} value={params.chipRateMcps} onChange={(v) => set({ chipRateMcps: v })} />
      <Slider label={t('wl.rake.ebN0')} min={0} max={30} step={1} value={params.ebN0Db} onChange={(v) => set({ ebN0Db: v })} />
    </Panel>
  );
}
