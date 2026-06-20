import { useMemo, useState } from 'react';
import {
  Panel,
  Select,
  Slider,
  Segmented,
  Toggle,
  Readout,
  Formula,
  TheoryBox,
  TransportControls,
} from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, logScale, drawLine, drawVLine, drawText } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { useSimulationLoop } from '@/lib/sim/useSimulationLoop';
import {
  CODES,
  encode,
  decode,
  syndromeTable,
  errorCorrectionT,
  errorDetectionD,
  allCodewords,
  hammingDistance,
  uncodedBerBpsk,
  codedBerHard,
  codedBerSoftRef,
  type LinearCode,
} from '@/lib/dsp/blockcodes';
import { burstErrorsPerCodeword } from '@/lib/dsp/concatenated';
import { t } from '@/i18n';

type CodeId = 'hamming74' | 'hamming1511' | 'rep31';

export function BlockCodesSection() {
  const [codeId, setCodeId] = useState<CodeId>('hamming74');
  const code = CODES.find((c) => c.id === codeId) as LinearCode;
  const [message, setMessage] = useState<number[]>(() => new Array(4).fill(0));
  const [errorPattern, setErrorPattern] = useState<number[]>(() => new Array(7).fill(0));
  const [ebN0Db, setEbN0Db] = useState(8);

  const selectCode = (id: CodeId) => {
    const c = CODES.find((cc) => cc.id === id) as LinearCode;
    setCodeId(id);
    setMessage(new Array(c.k).fill(0));
    setErrorPattern(new Array(c.n).fill(0));
  };

  const table = useMemo(() => syndromeTable(code.H), [code]);
  const codeword = encode(message, code.G);
  const received = codeword.map((b, i) => b ^ errorPattern[i]);
  const dec = decode(received, code, table);
  const tt = errorCorrectionT(code.dmin);
  const numErr = errorPattern.reduce((a, b) => a + b, 0);
  const recovered = dec.message.every((b, i) => b === message[i]);

  const toggleMsg = (i: number) => setMessage((m) => m.map((b, j) => (j === i ? b ^ 1 : b)));
  const toggleErr = (i: number) => setErrorPattern((e) => e.map((b, j) => (j === i ? b ^ 1 : b)));

  return (
    <div className="cc-section">
      <aside className="cc-controls">
        <Panel title={t('cc.bc.code')}>
          <Select<CodeId>
            label={t('cc.bc.codeSel')}
            value={codeId}
            options={CODES.map((c) => ({ value: c.id as CodeId, label: c.label }))}
            onChange={selectCode}
          />
          <div className="cc-readouts">
            <Readout label="n" value={code.n} />
            <Readout label="k" value={code.k} />
            <Readout label="Rc" value={(code.k / code.n).toFixed(3)} />
            <Readout label="d_min" value={code.dmin} />
            <Readout label="t" value={tt} tone="ok" />
          </div>
        </Panel>
        <Panel title={t('cc.bc.message')}>
          <div className="cc-bc-bits">
            {message.map((b, i) => (
              <button
                key={i}
                type="button"
                className={b ? 'cc-bit cc-bit--x cc-bit--on' : 'cc-bit'}
                onClick={() => toggleMsg(i)}
              >
                {b}
              </button>
            ))}
          </div>
        </Panel>
        <Panel title={t('cc.bc.errors')}>
          <p className="cc-bc-hint">{t('cc.bc.errorsHint')}</p>
          <div className="cc-bc-bits">
            {received.map((b, i) => (
              <button
                key={i}
                type="button"
                className={errorPattern[i] ? 'cc-bit cc-bit--err cc-bit--on' : 'cc-bit'}
                onClick={() => toggleErr(i)}
              >
                {b}
              </button>
            ))}
          </div>
        </Panel>
        <Panel title={t('cc.bc.curveCtl')}>
          <Slider
            label="Eb/N₀"
            value={ebN0Db}
            min={0}
            max={12}
            step={0.5}
            unit="dB"
            onChange={setEbN0Db}
          />
        </Panel>
      </aside>

      <div className="cc-content">
        <Panel title={t('cc.bc.matrices')}>
          <div className="cc-bc-mtx-wrap">
            <div>
              <div className="cc-bc-mtx-label">G = [I | P]</div>
              <MatrixGrid m={code.G} split={code.k} identLeft />
            </div>
            <div>
              <div className="cc-bc-mtx-label">H = [Pᵀ | I]</div>
              <MatrixGrid m={code.H} split={code.k} identLeft={false} />
            </div>
          </div>
        </Panel>

        <Panel title={t('cc.bc.encode')}>
          <BitRow label="x" bits={message} kind="x" />
          <BitRow label="c = xG" bits={codeword} kind="code" split={code.k} />
        </Panel>

        <Panel title={t('cc.bc.decode')}>
          <BitRow label="r = c ⊕ e" bits={received} kind="recv" errorMask={errorPattern} />
          <BitRow label="s = rHᵀ" bits={dec.syndrome} kind="syn" />
          <p className="cc-bc-line">
            {dec.errorPos >= 0
              ? `${t('cc.bc.synPos')} ${dec.errorPos}`
              : dec.syndrome.every((b) => b === 0)
                ? t('cc.bc.synZero')
                : t('cc.bc.synNone')}
          </p>
          <BitRow label="ĉ" bits={dec.corrected} kind="code" split={code.k} />
          <BitRow label="x̂" bits={dec.message} kind="x" />
          <p
            className={
              recovered ? 'cc-bc-status cc-bc-status--ok' : 'cc-bc-status cc-bc-status--err'
            }
          >
            {recovered ? t('cc.bc.ok') : t('cc.bc.fail')} ({numErr} {t('cc.bc.errBits')}, t = {tt})
          </p>
        </Panel>

        <DetectionCorrectionSim />

        <BurstInterleaveSim />

        <Panel title={t('cc.bc.curve')}>
          <Canvas
            height={260}
            ariaLabel="Coding gain: coded versus uncoded BER"
            deps={[codeId, ebN0Db]}
            draw={(ctx, w, h) => drawCodingGain(ctx, w, h, code, ebN0Db)}
          />
        </Panel>

        {code.n === 3 && (
          <Panel title={t('cc.bc.cube')}>
            <Canvas
              height={240}
              ariaLabel="Hamming cube"
              deps={[codeId]}
              draw={(ctx, w, h) => drawCube(ctx, w, h, code)}
            />
          </Panel>
        )}

        <TheoryBox title={t('cc.theory')}>
          <Formula
            tex="c = xG,\qquad s = rH^{\mathsf T},\qquad G=[I_k\,|\,P],\ H=[P^{\mathsf T}\,|\,I_{n-k}]"
            block
          />
          <Formula
            tex="\text{Hamming}\,(2^m{-}1,\ 2^m{-}m{-}1,\ 3),\qquad t=\left\lfloor\tfrac{d_{\min}-1}{2}\right\rfloor"
            block
          />
        </TheoryBox>
      </div>
    </div>
  );
}

function MatrixGrid({ m, split, identLeft }: { m: number[][]; split: number; identLeft: boolean }) {
  return (
    <div className="cc-bc-mtx" style={{ gridTemplateColumns: `repeat(${m[0].length}, 1fr)` }}>
      {m.map((row, i) =>
        row.map((b, j) => {
          const isIdent = identLeft ? j < split : j >= split;
          return (
            <span
              key={`${i}-${j}`}
              className={`cc-bc-cell ${isIdent ? 'cc-bc-cell--ident' : 'cc-bc-cell--p'}`}
            >
              {b}
            </span>
          );
        }),
      )}
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
  kind: 'x' | 'code' | 'recv' | 'syn';
  split?: number;
  errorMask?: number[];
}) {
  return (
    <div className="cc-bc-row">
      <span className="cc-bc-row-label">{label}</span>
      <div className="cc-bc-bits">
        {bits.map((b, i) => {
          let cls = 'cc-bit cc-bit--ro';
          if (errorMask && errorMask[i]) cls += ' cc-bit--err';
          else if (kind === 'x') cls += ' cc-bit--x';
          else if (kind === 'syn') cls += ' cc-bit--syn';
          else if (kind === 'code' && split !== undefined && i >= split) cls += ' cc-bit--parity';
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

/** BER vs Eb/N0 (log y): uncoded, hard-decision coded, soft-decision reference. */
function drawCodingGain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  code: LinearCode,
  ebN0DbCur: number,
): void {
  const XMIN = 0;
  const XMAX = 12;
  const YMIN = 1e-6;
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
    hard.push(clampY(codedBerHard(code, db)));
    soft.push(clampY(codedBerSoftRef(code, db)));
  }
  drawLine(ctx, ax, xs, unc, CHART.green, 2);
  drawLine(ctx, ax, xs, hard, CHART.orange, 2);
  drawLine(ctx, ax, xs, soft, alpha(CHART.blue, 0.9), 1.5, true);
  drawVLine(ctx, ax, ebN0DbCur, YMIN, YMAX, alpha(CHART.pink, 0.8), true, 1.5);
  drawText(ctx, ax, 0.3, clampY(uncodedBerBpsk(0.3)), 'uncoded', CHART.green, 4, -4);
  drawText(ctx, ax, XMAX, clampY(codedBerHard(code, XMAX)), 'hard', CHART.orange, -26, -4);
  drawText(ctx, ax, XMAX, clampY(codedBerSoftRef(code, XMAX)), 'soft', CHART.blue, -26, 10);
}

/** Project the 3-bit cube; codeword vertices filled, single-bit-flip edges drawn. */
function drawCube(ctx: CanvasRenderingContext2D, w: number, h: number, code: LinearCode): void {
  const codewords = new Set(allCodewords(code.G).map((c) => c.join('')));
  const ax = { x: linScale([0, 1], [0, w]), y: linScale([0, 1], [h, 0]) };
  const proj = (b: number[]): [number, number] => [
    0.28 + b[0] * 0.46 + b[2] * 0.2,
    0.76 - b[1] * 0.5 - b[2] * 0.2,
  ];
  const verts: number[][] = [];
  for (let v = 0; v < 8; v++) verts.push([(v >> 2) & 1, (v >> 1) & 1, v & 1]);
  ctx.strokeStyle = alpha(CHART.dim, 0.5);
  ctx.lineWidth = 1;
  for (let a = 0; a < 8; a++) {
    for (let b = a + 1; b < 8; b++) {
      if (hammingDistance(verts[a], verts[b]) === 1) {
        const pa = proj(verts[a]);
        const pb = proj(verts[b]);
        ctx.beginPath();
        ctx.moveTo(ax.x(pa[0]), ax.y(pa[1]));
        ctx.lineTo(ax.x(pb[0]), ax.y(pb[1]));
        ctx.stroke();
      }
    }
  }
  for (const vert of verts) {
    const p = proj(vert);
    const isCw = codewords.has(vert.join(''));
    ctx.beginPath();
    ctx.arc(ax.x(p[0]), ax.y(p[1]), isCw ? 8 : 5, 0, Math.PI * 2);
    if (isCw) {
      ctx.fillStyle = CHART.green;
      ctx.fill();
    } else {
      ctx.fillStyle = CHART.bgDeep;
      ctx.fill();
      ctx.strokeStyle = CHART.dim;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.fillStyle = isCw ? CHART.bgDeep : CHART.dim;
    ctx.font = '10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(vert.join(''), ax.x(p[0]), ax.y(p[1]));
  }
  ctx.textAlign = 'start';
  drawText(ctx, ax, 0.5, 0.08, `codewords {000, 111},  d_min = ${code.dmin}`, CHART.dim, 0, 0);
}

type DcMode = 'correct' | 'detect' | 'combined';

interface DcVerdict {
  key: 'vNone' | 'vCorrected' | 'vDetected' | 'vUndetected';
  tone: 'default' | 'ok' | 'warn' | 'err';
}

/**
 * Bounded-distance decoding along the worst-case line to the nearest codeword (Fig. 13.5/13.6):
 * distance to transmitted = errCount, to the nearest other codeword = dmin − errCount.
 */
function classifyDecode(
  errCount: number,
  dmin: number,
  mode: DcMode,
  ec: number,
  ed: number,
): DcVerdict {
  if (errCount <= 0) return { key: 'vNone', tone: 'default' };
  if (mode === 'correct') {
    if (errCount <= ec) return { key: 'vCorrected', tone: 'ok' };
    if (errCount >= dmin - ec) return { key: 'vUndetected', tone: 'err' };
    return { key: 'vDetected', tone: 'warn' };
  }
  if (mode === 'detect') {
    return errCount <= ed
      ? { key: 'vDetected', tone: 'warn' }
      : { key: 'vUndetected', tone: 'err' };
  }
  // combined: correct ≤ ec, detect ≤ ed (= dmin−1−ec)
  if (errCount <= ec) return { key: 'vCorrected', tone: 'ok' };
  if (errCount <= ed) return { key: 'vDetected', tone: 'warn' };
  return { key: 'vUndetected', tone: 'err' };
}

/** §13.2.3 — live Hamming-sphere explorer: an injected received vector drifts outward past e_c/e_d. */
function DetectionCorrectionSim() {
  const [dmin, setDmin] = useState(3);
  const [mode, setMode] = useState<DcMode>('correct');
  const [ecSel, setEcSel] = useState(0);
  const [errCount, setErrCount] = useState(0);

  const ecMax = errorCorrectionT(dmin);
  const ed = errorDetectionD(dmin);
  const ecEff = mode === 'detect' ? 0 : mode === 'combined' ? Math.min(ecSel, ecMax) : ecMax;
  const edEff = mode === 'detect' ? ed : mode === 'combined' ? dmin - 1 - ecEff : ed;
  const verdict = classifyDecode(errCount, dmin, mode, ecEff, edEff);

  const loop = useSimulationLoop({
    ticksPerSecond: 1.5,
    onTick: () => setErrCount((e) => (e >= dmin ? 0 : e + 1)),
    onReset: () => setErrCount(0),
  });

  return (
    <Panel title={t('cc.bc.dcTitle')}>
      <div className="cc-readouts">
        <Slider
          label={t('cc.bc.dcDmin')}
          value={dmin}
          min={3}
          max={9}
          step={1}
          onChange={(v) => {
            setDmin(v);
            setErrCount(0);
          }}
        />
        {mode === 'combined' && (
          <Slider
            label={t('cc.bc.dcEcSel')}
            value={ecSel}
            min={0}
            max={ecMax}
            step={1}
            onChange={setEcSel}
          />
        )}
      </div>
      <Segmented<DcMode>
        ariaLabel={t('cc.bc.dcMode')}
        value={mode}
        options={[
          { value: 'correct', label: t('cc.bc.modeCorrect') },
          { value: 'detect', label: t('cc.bc.modeDetect') },
          { value: 'combined', label: t('cc.bc.modeCombined') },
        ]}
        onChange={setMode}
      />
      <TransportControls loop={loop} />
      <Canvas
        height={170}
        ariaLabel="Hamming-sphere detection and correction line"
        deps={[dmin, mode, ecEff, edEff, errCount]}
        draw={(ctx, w, h) => drawSphereLine(ctx, w, h, dmin, ecEff, edEff, errCount)}
      />
      <div className="cc-readouts">
        <Readout label="e_c" value={ecMax} tone="ok" />
        <Readout label="e_d" value={ed} />
        <Readout label={t('cc.bc.dcErrors')} value={errCount} />
        <Readout
          label={t('cc.bc.dcVerdict')}
          value={t(`cc.bc.${verdict.key}`)}
          tone={verdict.tone}
        />
      </div>
    </Panel>
  );
}

/** Draw the 0…d_min distance line with c1/c2 spheres, the detect band and the moving received point. */
function drawSphereLine(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dmin: number,
  ec: number,
  ed: number,
  errCount: number,
): void {
  const ax = { x: linScale([0, dmin], [40, w - 40]), y: linScale([0, 1], [h, 0]) };
  const yc = h * 0.5;
  // detection band (between codewords) — shaded amber
  ctx.fillStyle = alpha(CHART.orange, 0.12);
  ctx.fillRect(ax.x(0), yc - 26, ax.x(ed) - ax.x(0), 52);
  // correction spheres around c1 (0) and c2 (dmin)
  ctx.fillStyle = alpha(CHART.green, 0.18);
  ctx.fillRect(ax.x(0), yc - 20, ax.x(ec) - ax.x(0), 40);
  ctx.fillStyle = alpha(CHART.blue, 0.18);
  ctx.fillRect(ax.x(dmin - ec), yc - 20, ax.x(dmin) - ax.x(dmin - ec), 40);
  // baseline + integer ticks
  ctx.strokeStyle = alpha(CHART.dim, 0.7);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ax.x(0), yc);
  ctx.lineTo(ax.x(dmin), yc);
  ctx.stroke();
  ctx.fillStyle = CHART.dim;
  ctx.font = '10px ui-monospace, monospace';
  ctx.textAlign = 'center';
  for (let d = 0; d <= dmin; d++) {
    ctx.beginPath();
    ctx.moveTo(ax.x(d), yc - 4);
    ctx.lineTo(ax.x(d), yc + 4);
    ctx.stroke();
    ctx.fillText(String(d), ax.x(d), yc + 18);
  }
  // codeword endpoints
  for (const [d, col, label] of [
    [0, CHART.green, 'c1'],
    [dmin, CHART.blue, 'c2'],
  ] as const) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(ax.x(d), yc, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(label, ax.x(d), yc - 26);
  }
  // moving received point at distance errCount
  ctx.fillStyle = CHART.pink;
  ctx.beginPath();
  ctx.arc(ax.x(errCount), yc, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillText('r', ax.x(errCount), yc - 26);
  ctx.textAlign = 'start';
}

const BI_N = 15; // (15,11) Hamming codeword length (book example)
const BI_T = errorCorrectionT(3); // = 1 error/codeword

/** §13.2.4 — live block-interleaver grid: a sweeping burst spreads across codewords (or piles up). */
function BurstInterleaveSim() {
  const [depth, setDepth] = useState(8);
  const [burstLen, setBurstLen] = useState(8);
  const [burstStart, setBurstStart] = useState(0);
  const [interleave, setInterleave] = useState(true);

  const total = depth * BI_N;
  const loop = useSimulationLoop({
    ticksPerSecond: 3,
    onTick: () => setBurstStart((s) => (s + 1) % total),
    onReset: () => setBurstStart(0),
  });

  const counts = burstErrorsPerCodeword(BI_N, depth, burstStart, burstLen, interleave);
  const corrupted = counts.filter((c) => c > 0).length;
  const uncorrectable = counts.filter((c) => c > BI_T).length;
  const maxPer = counts.length ? Math.max(...counts) : 0;

  return (
    <Panel title={t('cc.bc.biTitle')}>
      <div className="cc-readouts">
        <Slider
          label={t('cc.bc.biDepth')}
          value={depth}
          min={2}
          max={12}
          step={1}
          onChange={(v) => {
            setDepth(v);
            setBurstStart(0);
          }}
        />
        <Slider
          label={t('cc.bc.biBurst')}
          value={burstLen}
          min={0}
          max={24}
          step={1}
          onChange={setBurstLen}
        />
      </div>
      <Toggle label={t('cc.bc.biInterleave')} checked={interleave} onChange={setInterleave} />
      <TransportControls loop={loop} />
      <Canvas
        height={220}
        ariaLabel="Block interleaver grid with a burst spread across codewords"
        deps={[depth, burstLen, burstStart, interleave]}
        draw={(ctx, w, h) =>
          drawInterleaveGrid(ctx, w, h, depth, burstLen, burstStart, interleave, counts)
        }
      />
      <div className="cc-readouts">
        <Readout label={t('cc.bc.biMaxPer')} value={maxPer} tone={maxPer > BI_T ? 'err' : 'ok'} />
        <Readout label={t('cc.bc.biCorrupted')} value={corrupted} />
        <Readout
          label={t('cc.bc.biUncorrectable')}
          value={uncorrectable}
          tone={uncorrectable > 0 ? 'err' : 'ok'}
        />
      </div>
    </Panel>
  );
}

/** Draw the depth×N interleaver grid; burst cells highlighted, rows tinted by correctability. */
function drawInterleaveGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  depth: number,
  burstLen: number,
  burstStart: number,
  interleave: boolean,
  counts: number[],
): void {
  const padL = 30;
  const padT = 6;
  const gw = (w - padL - 6) / BI_N;
  const gh = (h - padT - 6) / depth;
  // transmitted index p for a cell, per interleave mode
  const isBurst = (row: number, col: number): boolean => {
    const p = interleave ? col * depth + row : row * BI_N + col;
    return p >= burstStart && p < burstStart + burstLen;
  };
  for (let row = 0; row < depth; row++) {
    const cnt = counts[row] ?? 0;
    const rowTint =
      cnt === 0
        ? alpha(CHART.dim, 0.08)
        : cnt > BI_T
          ? alpha(CHART.pink, 0.14)
          : alpha(CHART.green, 0.14);
    ctx.fillStyle = rowTint;
    ctx.fillRect(padL, padT + row * gh, BI_N * gw, gh);
    ctx.fillStyle = CHART.dim;
    ctx.font = '9px ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`c${row}`, padL - 4, padT + row * gh + gh / 2);
    for (let col = 0; col < BI_N; col++) {
      const x = padL + col * gw;
      const y = padT + row * gh;
      ctx.strokeStyle = alpha(CHART.dim, 0.4);
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, gw, gh);
      if (isBurst(row, col)) {
        ctx.fillStyle = cnt > BI_T ? CHART.pink : CHART.orange;
        ctx.fillRect(x + 1.5, y + 1.5, gw - 3, gh - 3);
      }
    }
  }
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
}
