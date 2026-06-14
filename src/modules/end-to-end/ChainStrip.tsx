import { t } from '@/i18n';

export type Stage = 'source' | 'mod' | 'channel' | 'detect' | 'sink';

const STAGES: { id: Stage; key: string }[] = [
  { id: 'source', key: 'e2e.stage.source' },
  { id: 'mod', key: 'e2e.stage.mod' },
  { id: 'channel', key: 'e2e.stage.channel' },
  { id: 'detect', key: 'e2e.stage.detect' },
  { id: 'sink', key: 'e2e.stage.sink' },
];

export interface ChainStripProps {
  selected: Stage;
  onSelect: (s: Stage) => void;
  status: Record<Stage, string>;
}

export function ChainStrip({ selected, onSelect, status }: ChainStripProps) {
  return (
    <div className="e2e-chain" role="tablist" aria-label={t('e2e.title')}>
      {STAGES.map((s, i) => (
        <div className="e2e-chain__item" key={s.id}>
          <button
            type="button"
            role="tab"
            aria-selected={selected === s.id}
            className={selected === s.id ? 'e2e-node e2e-node--active' : 'e2e-node'}
            onClick={() => onSelect(s.id)}
          >
            <span className="e2e-node__label">{t(s.key)}</span>
            <span className="e2e-node__status">{status[s.id]}</span>
          </button>
          {i < STAGES.length - 1 && <span className="e2e-chain__arrow">→</span>}
        </div>
      ))}
    </div>
  );
}
