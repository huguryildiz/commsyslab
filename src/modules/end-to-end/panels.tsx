import { Panel, Slider, Select, Toggle } from '@/components';
import { t } from '@/i18n';
import type { Scheme } from '@/lib/dsp/modulation';

export interface SourceControls {
  freq: number;
  fs: number;
  bits: number;
  onFreq: (v: number) => void;
  onFs: (v: number) => void;
  onBits: (v: number) => void;
}

export function SourcePanel(p: SourceControls) {
  return (
    <Panel title={t('e2e.ctrl.source')}>
      <Slider label={t('e2e.ctrl.freq')} value={p.freq} min={1} max={8} step={1} unit="Hz" onChange={p.onFreq} />
      <Slider label={t('e2e.ctrl.fs')} value={p.fs} min={16} max={64} step={8} unit="Hz" onChange={p.onFs} />
      <Slider label={t('e2e.ctrl.bits')} value={p.bits} min={2} max={6} step={1} unit="bit" onChange={p.onBits} />
    </Panel>
  );
}

const SCHEMES: { value: Scheme; labelKey: string }[] = [
  { value: 'bpsk', labelKey: 'modulation.scheme.bpsk' },
  { value: 'mpsk', labelKey: 'modulation.scheme.mpsk' },
  { value: 'mqam', labelKey: 'modulation.scheme.mqam' },
];

export interface ModControls {
  scheme: Scheme;
  M: number;
  onScheme: (v: Scheme) => void;
  onM: (v: number) => void;
}

export function ModulationPanel(p: ModControls) {
  return (
    <Panel title={t('e2e.ctrl.modulation')}>
      <Select
        label={t('e2e.ctrl.scheme')}
        value={p.scheme}
        options={SCHEMES.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
        onChange={p.onScheme}
      />
      {p.scheme !== 'bpsk' && (
        <Slider label={t('e2e.ctrl.m')} value={p.M} min={4} max={16} step={4} onChange={p.onM} />
      )}
    </Panel>
  );
}

export interface ChannelControls {
  ebN0Db: number;
  bandlimited: boolean;
  alpha: number;
  onEbN0: (v: number) => void;
  onBandlimited: (v: boolean) => void;
  onAlpha: (v: number) => void;
}

export function ChannelPanel(p: ChannelControls) {
  return (
    <Panel title={t('e2e.ctrl.channel')}>
      <Slider label={t('e2e.ctrl.ebn0')} value={p.ebN0Db} min={-2} max={14} step={0.5} unit="dB" onChange={p.onEbN0} />
      <Toggle label={t('e2e.ctrl.bandlimited')} checked={p.bandlimited} onChange={p.onBandlimited} />
      {p.bandlimited && (
        <Slider label={t('e2e.ctrl.alpha')} value={p.alpha} min={0} max={1} step={0.05} onChange={p.onAlpha} />
      )}
    </Panel>
  );
}
