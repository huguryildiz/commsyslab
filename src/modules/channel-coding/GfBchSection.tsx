import { useEffect, useMemo, useRef, useState } from 'react';
import { Panel, Select, Readout, Formula, TheoryBox } from '@/components';
import { makeField } from '@/lib/dsp/gf2m';
import { bchParams, bchEncode, bchSyndromes, genToOctal } from '@/lib/dsp/bch';
import { polyToString } from '@/lib/dsp/cyclic';
import { GfFieldTable } from './GfFieldTable';
import { t } from '@/i18n';

type MStr = '3' | '4';
const M_OPTIONS: MStr[] = ['3', '4'];
const T_OPTIONS: Record<MStr, string[]> = { '3': ['1'], '4': ['1', '2', '3'] };
const PRIM_STR: Record<MStr, string> = { '3': 'p³+p+1', '4': 'p⁴+p+1' };
// Proakis Table 9.1 generator octals for the (n,k) we expose
const TABLE91: Record<string, string> = { '15,5': '2467', '15,7': '721', '15,11': '23', '7,4': '13' };

const defaultMsg = (len: number): number[] =>
  Array.from({ length: len }, (_, i) => (i % 2 === 0 ? 1 : 0));
const toDisplay = (a: number[]): number[] => a.slice().reverse();

export function GfBchSection() {
  const [mStr, setMStr] = useState<MStr>('4');
  const [tStr, setTStr] = useState<string>('3');
  const m = Number(mStr);
  const tt = Number(tStr);
  const field = useMemo(() => makeField(m), [m]);
  const [a, setA] = useState(3);
  const [b, setB] = useState(5);
  const params = useMemo(() => bchParams(m, tt), [m, tt]);
  const [msg, setMsg] = useState<number[]>(() => defaultMsg(params.k));
  const [errs, setErrs] = useState<number[]>(() => new Array(params.n).fill(0));

  const codeword = useMemo(() => bchEncode(msg, m, tt), [msg, m, tt]);
  const errors = errs.length === codeword.length ? errs : new Array<number>(codeword.length).fill(0);
  const received = codeword.map((c, i) => c ^ (errors[i] ?? 0));
  const syn = bchSyndromes(received, m, tt);
  const detected = syn.some((s) => s !== 0);
  const octal = genToOctal(params.g);
  const tableOctal = TABLE91[`${params.n},${params.k}`];
  const matchesTable = tableOctal !== undefined && tableOctal === octal;

  const sig = `${m}|${tt}`;
  const prev = useRef(sig);
  useEffect(() => {
    if (prev.current !== sig) {
      prev.current = sig;
      setMsg(defaultMsg(params.k));
      setErrs(new Array(params.n).fill(0));
    }
  }, [sig, params.k, params.n]);

  const selectM = (v: MStr) => {
    setMStr(v);
    const opts = T_OPTIONS[v];
    setTStr(opts[opts.length - 1]);
    setA((x) => Math.min(x, (1 << Number(v)) - 1));
    setB((x) => Math.min(x, (1 << Number(v)) - 1));
  };
  const toggleMsg = (i: number) => setMsg((mm) => mm.map((x, j) => (j === i ? x ^ 1 : x)));
  const toggleErr = (i: number) =>
    setErrs(() => {
      const base = errors.slice();
      base[i] ^= 1;
      return base;
    });

  const elemOptions = field.exp.map((x) => ({ value: String(x), label: `${x}` }));

  return (
    <div className="cc-section">
      <aside className="cc-controls">
        <Panel title={t('cc.gf.field')}>
          <Select<MStr>
            label={t('cc.gf.m')}
            value={mStr}
            options={M_OPTIONS.map((v) => ({ value: v, label: `m = ${v}  (GF(${1 << Number(v)}))` }))}
            onChange={selectM}
          />
          <p className="cc-cy-poly">
            {t('cc.gf.prim')}: {PRIM_STR[mStr]}
          </p>
          <div className="cc-readouts">
            <Readout label="n = 2ᵐ−1" value={field.n} />
          </div>
        </Panel>

        <Panel title={t('cc.gf.explore')}>
          <Select<string>
            label={t('cc.gf.a')}
            value={String(a)}
            options={elemOptions}
            onChange={(v) => setA(Number(v))}
          />
          <Select<string>
            label={t('cc.gf.b')}
            value={String(b)}
            options={elemOptions}
            onChange={(v) => setB(Number(v))}
          />
        </Panel>

        <Panel title={t('cc.bch.params')}>
          <Select<string>
            label={t('cc.bch.t')}
            value={tStr}
            options={T_OPTIONS[mStr].map((v) => ({ value: v, label: `t = ${v}` }))}
            onChange={setTStr}
          />
          <div className="cc-readouts">
            <Readout label="n" value={params.n} />
            <Readout label="k" value={params.k} />
            <Readout label="d_min" value={params.dmin} />
            <Readout label="Rc" value={(params.k / params.n).toFixed(3)} />
          </div>
        </Panel>

        <Panel title={t('cc.bch.message')}>
          <div className="cc-bc-bits">
            {toDisplay(msg).map((bit, i) => {
              const idx = msg.length - 1 - i;
              return (
                <button
                  key={idx}
                  type="button"
                  className={bit ? 'cc-bit cc-bit--x cc-bit--on' : 'cc-bit'}
                  onClick={() => toggleMsg(idx)}
                >
                  {bit}
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel title={t('cc.bch.errors')}>
          <div className="cc-bc-bits">
            {toDisplay(received).map((bit, i) => {
              const idx = received.length - 1 - i;
              const isErr = (errors[idx] ?? 0) === 1;
              return (
                <button
                  key={idx}
                  type="button"
                  className={isErr ? 'cc-bit cc-bit--err cc-bit--on' : 'cc-bit'}
                  onClick={() => toggleErr(idx)}
                >
                  {bit}
                </button>
              );
            })}
          </div>
        </Panel>
      </aside>

      <div className="cc-content">
        <Panel title={t('cc.gf.table')}>
          <GfFieldTable field={field} a={a} b={b} />
        </Panel>

        <Panel title={t('cc.bch.gen')}>
          <p className="cc-cy-poly">g(p) = {polyToString(params.g)}</p>
          <p className="cc-cy-line">
            octal {octal}
            {tableOctal !== undefined && (
              <span className={matchesTable ? 'cc-bch-badge cc-bch-badge--ok' : 'cc-bch-badge'}>
                {' '}
                {t('cc.bch.table')} {matchesTable ? '✓' : '–'}
              </span>
            )}
          </p>
        </Panel>

        <Panel title={t('cc.bch.encode')}>
          <div className="cc-bc-row">
            <span className="cc-bc-row-label">c [msg|par]</span>
            <div className="cc-bc-bits">
              {toDisplay(codeword).map((bit, i) => {
                const idx = codeword.length - 1 - i;
                const isMsg = idx >= codeword.length - params.k;
                const cls = bit
                  ? isMsg
                    ? 'cc-bit cc-bit--ro cc-bit--x cc-bit--on'
                    : 'cc-bit cc-bit--ro cc-bit--parity cc-bit--on'
                  : 'cc-bit cc-bit--ro';
                return (
                  <span key={idx} className={cls}>
                    {bit}
                  </span>
                );
              })}
            </div>
          </div>
        </Panel>

        <Panel title={t('cc.bch.syndrome')}>
          <div className="cc-bch-syn">
            {syn.map((s, i) => (
              <span key={i} className={s !== 0 ? 'nz' : ''}>
                S{i + 1}={s}
              </span>
            ))}
          </div>
          <p className={detected ? 'cc-cv-status cc-cv-status--ok' : 'cc-cv-status'}>
            {detected ? t('cc.bch.detected') : t('cc.bch.undetected')}
          </p>
        </Panel>

        <TheoryBox>
          <Formula tex={'n = 2^m - 1,\\quad n-k \\le mt,\\quad d_{\\min} = 2t+1'} block />
          <Formula
            tex={'g(p) = \\mathrm{lcm}\\{m_{\\alpha}(p),\\, m_{\\alpha^2}(p),\\, \\dots,\\, m_{\\alpha^{2t}}(p)\\}'}
            block
          />
        </TheoryBox>
      </div>
    </div>
  );
}
