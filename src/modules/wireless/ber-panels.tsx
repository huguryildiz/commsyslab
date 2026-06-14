import { Panel, Select, Slider } from '@/components';
import { t } from '@/i18n';
import type { BerModulation, BerParams } from './ber-model';

interface Props {
  params: BerParams;
  set: (patch: Partial<BerParams>) => void;
}

export function BerControls({ params, set }: Props) {
  const isAntipodal = params.modulation === 'antipodal';
  return (
    <Panel title={t('wl.ber.title')}>
      <Select
        label={t('wl.ber.modulation')}
        value={params.modulation}
        options={[
          { value: 'antipodal', label: t('wl.ber.mod.antipodal') },
          { value: 'orthogonal', label: t('wl.ber.mod.orthogonal') },
        ]}
        onChange={(v) => set({ modulation: v as BerModulation })}
      />
      {isAntipodal && (
        <Slider
          label={t('wl.ber.diversityL')}
          min={1}
          max={6}
          step={1}
          value={params.diversityL}
          onChange={(v) => set({ diversityL: v })}
        />
      )}
      <Slider
        label={t('wl.ber.sigma')}
        min={0}
        max={12}
        step={1}
        value={params.shadowingSigmaDb}
        onChange={(v) => set({ shadowingSigmaDb: v })}
      />
      <Slider
        label={t('wl.ber.threshold')}
        min={0}
        max={15}
        step={1}
        value={params.outageThreshDb}
        onChange={(v) => set({ outageThreshDb: v })}
      />
    </Panel>
  );
}
