import { Panel, Slider } from '@/components';
import { t } from '@/i18n';
import type { DopplerParams } from './doppler-model';

interface Props {
  params: DopplerParams;
  set: (patch: Partial<DopplerParams>) => void;
}

export function DopplerControls({ params, set }: Props) {
  return (
    <Panel title={t('wl.doppler.title')}>
      <Slider label={t('wl.doppler.speed')} min={1} max={300} step={1} value={params.speedKmh} unit="km/h" onChange={(v) => set({ speedKmh: v })} />
      <Slider label={t('wl.doppler.carrier')} min={0.1} max={6} step={0.1} value={params.carrierGHz} unit="GHz" onChange={(v) => set({ carrierGHz: v })} />
      <Slider label={t('wl.doppler.threshold')} min={-30} max={0} step={1} value={params.thresholdDb} unit="dB" onChange={(v) => set({ thresholdDb: v })} />
      <Slider label={t('wl.doppler.seed')} min={1} max={9999} step={1} value={params.seed} onChange={(v) => set({ seed: v })} />
    </Panel>
  );
}
