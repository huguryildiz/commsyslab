import { Panel, Slider } from '@/components';
import { t } from '@/i18n';
import type { FhssParams } from './fhss-model';

interface Props {
  params: FhssParams;
  set: (patch: Partial<FhssParams>) => void;
  reset: () => void;
}

export function FhssControls({ params, set, reset }: Props) {
  return (
    <Panel title={t('wl.fhss.title')}>
      <Slider label={t('wl.fhss.channels')} min={4} max={128} step={4} value={params.nHopChannels} onChange={(v) => set({ nHopChannels: v })} />
      <Slider label={t('wl.fhss.hops')} min={10} max={80} step={5} value={params.nHops} onChange={(v) => set({ nHops: v })} />
      <Slider label={t('wl.fhss.beta')} min={0.02} max={1} step={0.02} value={params.beta} onChange={(v) => set({ beta: v })} />
      <Slider label={t('wl.fhss.ebn0j')} min={0} max={30} step={1} value={params.ebN0JDb} unit="dB" onChange={(v) => set({ ebN0JDb: v })} />
      <Slider label={t('wl.fhss.hopsPerBit')} min={1} max={4} step={1} value={params.hopsPerBit} onChange={(v) => set({ hopsPerBit: v })} />
      <Slider label={t('wl.fhss.seed')} min={1} max={9999} step={1} value={params.seed} onChange={(v) => set({ seed: v })} />
      <button type="button" onClick={reset}>
        {t('wl.reset')}
      </button>
    </Panel>
  );
}
