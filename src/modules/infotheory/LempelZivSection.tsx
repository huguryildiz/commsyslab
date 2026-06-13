import { useMemo, useState } from 'react';
import { Panel, Readout, TheoryBox } from '@/components';
import { lzParse, lzDecode } from '@/lib/dsp/lz78';
import { t } from '@/i18n';

const BOOK = '0100001100001010000010100000110000010100001001001';

export function LempelZivSection() {
  const [input, setInput] = useState(BOOK);
  const [shown, setShown] = useState(16);

  const clean = input.replace(/[^01]/g, '');
  const r = useMemo(() => lzParse(clean), [clean]);
  const lossless = lzDecode(r) === clean;
  const visible = r.phrases.slice(0, shown);

  return (
    <div className="it-section">
      <aside className="it-controls">
        <Panel title={t('it.lz.input')}>
          <textarea className="it-wide" rows={3} value={input} onChange={(e) => { setInput(e.target.value); setShown(16); }} />
          <button type="button" onClick={() => { setInput(BOOK); setShown(16); }}>{t('it.lz.preset')}</button>
          <div className="it-row">
            <button type="button" onClick={() => setShown((s) => Math.min(r.phrases.length, s + 1))}>{t('it.lz.step')} ▶</button>
            <button type="button" onClick={() => setShown(r.phrases.length)}>{t('it.lz.play')}</button>
            <button type="button" onClick={() => setShown(0)}>{t('it.lz.reset')}</button>
          </div>
        </Panel>
      </aside>

      <div className="it-content">
        <div className="it-readouts">
          <Readout label={t('it.lz.lengths')} value={`${r.inputLength} → ${r.encodedLength} bits`} />
          <Readout label="indexBits" value={r.indexBits} />
          <Readout label={t('it.lz.lossless')} value={lossless ? t('it.yes') : t('it.no')} tone={lossless ? 'ok' : 'err'} />
        </div>
        <Panel title={t('it.lz.dict')}>
          <table className="it-table">
            <thead>
              <tr><th>{t('it.lz.loc')}</th><th>{t('it.lz.contents')}</th><th>{t('it.lz.codeword')}</th></tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.location}>
                  <td>{p.location}</td>
                  <td className="it-mono">{p.contents}</td>
                  <td className="it-mono">{p.codeword.slice(0, r.indexBits)} {p.newBit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title={t('it.lz.encoded')}>
          <div className="it-mono it-break">{visible.map((p) => p.codeword).join(' ') || '—'}</div>
        </Panel>
        <TheoryBox title={t('it.theory.title')}>
          <p>LZ78 is a universal, variable-to-fixed dictionary code: each new phrase = a previous phrase + one new bit. Each codeword is the index of the prefix phrase ({r.indexBits} bits) followed by the new bit.</p>
        </TheoryBox>
      </div>
    </div>
  );
}
