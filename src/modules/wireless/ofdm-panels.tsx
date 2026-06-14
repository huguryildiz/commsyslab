import { Panel, Slider, Select } from '@/components';
import { t } from '@/i18n';
import type { OfdmParams } from './ofdm-model';

interface Props {
  params: OfdmParams;
  set: (patch: Partial<OfdmParams>) => void;
}

const N_OPTIONS = [
  { value: '16', label: '16' },
  { value: '32', label: '32' },
  { value: '64', label: '64' },
];

export function OfdmControls({ params, set }: Props) {
  return (
    <Panel title={t('wl.ofdm.title')}>
      <Select
        label={t('wl.ofdm.subcarriers')}
        value={String(params.numSubcarriers)}
        options={N_OPTIONS}
        onChange={(v) => set({ numSubcarriers: Number(v) })}
      />
      <Slider
        label={t('wl.ofdm.cp')}
        min={0}
        max={16}
        step={1}
        value={params.cpLength}
        onChange={(v) => set({ cpLength: v })}
      />
      <Slider
        label={t('wl.ofdm.taps')}
        min={1}
        max={8}
        step={1}
        value={params.channelTaps}
        onChange={(v) => set({ channelTaps: v })}
      />
      <Slider
        label={t('wl.ofdm.ebN0')}
        min={0}
        max={40}
        step={1}
        value={params.ebN0Db}
        onChange={(v) => set({ ebN0Db: v })}
      />
    </Panel>
  );
}
