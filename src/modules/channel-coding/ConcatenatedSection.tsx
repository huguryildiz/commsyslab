import { useState } from 'react';
import { Panel, Slider, Readout, Formula, TheoryBox } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, logScale, drawLine, drawText } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { encodeConv, viterbiDecode, convBerSoftBound, freeDistance, BOOK_CODE } from '@/lib/dsp/convcodes';
import { rsParams } from '@/lib/dsp/reedsolomon';
import { uncodedBerBpsk } from '@/lib/dsp/blockcodes';
import {
  concatRate,
  concatDmin,
  burstErrorsPerCodeword,
  isCorrectable,
  concatOutputBer,
} from '@/lib/dsp/concatenated';
import { ConcatChainDiagram } from './ConcatChainDiagram';
import { t } from '@/i18n';

// Canonical system: outer RS(15,11)/GF(16), inner convolutional (2,1,3) BOOK_CODE.
const RS = rsParams(4, 11); // N=15, K=11, t=2
const INNER_INFO = [1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1];

function drawConcatCurve(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const XMIN = 0;
  const XMAX = 8;
  const YMIN = 1e-9;
  const YMAX = 0.5;
  const ax = { x: linScale([XMIN, XMAX], [44, w - 12]), y: logScale([YMIN, YMAX], [h - 24, 10]) };
  const clampY = (v: number) => Math.min(YMAX, Math.max(YMIN, v));
  const xs: number[] = [];
  const unc: number[] = [];
  const inner: number[] = [];
  const cc: number[] = [];
  for (let db = XMIN; db <= XMAX + 1e-9; db += 0.2) {
    xs.push(db);
    unc.push(clampY(uncodedBerBpsk(db)));
    inner.push(clampY(convBerSoftBound(BOOK_CODE, db)));
    cc.push(clampY(concatOutputBer(db, RS.N, RS.K, 4)));
  }
  drawLine(ctx, ax, xs, unc, CHART.green, 2);
  drawLine(ctx, ax, xs, inner, alpha(CHART.blue, 0.9), 2);
  drawLine(ctx, ax, xs, cc, CHART.pink, 2);
  drawText(ctx, ax, XMAX, clampY(uncodedBerBpsk(XMAX)), 'uncoded', CHART.green, -42, -3);
  drawText(ctx, ax, XMAX, clampY(convBerSoftBound(BOOK_CODE, XMAX)), 'inner', CHART.blue, -30, -3);
  drawText(ctx, ax, XMAX, clampY(concatOutputBer(XMAX, RS.N, RS.K, 4)), 'concat', CHART.pink, -34, 8);
}

export function ConcatenatedSection() {
  const [depth, setDepth] = useState(4);
  const [burstLen, setBurstLen] = useState(6);
  const [innerStart, setInnerStart] = useState(6);
  const [innerLen, setInnerLen] = useState(5);
  const [interleave, setInterleave] = useState(true);

  // rate / distance composition
  const rcInner = 0.5;
  const rcOuter = RS.K / RS.N;
  const dInner = freeDistance(BOOK_CODE);
  const rcc = concatRate(rcOuter, rcInner);
  const dcc = concatDmin(RS.dmin, dInner);

  // inner Viterbi burst realization
  const coded = encodeConv(INNER_INFO, BOOK_CODE);
  const received = coded.map((b, i) => (i >= innerStart && i < innerStart + innerLen ? b ^ 1 : b));
  const decoded = viterbiDecode(received, BOOK_CODE).decoded;
  const innerErr = decoded.map((b, i) => (b !== INNER_INFO[i] ? 1 : 0));

  // interleaver grid
  const activeCounts = burstErrorsPerCodeword(RS.N, depth, 0, burstLen, interleave);
  const ok = isCorrectable(activeCounts, RS.t);
  const cellHit = (cw: number, col: number): boolean => {
    const pos = interleave ? col * depth + cw : cw * RS.N + col;
    return pos >= 0 && pos < burstLen;
  };

  return (
    <div className="cc-section">
      <aside className="cc-controls">
        <Panel title={t('cc.cc.compose')}>
          <div className="cc-readouts">
            <Readout label="rc inner" value={rcInner.toFixed(2)} />
            <Readout label="Rc outer" value={rcOuter.toFixed(3)} />
            <Readout label="Rcc" value={rcc.toFixed(3)} />
            <Readout label="d inner" value={dInner} />
            <Readout label="d outer" value={RS.dmin} />
            <Readout label="d_cc" value={dcc} />
          </div>
        </Panel>
        <Panel title={t('cc.cc.interTitle')}>
          <Slider label={t('cc.cc.depth')} value={depth} min={1} max={6} step={1} onChange={setDepth} />
          <Slider label={t('cc.cc.burst')} value={burstLen} min={0} max={RS.N} step={1} onChange={setBurstLen} />
          <label className="cc-cc-toggle">
            <input type="checkbox" checked={interleave} onChange={(e) => setInterleave(e.target.checked)} />
            {t('cc.cc.interleaveOn')}
          </label>
        </Panel>
        <Panel title={t('cc.cc.innerTitle')}>
          <Slider
            label={t('cc.cc.innerBurstPos')}
            value={innerStart}
            min={0}
            max={coded.length - 1}
            step={1}
            onChange={setInnerStart}
          />
          <Slider label={t('cc.cc.innerBurstLen')} value={innerLen} min={0} max={10} step={1} onChange={setInnerLen} />
        </Panel>
      </aside>

      <div className="cc-content">
        <Panel title={t('cc.cc.chain')}>
          <ConcatChainDiagram />
        </Panel>

        <Panel title={t('cc.cc.compose')}>
          <Formula tex={'R_{cc} = R_c \\cdot r_c, \\qquad d_{cc} = d_{\\mathrm{outer}} \\cdot d_{\\mathrm{inner}}'} block />
          <p className="cc-cy-line">
            Rcc = {rcOuter.toFixed(3)} · {rcInner.toFixed(2)} = {rcc.toFixed(3)} ; d_cc = {RS.dmin} · {dInner} ={' '}
            {dcc}
          </p>
        </Panel>

        <Panel title={t('cc.cc.innerTitle')}>
          <div className="cc-bc-row">
            <span className="cc-bc-row-label">{t('cc.cc.decoded')}</span>
            <div className="cc-bc-bits">
              {decoded.map((b, i) => (
                <span key={i} className={`cc-bit cc-bit--ro ${innerErr[i] ? 'cc-bit--err cc-bit--on' : ''}`}>
                  {b}
                </span>
              ))}
            </div>
          </div>
          <p className="cc-cy-line">{t('cc.cc.innerNote')}</p>
        </Panel>

        <Panel title={t('cc.cc.interTitle')}>
          <div className="cc-cc-grid" style={{ gridTemplateColumns: `repeat(${RS.N}, 16px)` }}>
            {Array.from({ length: depth }).flatMap((_, cw) =>
              Array.from({ length: RS.N }).map((__, col) => (
                <div key={`${cw}-${col}`} className={`cc-cc-cell ${cellHit(cw, col) ? 'hit' : ''}`} />
              )),
            )}
          </div>
          <div>
            {activeCounts.map((c, cw) => (
              <div key={cw} className="cc-cc-row">
                <span className={`cc-cc-rowbadge ${c <= RS.t ? 'ok' : 'bad'}`}>
                  RS#{cw}: {c} err {c <= RS.t ? '✓≤t' : '✗>t'}
                </span>
              </div>
            ))}
          </div>
          <p className={`cc-cc-verdict ${ok ? 'ok' : 'bad'}`}>{ok ? t('cc.cc.recovered') : t('cc.cc.lost')}</p>
        </Panel>

        <Panel title={t('cc.cc.curve')}>
          <Canvas height={260} ariaLabel="Concatenated coding gain curve" deps={[]} draw={(ctx, w, h) => drawConcatCurve(ctx, w, h)} />
          <p className="cc-cy-line">{t('cc.cc.curveNote')}</p>
        </Panel>

        <TheoryBox>
          <Formula tex={'R_{cc} = R_c r_c \\quad (\\text{Eq. } 9.8.1), \\qquad d_{cc} = d_o d_i'} block />
          <p>
            Inner convolutional + Viterbi errors are bursty; an interleaver spreads them across RS
            codewords so each stays within the correction radius t. Deep-space (Voyager) used a
            (255,223) RS outer code over a convolutional inner code for ≈ 8 dB gain (§9.10.1).
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}
