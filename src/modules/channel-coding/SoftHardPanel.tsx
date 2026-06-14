import { useState } from 'react';
import { Panel, Slider } from '@/components';
import {
  awgnSoftReceive,
  hardSlice,
  viterbiDecode,
  viterbiDecodeSoft,
  type ConvCode,
} from '@/lib/dsp/convcodes';
import { makeRng } from '@/lib/dsp/random';
import { t } from '@/i18n';

const eq = (a: number[], b: number[]): boolean =>
  a.length === b.length && a.every((x, i) => x === b[i]);

export function SoftHardPanel({
  code,
  input,
  codeword,
}: {
  code: ConvCode;
  input: number[];
  codeword: number[];
}) {
  const [ebN0Db, setEbN0Db] = useState(2);
  const [seed, setSeed] = useState(1);

  const soft = awgnSoftReceive(codeword, ebN0Db, makeRng(seed));
  const sliced = hardSlice(soft);
  const hard = viterbiDecode(sliced, code);
  const softDec = viterbiDecodeSoft(soft, code);
  const hardOk = eq(hard.decoded, input);
  const softOk = eq(softDec.decoded, input);

  const status =
    softOk && !hardOk
      ? { cls: 'cc-cv-status cc-cv-status--ok', key: 'cc.cv.softWins' }
      : softOk && hardOk
        ? { cls: 'cc-cv-status', key: 'cc.cv.bothOk' }
        : !softOk && !hardOk
          ? { cls: 'cc-cv-status cc-cv-status--err', key: 'cc.cv.bothFail' }
          : { cls: 'cc-cv-status', key: 'cc.cv.hardOnly' };

  return (
    <Panel title={t('cc.cv.softTitle')}>
      <Slider label="Eb/N₀" value={ebN0Db} min={0} max={8} step={0.5} unit="dB" onChange={setEbN0Db} />
      <div className="cc-cv-anim">
        <button type="button" className="cc-cv-btn" onClick={() => setSeed((s) => s + 1)}>
          {t('cc.cv.reroll')}
        </button>
      </div>
      <div className="cc-bc-row">
        <span className="cc-bc-row-label">{t('cc.cv.softVals')}</span>
        <div className="cc-cv-soft">
          {soft.map((v, i) => (
            <span key={i} className={v >= 0 ? 'pos' : 'neg'}>
              {v.toFixed(1)}
            </span>
          ))}
        </div>
      </div>
      <BitRow label={t('cc.cv.sliced')} bits={sliced} />
      <BitRow label={t('cc.cv.uhard')} bits={hard.decoded} ok={hardOk} />
      <BitRow label={t('cc.cv.usoft')} bits={softDec.decoded} ok={softOk} />
      <p className={status.cls}>{t(status.key)}</p>
    </Panel>
  );
}

function BitRow({ label, bits, ok }: { label: string; bits: number[]; ok?: boolean }) {
  return (
    <div className="cc-bc-row">
      <span className="cc-bc-row-label">{label}</span>
      <div className="cc-bc-bits">
        {bits.map((b, i) => (
          <span key={i} className={b ? 'cc-bit cc-bit--ro cc-bit--x cc-bit--on' : 'cc-bit cc-bit--ro'}>
            {b}
          </span>
        ))}
      </div>
      {ok !== undefined && <span className="cc-bc-row-label">{ok ? '✓' : '✗'}</span>}
    </div>
  );
}
