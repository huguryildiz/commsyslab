import { Panel, Slider, Select } from '@/components';
import { t } from '@/i18n';
import type { SyncParams } from './sync-model';

interface Props {
  params: SyncParams;
  set: (patch: Partial<SyncParams>) => void;
  reset: () => void;
}

const N_OPTIONS = [
  { value: '5', label: '5 (N=31)' },
  { value: '6', label: '6 (N=63)' },
  { value: '7', label: '7 (N=127)' },
];

export function SyncControls({ params, set, reset }: Props) {
  return (
    <Panel title={t('wl.sync.title')}>
      <Select label={t('wl.pn.n')} value={String(params.n)} options={N_OPTIONS} onChange={(v) => set({ n: Number(v) })} />
      <Slider
        label={t('wl.sync.pd')}
        min={0.5}
        max={0.99}
        step={0.01}
        value={params.pd}
        onChange={(v) => set({ pd: v })}
      />
      <Slider
        label={t('wl.sync.pfa')}
        min={0.001}
        max={0.2}
        step={0.001}
        value={params.pfa}
        onChange={(v) => set({ pfa: v })}
      />
      <Slider
        label={t('wl.sync.delta')}
        min={0.25}
        max={1}
        step={0.05}
        value={params.delta}
        onChange={(v) => set({ delta: v })}
      />
      <button type="button" onClick={reset}>
        {t('wl.reset')}
      </button>
    </Panel>
  );
}
