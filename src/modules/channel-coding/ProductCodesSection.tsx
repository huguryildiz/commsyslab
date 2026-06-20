import { useMemo, useState } from 'react';
import { Panel, Toggle, Readout, Formula, TheoryBox, InfoCard, TransportControls } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { CHART, alpha } from '@/lib/plot/colors';
import { useSimulationLoop } from '@/lib/sim/useSimulationLoop';
import {
  productParams,
  spcProductEncode,
  rowSyndromes,
  colSyndromes,
  spcProductDecode,
} from '@/lib/dsp/productcodes';
import { t } from '@/i18n';

// Data block: 3 rows × 4 cols → SPC×SPC product is a 4×5 codeword grid (d_min = 4, t = 1).
const DATA: number[][] = [
  [1, 0, 1, 1],
  [0, 1, 1, 0],
  [1, 1, 0, 1],
];

export function ProductCodesSection() {
  const [data, setData] = useState<number[][]>(DATA);
  const [errIdx, setErrIdx] = useState(0);
  const [extra, setExtra] = useState(false);

  const encoded = useMemo(() => spcProductEncode(data), [data]);
  const rows = encoded.length;
  const cols = encoded[0].length;
  const cells = rows * cols;

  // Received grid = codeword with a single swept error (+ optional 2nd error to show failure).
  const received = useMemo(() => {
    const g = encoded.map((r) => r.slice());
    const r = Math.floor(errIdx / cols);
    const c = errIdx % cols;
    g[r][c] ^= 1;
    if (extra) {
      const r2 = r;
      const c2 = (c + 1) % cols; // second error in the same row → uncorrectable
      g[r2][c2] ^= 1;
    }
    return g;
  }, [encoded, errIdx, cols, extra]);

  const rs = rowSyndromes(received);
  const cs = colSyndromes(received);
  const dec = spcProductDecode(received);
  const params = productParams(cols, cols - 1, 2, rows, rows - 1, 2);

  const loop = useSimulationLoop({
    ticksPerSecond: 1.5,
    onTick: () => setErrIdx((i) => (i + 1) % cells),
    onReset: () => setErrIdx(0),
  });

  const toggleData = (r: number, c: number) =>
    setData((d) => d.map((row, i) => row.map((b, j) => (i === r && j === c ? b ^ 1 : b))));

  const statusTone = dec.status === 'corrected' ? 'ok' : dec.status === 'clean' ? 'default' : 'err';

  return (
    <div className="cc-section">
      <aside className="cc-controls">
        <Panel title={t('cc.pc.data')}>
          <p className="cc-bc-hint">{t('cc.pc.dataHint')}</p>
          <div className="cc-pc-edit">
            {data.map((row, r) =>
              row.map((b, c) => (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  className={b ? 'cc-bit cc-bit--x cc-bit--on' : 'cc-bit'}
                  style={{ gridColumn: c + 1, gridRow: r + 1 }}
                  onClick={() => toggleData(r, c)}
                >
                  {b}
                </button>
              )),
            )}
          </div>
          <Toggle label={t('cc.pc.extra')} checked={extra} onChange={setExtra} />
        </Panel>
        <Panel title={t('cc.pc.params')}>
          <div className="cc-readouts">
            <Readout label="n" value={params.n} />
            <Readout label="k" value={params.k} />
            <Readout label="Rc" value={params.rate.toFixed(3)} />
            <Readout label="d_min" value={params.dmin} tone="ok" />
            <Readout label="t" value={params.t} tone="ok" />
          </div>
        </Panel>
      </aside>

      <div className="cc-content">
        <Panel title={t('cc.pc.decodeTitle')}>
          <TransportControls loop={loop} />
          <Canvas
            height={260}
            ariaLabel="Product-code crossword decoding grid with row and column syndromes"
            deps={[received, dec.status]}
            draw={(ctx, w, h) => drawProductGrid(ctx, w, h, received, rs, cs, dec)}
          />
          <div className="cc-readouts">
            <Readout label={t('cc.pc.status')} value={t(`cc.pc.${dec.status}`)} tone={statusTone} />
            <Readout
              label={t('cc.pc.located')}
              value={dec.pos ? `r${dec.pos[0]}, c${dec.pos[1]}` : '—'}
            />
          </div>
        </Panel>

        <div className="info-cards">
          <InfoCard title={t('cc.pc.card.product')} accent="green">
            <p>{t('cc.pc.card.productBody')}</p>
          </InfoCard>
          <InfoCard title={t('cc.pc.card.dmin')} accent="orange">
            <p>{t('cc.pc.card.dminBody')}</p>
            <Formula tex="(n_1 n_2,\,k_1 k_2),\quad d_{\min}=d_{\min,1}\,d_{\min,2}" block />
          </InfoCard>
          <InfoCard title={t('cc.pc.card.iter')} accent="blue">
            <p>{t('cc.pc.card.iterBody')}</p>
          </InfoCard>
          <InfoCard title={t('cc.pc.card.turbo')} accent="blue">
            <p>{t('cc.pc.card.turboBody')}</p>
          </InfoCard>
        </div>

        <TheoryBox title={t('cc.theory')}>
          <Formula tex="\text{Product of }(n_1,k_1,d_1)\times(n_2,k_2,d_2)=(n_1 n_2,\,k_1 k_2,\,d_1 d_2)" block />
          <Formula tex="t=\left\lfloor\tfrac{d_{\min}-1}{2}\right\rfloor;\ \text{iterative row/column decoding approaches ML}" block />
        </TheoryBox>
      </div>
    </div>
  );
}

/** Draw the (m+1)×(n+1) product grid: data vs parity shading, error cells, row/col syndromes, fix. */
function drawProductGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  grid: number[][],
  rs: boolean[],
  cs: boolean[],
  dec: { pos: [number, number] | null; status: string },
): void {
  const rows = grid.length;
  const cols = grid[0].length;
  const padL = 8;
  const padT = 8;
  const cw = (w - padL - 40) / cols; // leave room for row-syndrome column
  const ch = (h - padT - 30) / rows; // leave room for col-syndrome row
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = padL + c * cw;
      const y = padT + r * ch;
      const isParity = r === rows - 1 || c === cols - 1;
      ctx.fillStyle = isParity ? alpha(CHART.blue, 0.1) : alpha(CHART.green, 0.08);
      ctx.fillRect(x, y, cw - 2, ch - 2);
      ctx.strokeStyle = alpha(CHART.dim, 0.4);
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cw - 2, ch - 2);
      // located error cell highlight
      if (dec.pos && dec.pos[0] === r && dec.pos[1] === c) {
        ctx.strokeStyle = CHART.green;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x + 1, y + 1, cw - 4, ch - 4);
      }
      ctx.fillStyle = rs[r] && cs[c] ? CHART.pink : isParity ? CHART.blue : CHART.text;
      ctx.font = '12px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(grid[r][c]), x + cw / 2 - 1, y + ch / 2);
    }
  }
  // row syndromes (right margin)
  const sx = padL + cols * cw + 6;
  for (let r = 0; r < rows; r++) {
    ctx.fillStyle = rs[r] ? CHART.pink : alpha(CHART.dim, 0.6);
    ctx.beginPath();
    ctx.arc(sx + 8, padT + r * ch + ch / 2, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  // column syndromes (bottom margin)
  const sy = padT + rows * ch + 6;
  for (let c = 0; c < cols; c++) {
    ctx.fillStyle = cs[c] ? CHART.pink : alpha(CHART.dim, 0.6);
    ctx.beginPath();
    ctx.arc(padL + c * cw + cw / 2 - 1, sy + 8, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
}
