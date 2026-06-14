import { Panel, Slider, Select } from '@/components';
import { t } from '@/i18n';
import type { Scheme } from '@/lib/dsp/modulation';
import type { LinkBudgetParams, PathLossModel } from './linkbudget-model';

interface Props {
  params: LinkBudgetParams;
  set: (patch: Partial<LinkBudgetParams>) => void;
}

// Modulation presets → (scheme, M). Key is a stable string for the Select.
const MOD_PRESETS: Record<string, { scheme: Scheme; M: number; label: string }> = {
  bpsk: { scheme: 'bpsk', M: 2, label: 'BPSK' },
  qpsk: { scheme: 'mpsk', M: 4, label: 'QPSK' },
  qam16: { scheme: 'mqam', M: 16, label: '16-QAM' },
  qam64: { scheme: 'mqam', M: 64, label: '64-QAM' },
};

function presetKey(p: LinkBudgetParams): string {
  if (p.scheme === 'bpsk') return 'bpsk';
  if (p.scheme === 'mpsk' && p.M === 4) return 'qpsk';
  if (p.scheme === 'mqam' && p.M === 16) return 'qam16';
  if (p.scheme === 'mqam' && p.M === 64) return 'qam64';
  return 'qpsk';
}

export function LinkBudgetControls({ params, set }: Props) {
  return (
    <Panel title={t('wl.lb.title')}>
      <Slider label={t('wl.lb.txPower')} min={0} max={60} step={1} value={params.txPowerDbm} onChange={(v) => set({ txPowerDbm: v })} />
      <Slider label={t('wl.lb.txGain')} min={0} max={30} step={1} value={params.txGainDbi} onChange={(v) => set({ txGainDbi: v })} />
      <Slider label={t('wl.lb.rxGain')} min={0} max={20} step={1} value={params.rxGainDbi} onChange={(v) => set({ rxGainDbi: v })} />
      <Slider label={t('wl.lb.freq')} min={0.1} max={6} step={0.1} value={params.freqGHz} onChange={(v) => set({ freqGHz: v })} />
      <Slider label={t('wl.lb.distance')} min={0.1} max={20} step={0.1} value={params.distanceKm} onChange={(v) => set({ distanceKm: v })} />
      <Slider label={t('wl.lb.otherLoss')} min={0} max={20} step={1} value={params.otherLossDb} onChange={(v) => set({ otherLossDb: v })} />
      <Slider label={t('wl.lb.bandwidth')} min={0.2} max={20} step={0.2} value={params.bandwidthMHz} onChange={(v) => set({ bandwidthMHz: v })} />
      <Slider label={t('wl.lb.bitRate')} min={0.1} max={20} step={0.1} value={params.bitRateMbps} onChange={(v) => set({ bitRateMbps: v })} />
      <Slider label={t('wl.lb.noiseFigure')} min={0} max={15} step={1} value={params.noiseFigureDb} onChange={(v) => set({ noiseFigureDb: v })} />
      <Select
        label={t('wl.lb.modulation')}
        value={presetKey(params)}
        options={Object.entries(MOD_PRESETS).map(([k, v]) => ({ value: k, label: v.label }))}
        onChange={(k) => set({ scheme: MOD_PRESETS[k].scheme, M: MOD_PRESETS[k].M })}
      />
      <Select
        label={t('wl.lb.model')}
        value={params.pathLossModel}
        options={[
          { value: 'freespace', label: t('wl.lb.model.freespace') },
          { value: 'logdistance', label: t('wl.lb.model.logdistance') },
          { value: 'hata', label: t('wl.lb.model.hata') },
        ]}
        onChange={(v) => set({ pathLossModel: v as PathLossModel })}
      />
      {params.pathLossModel === 'logdistance' && (
        <Slider label={t('wl.lb.exponent')} min={2} max={5} step={0.1} value={params.pathLossExponent} onChange={(v) => set({ pathLossExponent: v })} />
      )}
      {params.pathLossModel === 'hata' && (
        <>
          <Slider label={t('wl.lb.hBase')} min={20} max={100} step={1} value={params.hBaseM} onChange={(v) => set({ hBaseM: v })} />
          <Slider label={t('wl.lb.hMobile')} min={1} max={10} step={0.5} value={params.hMobileM} onChange={(v) => set({ hMobileM: v })} />
        </>
      )}
      <Slider label={t('wl.lb.sigma')} min={0} max={12} step={1} value={params.shadowSigmaDb} onChange={(v) => set({ shadowSigmaDb: v })} />
      <Slider label={t('wl.lb.outage')} min={0.01} max={0.5} step={0.01} value={params.targetOutage} onChange={(v) => set({ targetOutage: v })} />
    </Panel>
  );
}
