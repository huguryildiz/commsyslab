import { useEffect, useMemo, useRef, useState } from 'react';
import { Panel, Select, Readout, Formula, TheoryBox } from '@/components';
import { makeField } from '@/lib/dsp/gf2m';
import {
  rsParams,
  rsGenerator,
  rsEncode,
  rsSyndromes,
  symbolsToBits,
  bitsToSymbols,
} from '@/lib/dsp/reedsolomon';
import { t } from '@/i18n';

type MStr = '3' | '4';
const M_OPTIONS: MStr[] = ['3', '4'];
const SUP = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
const sup = (n: number): string =>
  String(n)
    .split('')
    .map((d) => SUP[+d])
    .join('');

const defaultMsg = (len: number, n: number): number[] =>
  Array.from({ length: len }, (_, i) => (i + 2) % (n + 1)); // deterministic, varied symbols

export function ReedSolomonSection() {
  const [mStr, setMStr] = useState<MStr>('3');
  const m = Number(mStr);
  const field = useMemo(() => makeField(m), [m]);
  const N = field.n;
  const kOptions = useMemo(() => {
    const out: string[] = [];
    for (let k = 1; k <= N - 2; k++) out.push(String(k));
    return out;
  }, [N]);
  const [kStr, setKStr] = useState<string>('3');
  const K = Math.min(Number(kStr), N - 2);
  const params = rsParams(m, K);
  const [msg, setMsg] = useState<number[]>(() => defaultMsg(K, N));
  const [burstStart, setBurstStart] = useState(2);
  const [burstLen, setBurstLen] = useState(3);

  const alpha = (x: number): string => (x === 0 ? '0' : x === 1 ? '1' : `α${sup(field.log[x])}`);
  const gen = useMemo(() => rsGenerator(field, params.parity), [field, params.parity]);
  const codeword = useMemo(() => rsEncode(field, msg, K), [field, msg, K]);
  const bits = symbolsToBits(codeword, m);
  const totalBits = bits.length;
  const burst = bits.map((bit, i) => {
    const inBurst = i >= burstStart && i < Math.min(burstStart + burstLen, totalBits);
    return inBurst ? bit ^ 1 : bit;
  });
  const received = bitsToSymbols(burst, m);
  const affected = received.map((s, i) => (s !== codeword[i] ? i : -1)).filter((i) => i >= 0);
  const syn = rsSyndromes(field, received, params.parity);
  const detected = syn.some((s) => s !== 0);

  const sig = `${m}|${K}`;
  const prev = useRef(sig);
  useEffect(() => {
    if (prev.current !== sig) {
      prev.current = sig;
      setMsg(defaultMsg(K, N));
      setBurstStart((s) => Math.min(s, m * N - 1));
    }
  }, [sig, K, N, m]);

  const selectM = (v: MStr) => {
    setMStr(v);
    const n2 = (1 << Number(v)) - 1;
    setKStr((k) => String(Math.min(Number(k), n2 - 2)));
  };
  const parityStart = params.parity; // codeword = [parity (low) | msg (high)]

  return (
    <div className="cc-section">
      <aside className="cc-controls">
        <Panel title={t('cc.rs.params')}>
          <Select<MStr>
            label={t('cc.rs.m')}
            value={mStr}
            options={M_OPTIONS.map((v) => ({ value: v, label: `m = ${v}  (N = ${(1 << Number(v)) - 1})` }))}
            onChange={selectM}
          />
          <Select<string>
            label={t('cc.rs.k')}
            value={String(K)}
            options={kOptions.map((v) => ({ value: v, label: `K = ${v}` }))}
            onChange={setKStr}
          />
          <div className="cc-readouts">
            <Readout label="N" value={params.N} />
            <Readout label="K" value={params.K} />
            <Readout label="N−K" value={params.parity} />
            <Readout label="D_min" value={params.dmin} />
            <Readout label="t" value={params.t} />
            <Readout label="Rc" value={params.rate.toFixed(3)} />
          </div>
        </Panel>

        <Panel title={t('cc.rs.burst')}>
          <Select<string>
            label={t('cc.rs.burstStart')}
            value={String(burstStart)}
            options={Array.from({ length: totalBits }, (_, i) => ({ value: String(i), label: String(i) }))}
            onChange={(v) => setBurstStart(Number(v))}
          />
          <Select<string>
            label={t('cc.rs.burstLen')}
            value={String(burstLen)}
            options={Array.from({ length: m + 2 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
            onChange={(v) => setBurstLen(Number(v))}
          />
        </Panel>
      </aside>

      <div className="cc-content">
        <Panel title={t('cc.rs.gen')}>
          <p className="cc-cy-poly">
            g(x) ={' '}
            {gen
              .slice()
              .reverse()
              .map((c, i) => `${alpha(c)}·x${sup(gen.length - 1 - i)}`)
              .join(' + ')}
          </p>
          <p className="cc-cy-line">
            degree {gen.length - 1} = N − K = {params.parity}
          </p>
        </Panel>

        <Panel title={t('cc.rs.encode')}>
          <div className="cc-rs-syms">
            {codeword
              .slice()
              .reverse()
              .map((s, i) => {
                const idx = codeword.length - 1 - i;
                const isMsg = idx >= parityStart;
                return (
                  <div key={idx} className={`cc-rs-sym ${isMsg ? 'msg' : 'par'}`}>
                    <span>{alpha(s)}</span>
                    <small>{s}</small>
                  </div>
                );
              })}
          </div>
        </Panel>

        <Panel title={t('cc.rs.burst')}>
          <div className="cc-rs-syms">
            {received
              .slice()
              .reverse()
              .map((s, i) => {
                const idx = received.length - 1 - i;
                const hit = affected.includes(idx);
                return (
                  <div key={idx} className={`cc-rs-sym ${hit ? 'hit' : ''}`}>
                    <span>{alpha(s)}</span>
                    <small>{s}</small>
                  </div>
                );
              })}
          </div>
          <div className="cc-rs-bits">
            {burst
              .map((bit, i) => ({ bit, i }))
              .reverse()
              .map(({ bit, i }) => {
                const inBurst = i >= burstStart && i < Math.min(burstStart + burstLen, totalBits);
                return (
                  <span key={i} className={inBurst ? 'b' : ''}>
                    {bit}
                  </span>
                );
              })}
          </div>
          <p className="cc-cy-line">
            {t('cc.rs.affected')}: {affected.length} ({t('cc.rs.burstLen')} {burstLen})
          </p>
          <p className={detected ? 'cc-cv-status cc-cv-status--ok' : 'cc-cv-status'}>
            {detected ? t('cc.rs.detected') : t('cc.rs.undetected')}
          </p>
        </Panel>

        <TheoryBox>
          <Formula tex={'N = 2^k - 1,\\quad D_{\\min} = N - K + 1,\\quad R_c = K/N'} block />
          <Formula tex={'g(x) = \\prod_{i=1}^{N-K} (x - \\alpha^i)'} block />
          <p>{t('cc.rs.mds')}</p>
        </TheoryBox>
      </div>
    </div>
  );
}
