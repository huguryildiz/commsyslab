import { Panel, Slider } from '@/components';
import { t } from '@/i18n';
import type { MimoParams, MimoErrParams, AlamoutiParams } from './mimo-model';

interface Props {
  params: MimoParams;
  set: (patch: Partial<MimoParams>) => void;
  reset: () => void;
}

export function MimoControls({ params, set, reset }: Props) {
  return (
    <Panel title={t('wl.mimo.title')}>
      <Slider label={t('wl.mimo.nt')} min={1} max={4} step={1} value={params.nt} onChange={(v) => set({ nt: v })} />
      <Slider label={t('wl.mimo.nr')} min={1} max={4} step={1} value={params.nr} onChange={(v) => set({ nr: v })} />
      <Slider
        label={t('wl.mimo.trials')}
        min={50}
        max={800}
        step={50}
        value={params.trials}
        onChange={(v) => set({ trials: v })}
      />
      <Slider label={t('wl.mimo.seed')} min={1} max={9999} step={1} value={params.seed} onChange={(v) => set({ seed: v })} />
      <button type="button" onClick={reset}>
        {t('wl.reset')}
      </button>
    </Panel>
  );
}

export function AlamoutiControls({
  params,
  set,
  reset,
}: {
  params: AlamoutiParams;
  set: (patch: Partial<AlamoutiParams>) => void;
  reset: () => void;
}) {
  return (
    <Panel title={t('wl.mimo.stc.title')}>
      <Slider
        label={t('wl.mimo.stc.ebN0Max')}
        min={10}
        max={40}
        step={1}
        value={params.ebN0Max}
        onChange={(v) => set({ ebN0Max: v })}
      />
      <button type="button" onClick={reset}>
        {t('wl.reset')}
      </button>
    </Panel>
  );
}

export function MimoErrControls({
  params,
  set,
  reset,
}: {
  params: MimoErrParams;
  set: (patch: Partial<MimoErrParams>) => void;
  reset: () => void;
}) {
  return (
    <Panel title={t('wl.mimo.err.title')}>
      <Slider label={t('wl.mimo.nt')} min={1} max={4} step={1} value={params.nt} onChange={(v) => set({ nt: v })} />
      <Slider label={t('wl.mimo.nr')} min={1} max={4} step={1} value={params.nr} onChange={(v) => set({ nr: v })} />
      <Slider
        label={t('wl.mimo.trials')}
        min={100}
        max={600}
        step={50}
        value={params.trials}
        onChange={(v) => set({ trials: v })}
      />
      <Slider label={t('wl.mimo.seed')} min={1} max={9999} step={1} value={params.seed} onChange={(v) => set({ seed: v })} />
      <button type="button" onClick={reset}>
        {t('wl.reset')}
      </button>
    </Panel>
  );
}
