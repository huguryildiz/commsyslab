import { Panel, Slider, Select } from '@/components';
import { t } from '@/i18n';
import type { PnParams } from './pn-model';

interface Props {
  params: PnParams;
  set: (patch: Partial<PnParams>) => void;
  reset: () => void;
}

const N_OPTIONS = [
  { value: '5', label: '5 (N=31)' },
  { value: '6', label: '6 (N=63)' },
  { value: '7', label: '7 (N=127)' },
];

export function PnControls({ params, set, reset }: Props) {
  const maxShift = (1 << params.n) - 2;
  return (
    <Panel title={t('wl.pn.title')}>
      <Select
        label={t('wl.pn.n')}
        value={String(params.n)}
        options={N_OPTIONS}
        onChange={(v) => set({ n: Number(v), goldShift: 1 })}
      />
      <Slider
        label={t('wl.pn.goldShift')}
        min={1}
        max={maxShift}
        step={1}
        value={Math.min(params.goldShift, maxShift)}
        onChange={(v) => set({ goldShift: v })}
      />
      <button type="button" onClick={reset}>
        {t('wl.reset')}
      </button>
    </Panel>
  );
}
