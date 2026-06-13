import { useMemo, useState } from 'react';
import { Panel, Readout, Formula, TheoryBox } from '@/components';
import { TreeSvg, layoutBinaryTree, type BinTree } from '@/lib/plot/svg';
import {
  kraftSum,
  isPrefixFree,
  avgLength,
  efficiency,
  isUniquelyDecodable,
  decodePrefix,
} from '@/lib/dsp/codes';
import { entropy } from '@/lib/dsp/entropy';
import { t } from '@/i18n';

interface Row {
  symbol: string;
  prob: number;
  code: string;
}

const PRESETS: Record<string, Row[]> = {
  I: [
    { symbol: 's0', prob: 0.5, code: '0' },
    { symbol: 's1', prob: 0.25, code: '1' },
    { symbol: 's2', prob: 0.125, code: '00' },
    { symbol: 's3', prob: 0.125, code: '11' },
  ],
  II: [
    { symbol: 's0', prob: 0.5, code: '0' },
    { symbol: 's1', prob: 0.25, code: '10' },
    { symbol: 's2', prob: 0.125, code: '110' },
    { symbol: 's3', prob: 0.125, code: '111' },
  ],
  III: [
    { symbol: 's0', prob: 0.5, code: '0' },
    { symbol: 's1', prob: 0.25, code: '01' },
    { symbol: 's2', prob: 0.125, code: '011' },
    { symbol: 's3', prob: 0.125, code: '0111' },
  ],
};

function codesToTree(rows: Row[]): BinTree {
  const root: BinTree = {};
  for (const r of rows) {
    if (r.code.length === 0) continue; // skip symbols with no codeword yet (mid-edit)
    let node = root;
    for (const b of r.code) {
      if (b === '0') node.left = node.left ?? {};
      else node.right = node.right ?? {};
      node = (b === '0' ? node.left : node.right) as BinTree;
    }
    node.symbol = r.symbol;
  }
  return root;
}

export function PrefixKraftSection() {
  const [rows, setRows] = useState<Row[]>(PRESETS.II);
  const [stream, setStream] = useState('010110111');

  const codeRows = rows.filter((r) => r.code.length > 0);
  const codewords = codeRows.map((r) => r.code);
  const lengths = codewords.map((c) => c.length);
  const probs = rows.map((r) => r.prob);

  const prefixFree = isPrefixFree(codewords);
  const kraft = kraftSum(lengths);
  const ud = isUniquelyDecodable(codewords);
  // Align L̄/η to the same coded symbols used by the verdicts above.
  const Lbar = avgLength(codeRows.map((r) => r.prob), lengths);
  const H = entropy(probs);
  const layout = useMemo(() => layoutBinaryTree(codesToTree(rows)), [rows]);
  const codeToSymbol = useMemo(
    () => Object.fromEntries(rows.filter((r) => r.code).map((r) => [r.code, r.symbol])),
    [rows],
  );
  const decoded = decodePrefix(stream.replace(/[^01]/g, ''), codeToSymbol);

  const setCode = (i: number, code: string) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, code: code.replace(/[^01]/g, '') } : r)));

  return (
    <div className="it-section">
      <aside className="it-controls">
        <Panel title={t('it.prefix.code')}>
          {rows.map((r, i) => (
            <label key={i} className="it-codeword">
              <span>{r.symbol} (p={r.prob})</span>
              <input value={r.code} onChange={(e) => setCode(i, e.target.value)} />
            </label>
          ))}
          <div className="it-row">
            <button type="button" onClick={() => setRows(PRESETS.I)}>
              {t('it.prefix.presetI')}
            </button>
            <button type="button" onClick={() => setRows(PRESETS.II)}>
              {t('it.prefix.presetII')}
            </button>
            <button type="button" onClick={() => setRows(PRESETS.III)}>
              {t('it.prefix.presetIII')}
            </button>
          </div>
        </Panel>
        <Panel title={t('it.prefix.decode')}>
          <label className="it-codeword">
            <span>bits</span>
            <input value={stream} onChange={(e) => setStream(e.target.value)} />
          </label>
          <div className="it-mono">
            {t('it.prefix.decodeOut')}: {decoded === null ? t('it.prefix.undecodable') : decoded || '—'}
          </div>
        </Panel>
      </aside>

      <div className="it-content">
        <div className="it-readouts">
          <Readout label={t('it.prefix.prefixFree')} value={prefixFree ? t('it.yes') : t('it.no')} tone={prefixFree ? 'ok' : 'warn'} />
          <Readout label={t('it.prefix.kraft')} value={kraft.toFixed(4)} tone={kraft <= 1 + 1e-9 ? 'ok' : 'err'} />
          <Readout label={t('it.prefix.ud')} value={ud ? t('it.yes') : t('it.no')} tone={ud ? 'ok' : 'err'} />
          <Readout label={t('it.prefix.Lbar')} value={Lbar.toFixed(3)} unit="bits" />
          <Readout label="η" value={Lbar > 0 ? efficiency(H, Lbar).toFixed(3) : '—'} />
        </div>
        <Panel title={t('it.prefix.tree')}>
          <TreeSvg layout={layout} ariaLabel="Code tree" />
        </Panel>
        <TheoryBox title={t('it.theory.title')}>
          <p>
            <Formula tex="\sum_k 2^{-l_k}\le 1\quad\text{(Kraft — necessary for a prefix code)}" block />
          </p>
          <p>prefix ⊂ uniquely-decodable: Code-III is uniquely decodable but not a prefix code.</p>
        </TheoryBox>
      </div>
    </div>
  );
}
