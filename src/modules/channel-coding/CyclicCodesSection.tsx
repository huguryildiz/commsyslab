import { useEffect, useMemo, useRef, useState } from 'react';
import { Panel, Select, Readout, Formula, TheoryBox } from '@/components';
import {
  CYCLIC_PRESETS,
  polyDeg,
  polyToString,
  dividesPn1,
  encodeCyclic,
  crcRemainder,
  syndrome,
  cyclicShiftRight,
  lfsrTrace,
  type CyclicPreset,
} from '@/lib/dsp/cyclic';
import { LfsrDiagram } from './LfsrDiagram';
import { t } from '@/i18n';

type PresetId = 'c74a' | 'c74h' | 'c1511' | 'crc4' | 'crc8';

// default message of a given length: alternating 1,0,1,0,... (non-trivial, deterministic)
const defaultMsg = (len: number): number[] => Array.from({ length: len }, (_, i) => (i % 2 === 0 ? 1 : 0));

// display helper: LSB-first coeff array → MSB-first bit string array (highest degree first)
const toDisplay = (a: number[]): number[] => a.slice().reverse();

export function CyclicCodesSection() {
  const [presetId, setPresetId] = useState<PresetId>('c74a');
  const preset = CYCLIC_PRESETS.find((p) => p.id === presetId) as CyclicPreset;
  const g = preset.g;
  const dg = polyDeg(g);
  const [msg, setMsg] = useState<number[]>(() => defaultMsg(preset.msgLen));
  const [errorPattern, setErrorPattern] = useState<number[]>(() =>
    new Array(defaultMsg(preset.msgLen).length + dg).fill(0),
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const codeword = useMemo(() => encodeCyclic(msg, g), [msg, g]);
  const rem = crcRemainder(msg, g);
  const errors =
    errorPattern.length === codeword.length ? errorPattern : new Array<number>(codeword.length).fill(0);
  const received = codeword.map((b, i) => b ^ (errors[i] ?? 0));
  const syn = syndrome(received, g);
  const detected = syn.some((b) => b === 1);
  const trace = useMemo(() => lfsrTrace(msg, g), [msg, g]);
  const isCyclic = preset.kind === 'cyclic';
  const n = codeword.length;
  const divides = isCyclic && dividesPn1(g, n);

  // reset error pattern + animation when structural inputs change
  const sig = `${presetId}|${msg.join('')}`;
  const prevSig = useRef(sig);
  useEffect(() => {
    if (prevSig.current !== sig) {
      prevSig.current = sig;
      setErrorPattern(new Array(codeword.length).fill(0));
      setStepIndex(0);
      setPlaying(false);
    }
  }, [sig, codeword.length]);

  // animation timer
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setStepIndex((s) => {
        if (s >= trace.length - 1) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 650);
    return () => window.clearInterval(id);
  }, [playing, trace.length]);

  const selectPreset = (id: PresetId) => {
    const p = CYCLIC_PRESETS.find((pp) => pp.id === id) as CyclicPreset;
    setPresetId(id);
    setMsg(defaultMsg(p.msgLen));
  };
  const toggleMsg = (i: number) => setMsg((m) => m.map((b, j) => (j === i ? b ^ 1 : b)));
  const toggleErr = (i: number) =>
    setErrorPattern(() => {
      const base = errors.slice();
      base[i] ^= 1;
      return base;
    });

  const shifted = cyclicShiftRight(codeword);
  const shiftSyn = syndrome(shifted, g);

  return (
    <div className="cc-section">
      <aside className="cc-controls">
        <Panel title={t('cc.cy.code')}>
          <Select<PresetId>
            label={t('cc.cy.sel')}
            value={presetId}
            options={CYCLIC_PRESETS.map((p) => ({ value: p.id as PresetId, label: p.label }))}
            onChange={selectPreset}
          />
          <p className="cc-cy-poly">g(p) = {polyToString(g)}</p>
          <div className="cc-readouts">
            <Readout label="n" value={n} />
            <Readout label="k" value={msg.length} />
            <Readout label="deg g" value={dg} />
          </div>
          <p>
            {isCyclic ? (
              <span className={divides ? 'cc-cy-badge cc-cy-badge--ok' : 'cc-cy-badge'}>
                g(p) {t('cc.cy.divides')} {divides ? '✓' : '–'}
              </span>
            ) : (
              <span className="cc-cy-badge">{t('cc.cy.notCyclic')}</span>
            )}
          </p>
        </Panel>

        <Panel title={t('cc.cy.message')}>
          <div className="cc-bc-bits">
            {toDisplay(msg).map((b, i) => {
              const idx = msg.length - 1 - i;
              return (
                <button
                  key={idx}
                  type="button"
                  className={b ? 'cc-bit cc-bit--x cc-bit--on' : 'cc-bit'}
                  onClick={() => toggleMsg(idx)}
                >
                  {b}
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel title={t('cc.cy.errors')}>
          <p className="cc-bc-hint">{t('cc.cy.errorsHint')}</p>
          <div className="cc-bc-bits">
            {toDisplay(received).map((b, i) => {
              const idx = received.length - 1 - i;
              return (
                <button
                  key={idx}
                  type="button"
                  className={errors[idx] ? 'cc-bit cc-bit--err cc-bit--on' : 'cc-bit'}
                  onClick={() => toggleErr(idx)}
                >
                  {b}
                </button>
              );
            })}
          </div>
        </Panel>
      </aside>

      <div className="cc-content">
        <Panel title={t('cc.cy.encode')}>
          <BitRow label="m" bits={toDisplay(msg)} kind="x" />
          <BitRow label={t('cc.cy.rem')} bits={toDisplay(rem)} kind="rem" />
          <BitRow label={t('cc.cy.cw')} bits={toDisplay(codeword)} kind="cw" split={dg} />
        </Panel>

        <Panel title={t('cc.cy.lfsr')}>
          <LfsrDiagram g={g} trace={trace} stepIndex={stepIndex} />
          <div className="cc-cy-anim">
            <button type="button" className="cc-cy-btn" onClick={() => setPlaying((p) => !p)}>
              {playing ? t('cc.cy.pause') : t('cc.cy.play')}
            </button>
            <button
              type="button"
              className="cc-cy-btn"
              onClick={() => {
                setStepIndex(0);
                setPlaying(false);
              }}
            >
              {t('cc.cy.reset')}
            </button>
            <input
              type="range"
              min={0}
              max={trace.length - 1}
              step={1}
              value={Math.min(stepIndex, trace.length - 1)}
              onChange={(e) => {
                setPlaying(false);
                setStepIndex(Number(e.target.value));
              }}
            />
            <span className="cc-cy-line">
              {t('cc.cy.step')} {Math.min(stepIndex, trace.length - 1)}/{trace.length - 1}
            </span>
          </div>
        </Panel>

        {isCyclic && (
          <Panel title={t('cc.cy.shift')}>
            <BitRow label="c" bits={toDisplay(codeword)} kind="cw" split={dg} />
            <BitRow label="c≪1" bits={toDisplay(shifted)} kind="cw" />
            <p className="cc-cy-line">
              syndrome(c≪1) = {toDisplay(shiftSyn).join('')} {shiftSyn.every((b) => b === 0) ? '✓' : ''}
            </p>
          </Panel>
        )}

        <Panel title={t('cc.cy.detect')}>
          <BitRow label="r = c⊕e" bits={toDisplay(received)} kind="recv" errorMask={toDisplay(errors)} />
          <BitRow label={t('cc.cy.syn')} bits={toDisplay(syn)} kind="rem" />
          <p className={detected ? 'cc-cy-status cc-cy-status--ok' : 'cc-cy-status cc-cy-status--none'}>
            {detected ? t('cc.cy.ok') : t('cc.cy.none')}
          </p>
          <p className="cc-cy-line">{t('cc.cy.burst')}</p>
        </Panel>

        <TheoryBox title={t('cc.theory')}>
          <Formula tex="c(p)=X(p)\,g(p),\qquad c(p)=p^{\,n-k}m(p)+\operatorname{rem}\big[p^{\,n-k}m(p)\big]_{g(p)}" block />
          <Formula tex="g(p)\,\big|\,p^{n}+1,\qquad s(p)=r(p)\bmod g(p),\quad \text{CRC}=\operatorname{rem}" block />
        </TheoryBox>
      </div>
    </div>
  );
}

function BitRow({
  label,
  bits,
  kind,
  split,
  errorMask,
}: {
  label: string;
  bits: number[];
  kind: 'x' | 'rem' | 'cw' | 'recv';
  split?: number; // number of low (parity) bits, counted from the RIGHT of the display row
  errorMask?: number[];
}) {
  const n = bits.length;
  return (
    <div className="cc-bc-row">
      <span className="cc-bc-row-label">{label}</span>
      <div className="cc-bc-bits">
        {bits.map((b, i) => {
          let cls = 'cc-bit cc-bit--ro';
          if (errorMask && errorMask[i]) cls += ' cc-bit--err';
          else if (kind === 'x') cls += ' cc-bit--x';
          else if (kind === 'rem') cls += ' cc-bit--parity';
          else if (kind === 'cw' && split !== undefined && i >= n - split) cls += ' cc-bit--parity';
          if (b) cls += ' cc-bit--on';
          return (
            <span key={i} className={cls}>
              {b}
            </span>
          );
        })}
      </div>
    </div>
  );
}
