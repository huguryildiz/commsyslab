import { useMemo, useState } from 'react';
import { Panel, Toggle, Readout, Formula, TheoryBox, InfoCard } from '@/components';
import { TreeSvg, layoutBinaryTree, type BinTree } from '@/lib/plot/svg';
import { buildHuffman, huffmanEncode, type HuffmanNode } from '@/lib/dsp/huffman';
import { t } from '@/i18n';

const SYM = ['s0', 's1', 's2', 's3', 's4'];
const P = [0.4, 0.2, 0.2, 0.1, 0.1];

function toBinTree(n: HuffmanNode): BinTree {
  if (n.symbol !== undefined) return { symbol: n.symbol };
  return {
    left: n.left ? toBinTree(n.left) : undefined,
    right: n.right ? toBinTree(n.right) : undefined,
  };
}

export function HuffmanSection() {
  const [minVar, setMinVar] = useState(false);
  const [msg, setMsg] = useState('s0 s1 s0 s4 s2');

  const r = useMemo(() => buildHuffman(SYM, P, { minVariance: minVar }), [minVar]);
  const layout = useMemo(() => layoutBinaryTree(toBinTree(r.root)), [r]);

  const symbols = msg
    .trim()
    .split(/\s+/)
    .filter((s) => r.codes[s] !== undefined);
  const encoded = huffmanEncode(symbols, r.codes);
  const fixedLen = symbols.length * Math.ceil(Math.log2(SYM.length));
  const ratio = fixedLen > 0 ? (encoded.length / fixedLen).toFixed(2) : '—';

  return (
    <div className="module-layout">
      <aside className="it-controls">
        <Panel title={t('it.huffman.title')}>
          <Toggle label={t('it.huffman.minvar')} checked={minVar} onChange={setMinVar} />
        </Panel>
        <Panel title={t('it.huffman.table')}>
          <table className="it-table">
            <thead>
              <tr>
                <th>s</th>
                <th>p</th>
                <th>code</th>
                <th>l</th>
              </tr>
            </thead>
            <tbody>
              {SYM.map((s, i) => (
                <tr key={s}>
                  <td>{s}</td>
                  <td>{P[i]}</td>
                  <td className="it-mono">{r.codes[s]}</td>
                  <td>{r.lengths[s]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title={t('it.huffman.encode')}>
          <input className="it-wide" value={msg} onChange={(e) => setMsg(e.target.value)} />
          <div className="it-mono it-break">
            {t('it.huffman.encoded')}: {encoded || '—'}
          </div>
          <div className="it-mono">
            {t('it.huffman.decoded')}: {symbols.join(' ') || '—'}
          </div>
        </Panel>
      </aside>

      <div className="it-content">
        <div className="it-readouts">
          <Readout label={t('it.huffman.H')} value={r.H.toFixed(4)} unit="bits" />
          <Readout label={t('it.huffman.Lbar')} value={r.Lbar.toFixed(3)} unit="bits" />
          <Readout label={t('it.huffman.eta')} value={r.efficiency.toFixed(3)} />
          <Readout label={t('it.huffman.var')} value={r.variance.toFixed(3)} />
          <Readout
            label={t('it.huffman.ratio')}
            value={`${ratio}× (${encoded.length}/${fixedLen})`}
          />
        </div>
        <Panel title={t('it.huffman.tree')}>
          <TreeSvg layout={layout} ariaLabel="Huffman tree" />
        </Panel>
        <div className="info-cards">
          <InfoCard title={t('it.huffman.card.algo')} accent="green">
            <p>{t('it.huffman.card.algoBody')}</p>
          </InfoCard>
          <InfoCard title={t('it.huffman.card.minvar')} accent="blue">
            <p>{t('it.huffman.card.minvarBody')}</p>
          </InfoCard>
          <InfoCard title={t('it.huffman.card.opt')} accent="green">
            <p>{t('it.huffman.card.optBody')}</p>
            <Formula tex="H(S)\le \bar L< H(S)+1,\quad \eta=\tfrac{H(S)}{\bar L}" block />
          </InfoCard>
          <InfoCard title={t('it.huffman.card.ratio')} accent="orange">
            <p>{t('it.huffman.card.ratioBody')}</p>
          </InfoCard>
        </div>
        <TheoryBox title={t('it.theory.title')}>
          <p>
            <Formula
              tex="\bar L=\sum_k p_k l_k,\quad H(S)\le \bar L< H(S)+1,\quad \eta=\tfrac{H(S)}{\bar L}"
              block
            />
          </p>
          <p>
            <Formula tex="\sigma^2=\sum_k p_k\,(l_k-\bar L)^2" block />
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}
