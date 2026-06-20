import { Panel, Slider } from '@/components';
import { t } from '@/i18n';
import type { CdmaParams } from './cdma-model';

interface Props {
  params: CdmaParams;
  set: (patch: Partial<CdmaParams>) => void;
  reset: () => void;
}

export function CdmaControls({ params, set, reset }: Props) {
  return (
    <Panel title={t('wl.cdma.title')}>
      <Slider label={t('wl.cdma.gain')} min={15} max={255} step={8} value={params.processingGain} onChange={(v) => set({ processingGain: v })} />
      <Slider label={t('wl.cdma.users')} min={1} max={80} step={1} value={params.nUsers} onChange={(v) => set({ nUsers: v })} />
      <Slider label={t('wl.cdma.ebn0')} min={0} max={20} step={1} value={params.ebN0Db} unit="dB" onChange={(v) => set({ ebN0Db: v })} />
      <Slider label={t('wl.cdma.nearfar')} min={0} max={15} step={1} value={params.nearFarDb} unit="dB" onChange={(v) => set({ nearFarDb: v })} />
      <button type="button" onClick={reset}>
        {t('wl.reset')}
      </button>
    </Panel>
  );
}
