import { Panel, Slider } from '@/components';
import { t } from '@/i18n';
import type { SpreadParams } from './spread-model';

interface Props {
  params: SpreadParams;
  set: (patch: Partial<SpreadParams>) => void;
  reset: () => void;
}

export function SpreadControls({ params, set, reset }: Props) {
  return (
    <Panel title={t('wl.ss.title')}>
      <Slider
        label={t('wl.ss.registerLength')}
        min={3}
        max={7}
        step={1}
        value={params.registerLength}
        onChange={(v) => set({ registerLength: v })}
      />
      <Slider
        label={t('wl.ss.ebN0')}
        min={0}
        max={20}
        step={1}
        value={params.ebN0Db}
        onChange={(v) => set({ ebN0Db: v })}
      />
      <Slider
        label={t('wl.ss.jsr')}
        min={-10}
        max={40}
        step={1}
        value={params.jsrDb}
        onChange={(v) => set({ jsrDb: v })}
      />
      <Slider
        label={t('wl.ss.jammerOffset')}
        min={0.05}
        max={0.5}
        step={0.05}
        value={params.jammerOffset}
        onChange={(v) => set({ jammerOffset: v })}
      />
      <button type="button" onClick={reset}>
        {t('wl.reset')}
      </button>
    </Panel>
  );
}
