import { useEffect, useMemo, useRef, useState } from 'react';
import { Panel, Select, Slider, Readout, Formula, TheoryBox } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, logScale, drawLine, drawVLine, drawText } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import {
  makeConvCode,
  buildTrellis,
  encodeConv,
  freeDistance,
  isCatastrophic,
  viterbiDecode,
  convBerHardBound,
  convBerSoftBound,
  type ConvCode,
} from '@/lib/dsp/convcodes';
import { uncodedBerBpsk } from '@/lib/dsp/blockcodes';
import { TrellisDiagram } from './TrellisDiagram';
import { t } from '@/i18n';

// Sensible default taps per constraint length (book code for L=3).
const DEFAULT_TAPS: Record<number, { g1: number[]; g2: number[] }> = {
  3: { g1: [1, 0, 1], g2: [1, 1, 1] },
  4: { g1: [1, 1, 1, 1], g2: [1, 1, 0, 1] },
};

type LKey = '3' | '4';

const octal = (taps: number[]): string => {
  // show the conventional MSB-first octal of the tap word.
  let v = 0;
  for (let i = 0; i < taps.length; i++) v = (v << 1) | (taps[i] & 1);
  return v.toString(8);
};

export function ConvCodesSection() {
  const [L, setL] = useState(3);
  const [g1, setG1] = useState<number[]>(DEFAULT_TAPS[3].g1);
  const [g2, setG2] = useState<number[]>(DEFAULT_TAPS[3].g2);
  const [input, setInput] = useState<number[]>([1, 0, 1, 1]);
  const [errorPattern, setErrorPattern] = useState<number[]>(() => new Array(12).fill(0));
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ebN0Db, setEbN0Db] = useState(6);

  const code: ConvCode = useMemo(() => makeConvCode(L, g1, g2), [L, g1, g2]);
  const catastrophic = isCatastrophic(code);
  const dfree = freeDistance(code);
  const codeword = useMemo(() => encodeConv(input, code), [input, code]);
  // keep the error pattern sized to the codeword
  const errors =
    errorPattern.length === codeword.length
      ? errorPattern
      : new Array<number>(codeword.length).fill(0);
  const received = codeword.map((b, i) => b ^ (errors[i] ?? 0));
  const result = useMemo(() => viterbiDecode(received, code), [received, code]);
  const recovered =
    result.decoded.length === input.length && result.decoded.every((b, i) => b === input[i]);
  const numErr = errors.reduce((a, b) => a + b, 0);

  // when the structural inputs change, reset the error pattern + animation
  const sig = `${L}|${g1.join('')}|${g2.join('')}|${input.join('')}`;
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
        if (s >= result.steps.length) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 700);
    return () => window.clearInterval(id);
  }, [playing, result.steps.length]);

  const selectL = (next: number) => {
    setL(next);
    setG1(DEFAULT_TAPS[next].g1);
    setG2(DEFAULT_TAPS[next].g2);
  };
  const toggleTap = (which: 'g1' | 'g2', i: number) => {
    const set = which === 'g1' ? setG1 : setG2;
    set((taps) => taps.map((b, j) => (j === i ? b ^ 1 : b)));
  };
  const toggleInput = (i: number) => setInput((u) => u.map((b, j) => (j === i ? b ^ 1 : b)));
  const toggleErr = (i: number) =>
    setErrorPattern(() => {
      const base = errors.slice();
      base[i] ^= 1;
      return base;
    });

  const m = result.steps.length;

  return (
    <div className="cc-section">
      <aside className="cc-controls">
        <Panel title={t('cc.cv.params')}>
          <Select<LKey>
            label={t('cc.cv.L')}
            value={String(L) as LKey}
            options={[
              { value: '3', label: 'L = 3 (4 states)' },
              { value: '4', label: 'L = 4 (8 states)' },
            ]}
            onChange={(v) => selectL(Number(v))}
          />
          <div className="cc-bc-row">
            <span className="cc-bc-row-label">{t('cc.cv.g1')}</span>
            <div className="cc-cv-taps">
              {g1.map((b, i) => (
                <button
                  key={i}
                  type="button"
                  className={b ? 'cc-bit cc-bit--x cc-bit--on' : 'cc-bit'}
                  onClick={() => toggleTap('g1', i)}
                >
                  {b}
                </button>
              ))}
              <span className="cc-cv-octal">
                {octal(g1)} {t('cc.cv.octal')}
              </span>
            </div>
          </div>
          <div className="cc-bc-row">
            <span className="cc-bc-row-label">{t('cc.cv.g2')}</span>
            <div className="cc-cv-taps">
              {g2.map((b, i) => (
                <button
                  key={i}
                  type="button"
                  className={b ? 'cc-bit cc-bit--parity cc-bit--on' : 'cc-bit'}
                  onClick={() => toggleTap('g2', i)}
                >
                  {b}
                </button>
              ))}
              <span className="cc-cv-octal">
                {octal(g2)} {t('cc.cv.octal')}
              </span>
            </div>
          </div>
          <div className="cc-readouts">
            <Readout label="n" value={2} />
            <Readout label="k" value={1} />
            <Readout label="Rc" value="0.500" />
            <Readout label="states" value={code.nStates} />
            <Readout
              label="d_free"
              value={isFinite(dfree) ? dfree : '∞'}
              tone={catastrophic ? 'err' : 'ok'}
            />
          </div>
          {catastrophic && <p className="cc-cv-warn">{t('cc.cv.catWarn')}</p>}
        </Panel>

        <Panel title={t('cc.cv.input')}>
          <div className="cc-bc-bits">
            {input.map((b, i) => (
              <button
                key={i}
                type="button"
                className={b ? 'cc-bit cc-bit--x cc-bit--on' : 'cc-bit'}
                onClick={() => toggleInput(i)}
              >
                {b}
              </button>
            ))}
          </div>
        </Panel>

        <Panel title={t('cc.cv.errors')}>
          <p className="cc-bc-hint">{t('cc.cv.errorsHint')}</p>
          <div className="cc-bc-bits">
            {received.map((b, i) => (
              <button
                key={i}
                type="button"
                className={errors[i] ? 'cc-bit cc-bit--err cc-bit--on' : 'cc-bit'}
                onClick={() => toggleErr(i)}
              >
                {b}
              </button>
            ))}
          </div>
        </Panel>

        <Panel title={t('cc.cv.curveCtl')}>
          <Slider label="Eb/N₀" value={ebN0Db} min={0} max={10} step={0.5} unit="dB" onChange={setEbN0Db} />
        </Panel>
      </aside>

      <div className="cc-content">
        <Panel title={t('cc.cv.encoder')}>
          <Canvas
            height={150}
            ariaLabel="Encoder state-transition diagram"
            deps={[L, g1.join(''), g2.join('')]}
            draw={(ctx, w, h) => drawStateDiagram(ctx, w, h, code)}
          />
        </Panel>

        <Panel title={t('cc.cv.encode')}>
          <BitRow label="u" bits={input} kind="x" />
          <p className="cc-cv-line">
            + {code.L - 1} {t('cc.cv.tail')} → c ({codeword.length} bits)
          </p>
          <BitRow label="c" bits={codeword} kind="code" />
        </Panel>

        <Panel title={t('cc.cv.trellis')}>
          <TrellisDiagram code={code} result={result} stepIndex={stepIndex} />
          <div className="cc-cv-anim">
            <button type="button" className="cc-cv-btn" onClick={() => setPlaying((p) => !p)}>
              {playing ? t('cc.cv.pause') : t('cc.cv.play')}
            </button>
            <button
              type="button"
              className="cc-cv-btn"
              onClick={() => {
                setStepIndex(0);
                setPlaying(false);
              }}
            >
              {t('cc.cv.reset')}
            </button>
            <input
              type="range"
              min={0}
              max={m}
              step={1}
              value={Math.min(stepIndex, m)}
              onChange={(e) => {
                setPlaying(false);
                setStepIndex(Number(e.target.value));
              }}
            />
            <span className="cc-cv-octal">
              {t('cc.cv.step')} {Math.min(stepIndex, m)}/{m}
            </span>
          </div>
          <BitRow label="û" bits={result.decoded} kind="x" />
          <p className={recovered ? 'cc-cv-status cc-cv-status--ok' : 'cc-cv-status cc-cv-status--err'}>
            {recovered ? t('cc.cv.ok') : t('cc.cv.fail')} ({numErr} {t('cc.bc.errBits')},{' '}
            {t('cc.cv.metric')} = {isFinite(result.finalMetric) ? result.finalMetric : '∞'})
          </p>
        </Panel>

        <Panel title={t('cc.cv.curve')}>
          <Canvas
            height={260}
            ariaLabel="Convolutional coding gain: coded versus uncoded BER"
            deps={[L, g1.join(''), g2.join(''), ebN0Db]}
            draw={(ctx, w, h) => drawCodingGain(ctx, w, h, code, ebN0Db)}
          />
        </Panel>

        <TheoryBox title={t('cc.theory')}>
          <Formula tex="c_j(t)=\sum_{i} g_j[i]\,u_{t-i}\ (\mathrm{mod}\,2),\qquad R_c=\tfrac{k}{n}=\tfrac12" block />
          <Formula tex="\text{Viterbi: ML path } = \arg\min_{\text{trellis paths}} d_H(c,y),\qquad G_a\approx 10\log_{10}(R_c\,d_{\text{free}})\,\text{dB (soft)}" block />
        </TheoryBox>
      </div>
    </div>
  );
}

function BitRow({ label, bits, kind }: { label: string; bits: number[]; kind: 'x' | 'code' }) {
  return (
    <div className="cc-bc-row">
      <span className="cc-bc-row-label">{label}</span>
      <div className="cc-bc-bits">
        {bits.map((b, i) => {
          let cls = 'cc-bit cc-bit--ro';
          if (kind === 'x') cls += ' cc-bit--x';
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

/** Encoder state-transition diagram: states on a circle, labelled input/out edges. */
function drawStateDiagram(ctx: CanvasRenderingContext2D, w: number, h: number, code: ConvCode): void {
  const tr = buildTrellis(code);
  const nS = code.nStates;
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) / 2 - 24;
  const pos = (s: number): [number, number] => {
    const a = -Math.PI / 2 + (2 * Math.PI * s) / nS;
    return [cx + R * Math.cos(a), cy + R * Math.sin(a)];
  };
  // edges
  ctx.font = '9px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let s = 0; s < nS; s++) {
    for (const br of tr[s]) {
      const [x1, y1] = pos(s);
      const [x2, y2] = pos(br.next);
      ctx.strokeStyle = br.input === 1 ? alpha(CHART.orange, 0.7) : alpha(CHART.green, 0.6);
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (s === br.next) {
        ctx.arc(x1, y1 - 12, 9, 0, Math.PI * 2); // self-loop
      } else {
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();
      const mx = s === br.next ? x1 : (x1 + x2) / 2;
      const my = s === br.next ? y1 - 24 : (y1 + y2) / 2;
      ctx.fillStyle = CHART.dim;
      ctx.fillText(`${br.input}/${br.out.join('')}`, mx, my);
    }
  }
  // nodes
  for (let s = 0; s < nS; s++) {
    const [x, y] = pos(s);
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fillStyle = CHART.bgDeep;
    ctx.fill();
    ctx.strokeStyle = CHART.blue;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = CHART.text;
    ctx.fillText(s.toString(2).padStart(code.L - 1, '0'), x, y);
  }
}

/** BER vs Eb/N0 (log y): uncoded, hard-Viterbi bound, soft-Viterbi bound. */
function drawCodingGain(ctx: CanvasRenderingContext2D, w: number, h: number, code: ConvCode, ebCur: number): void {
  const XMIN = 0;
  const XMAX = 10;
  const YMIN = 1e-7;
  const YMAX = 0.5;
  const ax = { x: linScale([XMIN, XMAX], [40, w - 10]), y: logScale([YMIN, YMAX], [h - 24, 10]) };
  const clampY = (v: number) => Math.min(YMAX, Math.max(YMIN, v));
  const xs: number[] = [];
  const unc: number[] = [];
  const hard: number[] = [];
  const soft: number[] = [];
  for (let db = XMIN; db <= XMAX + 1e-9; db += 0.25) {
    xs.push(db);
    unc.push(clampY(uncodedBerBpsk(db)));
    hard.push(clampY(convBerHardBound(code, db)));
    soft.push(clampY(convBerSoftBound(code, db)));
  }
  drawLine(ctx, ax, xs, unc, CHART.green, 2);
  drawLine(ctx, ax, xs, hard, CHART.orange, 2);
  drawLine(ctx, ax, xs, soft, alpha(CHART.blue, 0.9), 1.5, true);
  drawVLine(ctx, ax, ebCur, YMIN, YMAX, alpha(CHART.pink, 0.8), true, 1.5);
  drawText(ctx, ax, 0.3, clampY(uncodedBerBpsk(0.3)), 'uncoded', CHART.green, 4, -4);
  drawText(ctx, ax, XMAX, clampY(convBerHardBound(code, XMAX)), 'hard', CHART.orange, -26, -4);
  drawText(ctx, ax, XMAX, clampY(convBerSoftBound(code, XMAX)), 'soft', CHART.blue, -26, 10);
}
