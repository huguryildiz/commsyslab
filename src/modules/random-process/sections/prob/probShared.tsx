import { HintText } from '@/components';
import { t } from '@/i18n';

/** Plot-area insets shared by the §5.1 canvases. */
// eslint-disable-next-line react-refresh/only-export-components
export const PAD = { l: 50, r: 18, t: 18, b: 44 };

/** KaTeX-aware plot title (rp namespace). */
export function PlotTitle({ textKey }: { textKey: string }) {
  return (
    <div className="rp__plot-title">
      <HintText text={t(textKey)} />
    </div>
  );
}

export interface LegendEntry {
  /** Resolved color string. */
  color: string;
  /** i18n key or raw `$...$` math for the label. */
  label: string;
  dashed?: boolean;
  block?: boolean;
}

/** Centered legend row built from entries (labels may contain KaTeX). */
export function Legend({ entries }: { entries: LegendEntry[] }) {
  return (
    <div className="rp__legend">
      {entries.map((e, i) => (
        <span key={i} className="rp__legend__item" style={{ color: e.color }}>
          <span
            className={`rp__legend__swatch${e.dashed ? ' rp__legend__swatch--dashed' : ''}${
              e.block ? ' rp__legend__swatch--block' : ''
            }`}
          />
          <HintText text={e.label} />
        </span>
      ))}
    </div>
  );
}

/** A read-out metric chip (KaTeX-aware label). */
export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rp__metric">
      <span className="rp__metric__label">
        <HintText text={label} />
      </span>
      <span className="rp__metric__value">{value}</span>
    </div>
  );
}
