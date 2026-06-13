import { useState } from 'react';
import { Panel, Slider, Segmented, Readout, Formula, TheoryBox } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import {
  linScale,
  drawAxes,
  drawLine,
  drawScatter,
  drawVLine,
  drawArrow,
  drawText,
} from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import {
  bscTransition,
  becTransition,
  mutualInformation,
  awgnHardCrossover,
  awgnSoftCapacityPerUse,
  biAwgnCapacityPerUse,
  bscCapacity,
  becCapacity,
  snrDbToLinear,
} from '@/lib/dsp/capacity';
import { entropy } from '@/lib/dsp/entropy';
import { t } from '@/i18n';

type ChannelKind = 'bsc' | 'bec' | 'awgn';

export function ChannelsCapacitySection() {
  const [kind, setKind] = useState<ChannelKind>('bsc');
  const [eps, setEps] = useState(0.1);
  const [pErase, setPErase] = useState(0.2);
  const [ebN0Db, setEbN0Db] = useState(4);
  const [px0, setPx0] = useState(0.5);

  // Induced transition matrix for the selected channel.
  const ebN0 = snrDbToLinear(ebN0Db);
  const epsEff = kind === 'awgn' ? awgnHardCrossover(ebN0) : eps;
  const P = kind === 'bec' ? becTransition(pErase) : bscTransition(epsEff);
  const px = [px0, 1 - px0];

  // Output distribution and entropies for the readouts.
  const nOut = P[0].length;
  const py = new Array<number>(nOut).fill(0);
  for (let x = 0; x < 2; x++) for (let y = 0; y < nOut; y++) py[y] += px[x] * P[x][y];
  const HY = entropy(py);
  const HYgivenX = px[0] * entropy(P[0]) + px[1] * entropy(P[1]);
  const I = mutualInformation(px, P);
  const capacity = kind === 'bec' ? becCapacity(pErase) : bscCapacity(epsEff);

  // I(X;Y) vs P(X=0) sweep; argmax = capacity-achieving input distribution.
  const sweepN = 100;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= sweepN; i++) {
    const a = i / sweepN;
    xs.push(a);
    ys.push(mutualInformation([a, 1 - a], P));
  }
  let argmax = 0;
  for (let i = 1; i < ys.length; i++) if (ys[i] > ys[argmax]) argmax = i;

  return (
    <div className="cc-section">
      <aside className="cc-controls">
        <Panel title={t('cc.ch.title')}>
          <Segmented<ChannelKind>
            ariaLabel={t('cc.ch.kind')}
            value={kind}
            options={[
              { value: 'bsc', label: t('cc.ch.bsc') },
              { value: 'bec', label: t('cc.ch.bec') },
              { value: 'awgn', label: t('cc.ch.awgn') },
            ]}
            onChange={setKind}
          />
          {kind === 'bsc' && (
            <Slider label={t('cc.ch.eps')} value={eps} min={0} max={0.5} step={0.01} onChange={setEps} />
          )}
          {kind === 'bec' && (
            <Slider label={t('cc.ch.perase')} value={pErase} min={0} max={1} step={0.01} onChange={setPErase} />
          )}
          {kind === 'awgn' && (
            <>
              <Slider label={t('cc.ch.ebn0')} value={ebN0Db} min={-2} max={12} step={0.5} unit="dB" onChange={setEbN0Db} />
              <Readout label={t('cc.ch.epsInduced')} value={epsEff.toFixed(4)} />
            </>
          )}
          <Slider label={t('cc.ch.px0')} value={px0} min={0} max={1} step={0.01} onChange={setPx0} />
        </Panel>
        <Panel title={t('cc.ch.readouts')}>
          <div className="cc-readouts">
            <Readout label="H(Y)" value={HY.toFixed(3)} unit="bits" />
            <Readout label="H(Y|X)" value={HYgivenX.toFixed(3)} unit="bits" />
            <Readout label="I(X;Y)" value={I.toFixed(3)} unit="bits" />
            <Readout label={t('cc.ch.capacity')} value={capacity.toFixed(3)} unit="bits" tone="ok" />
          </div>
        </Panel>
      </aside>

      <div className="cc-content">
        <Panel title={t('cc.ch.diagram')}>
          <Canvas
            height={180}
            ariaLabel="Channel transition diagram"
            deps={[kind, epsEff, pErase]}
            draw={(ctx, w, h) => drawTransitionDiagram(ctx, w, h, kind, epsEff, pErase)}
          />
        </Panel>
        <Panel title={t('cc.ch.micurve')}>
          <Canvas
            height={220}
            ariaLabel="Mutual information versus input distribution"
            deps={[kind, epsEff, pErase, px0]}
            draw={(ctx, w, h) => {
              const ax = { x: linScale([0, 1], [34, w - 10]), y: linScale([0, 1.05], [h - 22, 10]) };
              drawAxes(ctx, ax, [0, 1]);
              drawLine(ctx, ax, xs, ys, CHART.blue, 2);
              drawScatter(ctx, ax, [xs[argmax]], [ys[argmax]], CHART.green, 4);
              drawText(ctx, ax, xs[argmax], ys[argmax], `C=${ys[argmax].toFixed(3)}`, CHART.green);
              drawVLine(ctx, ax, px0, 0, 1.05, alpha(CHART.orange, 0.9), true, 1.5);
              drawScatter(ctx, ax, [px0], [I], CHART.orange, 4);
              drawText(ctx, ax, 0.02, 1.0, 'I(X;Y) vs P(X=0)', CHART.dim, 0, 0);
            }}
          />
        </Panel>
        {kind === 'awgn' && (
          <Panel title={t('cc.ch.softhard')}>
            <Canvas
              height={240}
              ariaLabel="Soft versus hard decision capacity"
              deps={[ebN0Db]}
              draw={(ctx, w, h) => drawSoftHard(ctx, w, h, ebN0Db)}
            />
          </Panel>
        )}
        <TheoryBox title={t('cc.theory')}>
          <Formula tex="C=\max_{p(x)} I(X;Y),\quad I(X;Y)=H(Y)-H(Y\mid X)" block />
          <Formula tex="C_{\mathrm{BSC}}=1-H_b(\varepsilon),\qquad C_{\mathrm{BEC}}=1-p" block />
          <Formula tex="\text{AWGN (hard): }\ \varepsilon=Q\!\left(\sqrt{2E_b/N_0}\right)" block />
        </TheoryBox>
      </div>
    </div>
  );
}

/** Draw a small p(y|x) transition diagram (inputs left, outputs right). */
function drawTransitionDiagram(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  kind: ChannelKind,
  eps: number,
  p: number,
): void {
  const ax = { x: linScale([0, 1], [0, w]), y: linScale([0, 1], [h, 0]) };
  const isBec = kind === 'bec';
  const inX = 0.22;
  const outX = 0.78;
  const inY = [0.7, 0.3];
  const outY = isBec ? [0.78, 0.5, 0.22] : [0.7, 0.3];
  const outLabels = isBec ? ['0', 'e', '1'] : ['0', '1'];
  // [fromInput, toOutput, prob, color]
  const edges: Array<[number, number, number, string]> = isBec
    ? [
        [0, 0, 1 - p, CHART.green],
        [0, 1, p, CHART.pink],
        [1, 1, p, CHART.pink],
        [1, 2, 1 - p, CHART.green],
      ]
    : [
        [0, 0, 1 - eps, CHART.green],
        [0, 1, eps, CHART.orange],
        [1, 0, eps, CHART.orange],
        [1, 1, 1 - eps, CHART.green],
      ];
  for (const [fi, to, prob, color] of edges) {
    drawArrow(ctx, ax, inX + 0.05, inY[fi], outX - 0.05, outY[to], alpha(color, 0.85), 1.5);
    const mx = (inX + outX) / 2;
    const my = (inY[fi] + outY[to]) / 2;
    drawText(ctx, ax, mx, my, prob.toFixed(2), color, 0, -2);
  }
  for (let i = 0; i < inY.length; i++) drawNode(ctx, ax, inX, inY[i], `${i}`);
  for (let i = 0; i < outY.length; i++) drawNode(ctx, ax, outX, outY[i], outLabels[i]);
  drawText(ctx, ax, inX, 0.95, 'X', CHART.dim, -4, 0);
  drawText(ctx, ax, outX, 0.95, 'Y', CHART.dim, -4, 0);
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  ax: { x: (v: number) => number; y: (v: number) => number },
  x: number,
  y: number,
  label: string,
): void {
  const px = ax.x(x);
  const py = ax.y(y);
  ctx.beginPath();
  ctx.arc(px, py, 12, 0, Math.PI * 2);
  ctx.fillStyle = CHART.bgDeep;
  ctx.fill();
  ctx.strokeStyle = CHART.dim;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = CHART.text;
  ctx.font = '12px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, px, py);
  ctx.textAlign = 'start';
}

/** Plot soft (BI-AWGN), hard (BSC) and unconstrained-Gaussian capacity vs Eb/N0 (dB). */
function drawSoftHard(ctx: CanvasRenderingContext2D, w: number, h: number, ebN0DbCur: number): void {
  const ax = { x: linScale([-2, 12], [34, w - 10]), y: linScale([0, 1.05], [h - 22, 10]) };
  drawAxes(ctx, ax, [-2, 12]);
  const xs: number[] = [];
  const soft: number[] = [];
  const hard: number[] = [];
  const gauss: number[] = [];
  for (let db = -2; db <= 12.0001; db += 0.25) {
    const lin = snrDbToLinear(db);
    xs.push(db);
    soft.push(biAwgnCapacityPerUse(lin));
    hard.push(bscCapacity(awgnHardCrossover(lin)));
    gauss.push(awgnSoftCapacityPerUse(lin));
  }
  drawLine(ctx, ax, xs, gauss, alpha(CHART.dim, 0.8), 1.5, true);
  drawLine(ctx, ax, xs, soft, CHART.blue, 2);
  drawLine(ctx, ax, xs, hard, CHART.orange, 2);
  drawVLine(ctx, ax, ebN0DbCur, 0, 1.05, alpha(CHART.green, 0.8), true, 1.5);
  drawText(ctx, ax, -1.8, 1.0, 'soft (BI-AWGN)', CHART.blue, 0, 0);
  drawText(ctx, ax, -1.8, 0.9, 'hard (BSC)', CHART.orange, 0, 0);
  drawText(ctx, ax, -1.8, 0.8, 'Gaussian ref', CHART.dim, 0, 0);
}
