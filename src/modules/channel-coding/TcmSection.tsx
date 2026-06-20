import { useState } from 'react';
import { Panel, Readout, Formula, TheoryBox, InfoCard, TransportControls } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { CHART, alpha } from '@/lib/plot/colors';
import { useSimulationLoop } from '@/lib/sim/useSimulationLoop';
import {
  psk8,
  SET_PARTITION,
  partitionDistances,
  MOD_LOSS_DB,
  TCM_4STATE_GAIN_DB,
} from '@/lib/dsp/tcm';
import { t } from '@/i18n';

const PALETTE = [CHART.green, CHART.orange, CHART.blue, CHART.pink];

export function TcmSection() {
  const [level, setLevel] = useState(0);
  const dists = partitionDistances();

  const loop = useSimulationLoop({
    ticksPerSecond: 0.8,
    onTick: () => setLevel((l) => (l + 1) % SET_PARTITION.length),
    onReset: () => setLevel(0),
  });

  // subset index of each 8-PSK point at the current level
  const subsetOf = (i: number): number =>
    SET_PARTITION[level].subsets.findIndex((s) => s.includes(i));

  return (
    <div className="cc-section">
      <aside className="cc-controls">
        <Panel title={t('cc.tc.params')}>
          <TransportControls loop={loop} />
          <div className="cc-readouts">
            <Readout label={t('cc.tc.level')} value={SET_PARTITION[level].level} tone="ok" />
            <Readout label="Δ₀" value={dists[0].toFixed(3)} />
            <Readout label="Δ₁" value={dists[1].toFixed(3)} />
            <Readout label="Δ₂" value={dists[2].toFixed(3)} />
            <Readout label={t('cc.tc.modloss')} value={`${MOD_LOSS_DB.toFixed(2)} dB`} tone="warn" />
            <Readout label={t('cc.tc.gain')} value={`${TCM_4STATE_GAIN_DB.toFixed(1)} dB`} tone="ok" />
          </div>
        </Panel>
      </aside>

      <div className="cc-content">
        <Panel title={t('cc.tc.treeTitle')}>
          <Canvas
            height={260}
            ariaLabel="8-PSK set-partition tree"
            deps={[level]}
            draw={(ctx, w, h) => drawPartitionTree(ctx, w, h, level, dists)}
          />
        </Panel>

        <Panel title={t('cc.tc.constTitle')}>
          <Canvas
            height={260}
            ariaLabel="8-PSK constellation colored by current set-partition subset"
            deps={[level]}
            draw={(ctx, w, h) => drawConstellation(ctx, w, h, subsetOf)}
          />
        </Panel>

        <div className="info-cards">
          <InfoCard title={t('cc.tc.card.combined')} accent="green">
            <p>{t('cc.tc.card.combinedBody')}</p>
          </InfoCard>
          <InfoCard title={t('cc.tc.card.partition')} accent="orange">
            <p>{t('cc.tc.card.partitionBody')}</p>
            <Formula tex="\Delta_0<\Delta_1<\Delta_2:\ 2\sin\tfrac{\pi}{8}<\sqrt2<2" block />
          </InfoCard>
          <InfoCard title={t('cc.tc.card.mapping')} accent="blue">
            <p>{t('cc.tc.card.mappingBody')}</p>
          </InfoCard>
          <InfoCard title={t('cc.tc.card.gain')} accent="green">
            <p>{t('cc.tc.card.gainBody')}</p>
          </InfoCard>
          <InfoCard title={t('cc.app.modems')} accent="orange">
            <p>{t('cc.app.modemsBody')}</p>
          </InfoCard>
        </div>

        <TheoryBox title={t('cc.theory')}>
          <Formula tex="\text{8-PSK}\ \to\ \{B_0,B_1\}\ \to\ \{C_0,C_1,C_2,C_3\}\ \to\ \text{singletons}" block />
          <Formula tex="G_a=10\log_{10}\frac{d^2_{\text{free,TCM}}}{d^2_{\text{ref}}}\approx 3\ \text{dB over uncoded QPSK}" block />
        </TheoryBox>
      </div>
    </div>
  );
}

/** Draw the 4-level set-partition tree; subsets at levels ≤ current are highlighted with Δ labels. */
function drawPartitionTree(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  level: number,
  dists: number[],
): void {
  const rows = SET_PARTITION.length;
  const rowY = (r: number) => 30 + (r * (h - 50)) / (rows - 1);
  const nodeX = (count: number, i: number) => ((i + 0.5) * w) / count;

  // edges parent → child (a subset's children are the two halves at the next level)
  for (let r = 0; r < rows - 1; r++) {
    const parents = SET_PARTITION[r].subsets;
    const children = SET_PARTITION[r + 1].subsets;
    children.forEach((child, ci) => {
      const pi = parents.findIndex((p) => child.every((x) => p.includes(x)));
      ctx.strokeStyle = alpha(CHART.dim, r + 1 <= level ? 0.7 : 0.25);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(nodeX(parents.length, pi), rowY(r) + 8);
      ctx.lineTo(nodeX(children.length, ci), rowY(r + 1) - 8);
      ctx.stroke();
    });
  }
  // nodes
  for (let r = 0; r < rows; r++) {
    const subsets = SET_PARTITION[r].subsets;
    subsets.forEach((s, i) => {
      const x = nodeX(subsets.length, i);
      const y = rowY(r);
      const active = r <= level;
      ctx.fillStyle = active ? alpha(PALETTE[i % PALETTE.length], 0.85) : alpha(CHART.dim, 0.25);
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();
      if (subsets.length <= 4) {
        ctx.fillStyle = active ? CHART.text : CHART.dim;
        ctx.font = '9px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.join(''), x, y + 20);
      }
    });
    // Δ label per level (intra-subset min distance), levels A,B,C
    if (r < 3) {
      ctx.fillStyle = r <= level ? CHART.text : CHART.dim;
      ctx.font = '11px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`Δ${r}=${dists[r].toFixed(2)}`, 4, rowY(r));
    }
  }
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
}

/** Draw the 8-PSK constellation; each point colored by its subset at the current level. */
function drawConstellation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  subsetOf: (i: number) => number,
): void {
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) / 2 - 30;
  // unit circle
  ctx.strokeStyle = alpha(CHART.dim, 0.4);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const p = psk8(i);
    const x = cx + p.x * R;
    const y = cy - p.y * R;
    const col = PALETTE[subsetOf(i) % PALETTE.length];
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = CHART.text;
    ctx.font = '10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i), x, y);
  }
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
}
