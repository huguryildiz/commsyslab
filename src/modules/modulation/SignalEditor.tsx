import { t } from '@/i18n';
import { signalLabels } from './custom-signals';

const MIN_SIGNALS = 2;
const MAX_SIGNALS = 6;
const MIN_SEGMENTS = 2;
const MAX_SEGMENTS = 6;

export interface SignalEditorProps {
  /** M rows × L cols of segment amplitudes. */
  amplitudes: number[][];
  /** Per-signal linear-dependence flags (length M); optional badge. */
  dependent?: boolean[];
  onChange: (next: number[][]) => void;
}

/** Editable grid of M piecewise-constant signal waveforms for the Gram-Schmidt path (§7.1). */
export function SignalEditor({ amplitudes, dependent, onChange }: SignalEditorProps) {
  const M = amplitudes.length;
  const L = amplitudes[0]?.length ?? 0;
  const labels = signalLabels(M);

  const setCell = (m: number, l: number, value: number) => {
    const next = amplitudes.map((row) => row.slice());
    next[m][l] = Number.isFinite(value) ? value : 0;
    onChange(next);
  };

  const addSignal = () => {
    if (M >= MAX_SIGNALS) return;
    const row = new Array<number>(L).fill(0);
    row[0] = 1; // keep the set non-degenerate
    onChange([...amplitudes.map((r) => r.slice()), row]);
  };

  const removeSignal = () => {
    if (M <= MIN_SIGNALS) return;
    onChange(amplitudes.slice(0, M - 1).map((r) => r.slice()));
  };

  const setSegments = (nextL: number) => {
    const clamped = Math.max(MIN_SEGMENTS, Math.min(MAX_SEGMENTS, nextL));
    onChange(
      amplitudes.map((row) => {
        const next = row.slice(0, clamped);
        while (next.length < clamped) next.push(0);
        return next;
      }),
    );
  };

  return (
    <div className="signal-editor">
      <p className="signal-editor__hint">{t('modulation.optrx.custom.hint')}</p>
      <div
        className="signal-editor__grid"
        style={{ gridTemplateColumns: `auto repeat(${L}, 1fr)` }}
      >
        <span />
        {Array.from({ length: L }, (_, l) => (
          <span key={`h${l}`} className="signal-editor__col">
            {l + 1}
          </span>
        ))}
        {amplitudes.map((row, m) => (
          <Row
            key={`r${m}`}
            label={labels[m]}
            row={row}
            m={m}
            dependent={dependent?.[m] ?? false}
            onCell={setCell}
          />
        ))}
      </div>
      <div className="signal-editor__controls">
        <button type="button" onClick={removeSignal} disabled={M <= MIN_SIGNALS}>
          {t('modulation.optrx.custom.removeSignal')}
        </button>
        <button type="button" onClick={addSignal} disabled={M >= MAX_SIGNALS}>
          {t('modulation.optrx.custom.addSignal')}
        </button>
        <label className="signal-editor__seg">
          <span>{t('modulation.optrx.custom.segments')}</span>
          <input
            type="number"
            min={MIN_SEGMENTS}
            max={MAX_SEGMENTS}
            value={L}
            onChange={(e) => setSegments(Number(e.target.value))}
          />
        </label>
      </div>
    </div>
  );
}

function Row({
  label,
  row,
  m,
  dependent,
  onCell,
}: {
  label: string;
  row: number[];
  m: number;
  dependent: boolean;
  onCell: (m: number, l: number, value: number) => void;
}) {
  return (
    <>
      <span
        className={dependent ? 'signal-editor__rowlabel is-dependent' : 'signal-editor__rowlabel'}
      >
        {label}
        {dependent && <em>∼ {t('modulation.optrx.custom.dependent')}</em>}
      </span>
      {row.map((v, l) => (
        <input
          key={`c${m}-${l}`}
          type="number"
          step={1}
          value={v}
          aria-label={t('modulation.optrx.custom.cell')
            .replace('{m}', String(m + 1))
            .replace('{l}', String(l + 1))}
          onChange={(e) => onCell(m, l, Number(e.target.value))}
        />
      ))}
    </>
  );
}
