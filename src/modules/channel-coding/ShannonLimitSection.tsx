import { useState } from 'react';
import { Panel, Slider, Select, Toggle, Readout, Formula, TheoryBox } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, logScale, drawAxes, drawLine, drawScatter, drawVLine, drawText } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import {
  shannonLimitEbN0MinDb,
  capacityVsBandwidthNorm,
  LOG2E,
  SHANNON_LIMIT_DB,
} from '@/lib/dsp/capacity';
import { requiredEbN0DbForBer } from '@/lib/dsp/ser';
import type { Scheme } from '@/lib/dsp/modulation';
import { t } from '@/i18n';

type BerKey = '1e-3' | '1e-5' | '1e-6';
const BER_VALUE: Record<BerKey, number> = { '1e-3': 1e-3, '1e-5': 1e-5, '1e-6': 1e-6 };

interface OverlayScheme {
  label: string;
  scheme: Scheme;
  M: number;
  r: number; // spectral efficiency, bits/s/Hz
}

// Bandwidth-limited family: r = log2(M) (ideal Nyquist). Power-limited orthogonal FSK:
// r = 2·log2(M)/M (orthogonal-signaling bandwidth ≈ M/2T). See §7.4/§7.6.6.
const OVERLAY: OverlayScheme[] = [
  { label: 'BPSK', scheme: 'bpsk', M: 2, r: 1 },
  { label: 'QPSK', scheme: 'mpsk', M: 4, r: 2 },
  { label: '16-QAM', scheme: 'mqam', M: 16, r: 4 },
  { label: '64-QAM', scheme: 'mqam', M: 64, r: 6 },
  { label: '256-QAM', scheme: 'mqam', M: 256, r: 8 },
  { label: '4-FSK', scheme: 'mfsk', M: 4, r: 1 },
  { label: '8-FSK', scheme: 'mfsk', M: 8, r: 0.75 },
  { label: '16-FSK', scheme: 'mfsk', M: 16, r: 0.5 },
];

const XMIN = -2;
const XMAX = 20;
const RMIN = 0.1;
const RMAX = 10;

export function ShannonLimitSection() {
  const [ebN0Db, setEbN0Db] = useState(8);
  const [rExp, setRExp] = useState(0); // log10(r); r in [0.1, 10]
  const r = 10 ** rExp;
  const [berKey, setBerKey] = useState<BerKey>('1e-5');
  const [showOverlay, setShowOverlay] = useState(true);

  const reqDb = shannonLimitEbN0MinDb(r);
  const gap = ebN0Db - reqDb;

  // Boundary curve Eb/N0 = (2^r − 1)/r in dB, log-spaced in r.
  const rGrid: number[] = [];
  const boundDb: number[] = [];
  for (let i = 0; i <= 100; i++) {
    const rr = RMIN * (RMAX / RMIN) ** (i / 100);
    rGrid.push(rr);
    boundDb.push(shannonLimitEbN0MinDb(rr));
  }

  const target = BER_VALUE[berKey];
  const pts = OVERLAY.map((o) => ({ ...o, ebn0: requiredEbN0DbForBer(o.scheme, o.M, target) }));

  return (
    <div className="cc-section">
      <aside className="cc-controls">
        <Panel title={t('cc.sh.title')}>
          <Slider label={t('cc.sh.ebn0')} value={ebN0Db} min={-2} max={20} step={0.5} unit="dB" onChange={setEbN0Db} />
          <Slider label={t('cc.sh.r')} value={rExp} min={-1} max={1} step={0.01} onChange={setRExp} />
          <Readout label="r" value={r.toFixed(2)} unit="b/s/Hz" />
          <Select<BerKey>
            label={t('cc.sh.targetBer')}
            value={berKey}
            options={[
              { value: '1e-3', label: '1e−3' },
              { value: '1e-5', label: '1e−5' },
              { value: '1e-6', label: '1e−6' },
            ]}
            onChange={setBerKey}
          />
          <Toggle label={t('cc.sh.overlay')} checked={showOverlay} onChange={setShowOverlay} />
          <Readout label={t('cc.sh.gap')} value={gap.toFixed(2)} unit="dB" tone={gap >= 0 ? 'ok' : 'err'} />
        </Panel>
      </aside>

      <div className="cc-content">
        <Panel title={t('cc.sh.cvw')}>
          <Canvas
            height={200}
            ariaLabel="Capacity versus bandwidth"
            deps={[]}
            draw={(ctx, w, h) => {
              const ax = { x: linScale([0, 200], [34, w - 10]), y: linScale([0, 1.6], [h - 22, 10]) };
              drawAxes(ctx, ax, [0, 200]);
              const us: number[] = [];
              const cs: number[] = [];
              for (let i = 0; i <= 200; i++) {
                us.push(i);
                cs.push(capacityVsBandwidthNorm(i));
              }
              drawLine(ctx, ax, us, cs, CHART.green, 2);
              drawLine(ctx, ax, [0, 200], [LOG2E, LOG2E], alpha(CHART.dim, 0.8), 1, true);
              drawText(ctx, ax, 110, LOG2E, `ceiling = log₂e ≈ ${LOG2E.toFixed(3)}`, CHART.dim, 0, -6);
              drawText(ctx, ax, 90, 0.12, 'C/(P/N₀) vs W/(P/N₀)', CHART.dim, 0, 0);
            }}
          />
        </Panel>
        <Panel title={t('cc.sh.plane')}>
          <Canvas
            height={300}
            ariaLabel="Spectral efficiency versus Eb/N0 with the Shannon bound"
            deps={[ebN0Db, rExp, berKey, showOverlay]}
            draw={(ctx, w, h) => {
              const ax = { x: linScale([XMIN, XMAX], [40, w - 10]), y: logScale([RMIN, RMAX], [h - 24, 10]) };
              // Achievable region (right of the boundary) — light green fill.
              ctx.fillStyle = alpha(CHART.green, 0.08);
              ctx.beginPath();
              ctx.moveTo(ax.x(boundDb[0]), ax.y(rGrid[0]));
              for (let i = 1; i < rGrid.length; i++) ctx.lineTo(ax.x(boundDb[i]), ax.y(rGrid[i]));
              ctx.lineTo(ax.x(XMAX), ax.y(rGrid[rGrid.length - 1]));
              ctx.lineTo(ax.x(XMAX), ax.y(rGrid[0]));
              ctx.closePath();
              ctx.fill();
              // Boundary curve and the −1.59 dB asymptote.
              drawLine(ctx, ax, boundDb, rGrid, CHART.orange, 2);
              drawVLine(ctx, ax, SHANNON_LIMIT_DB, RMIN, RMAX, alpha(CHART.pink, 0.85), true, 1.5);
              drawText(ctx, ax, SHANNON_LIMIT_DB, RMAX, `${SHANNON_LIMIT_DB.toFixed(2)} dB`, CHART.pink, 2, 8);
              // Region labels.
              drawText(ctx, ax, 13, 6, 'bandwidth-limited', CHART.dim, 0, 0);
              drawText(ctx, ax, 13, 0.2, 'power-limited', CHART.dim, 0, 0);
              drawText(ctx, ax, 2, 4, 'reliable ✓', alpha(CHART.green, 0.9), 0, 0);
              // Overlay points.
              if (showOverlay) {
                for (const p of pts) {
                  if (p.r < RMIN || p.r > RMAX) continue;
                  drawScatter(ctx, ax, [p.ebn0], [p.r], CHART.blue, 4);
                  drawText(ctx, ax, p.ebn0, p.r, p.label, CHART.text, 6, -2);
                }
              }
              // Current operating marker.
              drawScatter(ctx, ax, [ebN0Db], [r], CHART.green, 5);
            }}
          />
        </Panel>
        <TheoryBox title={t('cc.theory')}>
          <Formula tex="C=W\log_2\!\left(1+\frac{P}{N_0 W}\right),\qquad \lim_{W\to\infty}C=\frac{P}{N_0}\log_2 e" block />
          <Formula tex="\frac{E_b}{N_0}\ge \frac{2^{r}-1}{r},\ \ r=\frac{R}{W};\qquad r\to 0\Rightarrow \frac{E_b}{N_0}\to\ln 2=-1.59\,\text{dB}" block />
        </TheoryBox>
      </div>
    </div>
  );
}
