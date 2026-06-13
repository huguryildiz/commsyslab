import { Panel, Select, Slider } from '@/components';
import { t } from '@/i18n';
import type { ProcessParams, ProcessKind } from './model';

interface Props {
  params: ProcessParams;
  set: (patch: Partial<ProcessParams>) => void;
  resample: () => void;
}

const KIND_OPTIONS: { value: ProcessKind; labelKey: string }[] = [
  { value: 'randphase-sine', labelKey: 'rp.gen.kind.sine' },
  { value: 'white-gaussian', labelKey: 'rp.gen.kind.white' },
  { value: 'colored', labelKey: 'rp.gen.kind.colored' },
  { value: 'binary-nrz', labelKey: 'rp.gen.kind.nrz' },
];

export function GeneratorControls({ params, set, resample }: Props) {
  const isSine = params.kind === 'randphase-sine';
  const isNrz = params.kind === 'binary-nrz';
  const isNoise = params.kind === 'white-gaussian' || params.kind === 'colored';
  const isColored = params.kind === 'colored';

  return (
    <Panel title={t('rp.gen.title')}>
      <Select
        label={t('rp.gen.kind')}
        value={params.kind}
        options={KIND_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
        onChange={(v) => set({ kind: v as ProcessKind })}
      />
      <Slider label="A" min={0.2} max={3} step={0.1} value={params.amplitude} onChange={(v) => set({ amplitude: v })} />
      {(isSine || isNrz) && (
        <Slider label="f₀ (Hz)" min={1} max={40} step={1} value={params.f0} onChange={(v) => set({ f0: v })} />
      )}
      {isNoise && (
        <Slider label="N₀" min={0.1} max={4} step={0.1} value={params.n0} onChange={(v) => set({ n0: v })} />
      )}
      {isColored && (
        <Slider label="f_c (Hz)" min={2} max={80} step={1} value={params.cutoff} onChange={(v) => set({ cutoff: v })} />
      )}
      <Slider label="M (realizations)" min={20} max={600} step={20} value={params.M} onChange={(v) => set({ M: v })} />
      <button onClick={resample}>{t('rp.gen.resample')}</button>
    </Panel>
  );
}
