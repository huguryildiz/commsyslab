import { Panel, Slider } from '@/components';
import { t } from '@/i18n';
import type { CpmParams } from './cpm-model';

interface Props {
  params: CpmParams;
  set: (patch: Partial<CpmParams>) => void;
}

export function CpmControls({ params, set }: Props) {
  return (
    <Panel title={t('wl.cpm.title')}>
      <Slider label={t('wl.cpm.h')} min={0.25} max={1} step={0.05} value={params.modIndexH} onChange={(v) => set({ modIndexH: v })} />
      <Slider label={t('wl.cpm.depth')} min={1} max={6} step={1} value={params.treeDepth} onChange={(v) => set({ treeDepth: v })} />
    </Panel>
  );
}
