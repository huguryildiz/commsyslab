import { useMemo, useState } from 'react';
import { Panel, Slider, Formula, TheoryBox, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, drawVLine, type Axes } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import { Schematic, Block, Wire, Arrowhead, MathLabel } from '@/lib/plot/schematic';
import { t } from '@/i18n';
import { repeaterChainSnrDb } from '@/lib/dsp/linkbudget';
import { Metric } from '../shared';

const PAD = { l: 48, r: 12, t: 12, b: 30 };
const KMAX = 50;

/** §6.4.4 — repeater chain: (S/N)_o = P_T/(K·L·F_a·N₀·B); SNR ∝ 1/K. */
export function RepeaterSection() {
  const [k, setK] = useState(20);
  const [lossDb, setLossDb] = useState(20);
  const [faDb, setFaDb] = useState(5);
  const [ptDbw, setPtDbw] = useState(-90);
  const [bKhz, setBKhz] = useState(4);
  const [resetKey, setResetKey] = useState(0);
  const reset = () => {
    setK(20);
    setLossDb(20);
    setFaDb(5);
    setPtDbw(-90);
    setBKhz(4);
    setResetKey((kk) => kk + 1);
  };

  const snrOf = (segments: number) =>
    repeaterChainSnrDb({
      ptDbW: ptDbw,
      perSegLossDb: lossDb,
      faDb,
      tempK: 290,
      bandwidthHz: bKhz * 1000,
      segments,
    });

  const data = useMemo(() => {
    const ks = Array.from({ length: KMAX }, (_, i) => i + 1);
    return { ks, snr: ks.map(snrOf) };
  }, [lossDb, faDb, ptDbw, bKhz]);

  const snrNow = snrOf(k);

  const [lo, hi, onWheel, , onPan] = useZoom(1, KMAX, { minSpan: 5, maxSpan: KMAX, clampMin: 1, clampMax: KMAX });

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const yMax = Math.max(...data.snr) + 3;
    const yMin = Math.min(...data.snr) - 3;
    const ax: Axes = {
      x: linScale([lo, hi], [PAD.l, w - PAD.r]),
      y: linScale([yMin, yMax], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [lo, hi], {
      xLabel: '$K$ (segments)',
      yLabel: '$(S/N)_o\\,(\\mathrm{dB})$',
      domainY: [yMin, yMax],
    });
    drawLine(ctx, ax, data.ks, data.snr, CHART.pink, 2);
    drawVLine(ctx, ax, k, yMin, yMax, CHART.dim, true);
  };

  return (
    <div className="an__section">
      <div className="module-layout">
        <aside className="an__controls">
          <Panel title={t('an.rep.title')}>
            <Slider label={<HintText text="$K$" />} min={1} max={KMAX} step={1} value={k} onChange={setK} />
            <Slider label={<HintText text={t('an.rep.loss')} />} min={5} max={40} step={1} unit="dB" value={lossDb} onChange={setLossDb} />
            <Slider label={<HintText text={t('an.rep.fa')} />} min={0} max={12} step={0.5} unit="dB" value={faDb} onChange={setFaDb} />
            <Slider label={<HintText text="$P_T$" />} min={-120} max={0} step={1} unit="dBW" value={ptDbw} onChange={setPtDbw} />
            <Slider label={<HintText text="$B$" />} min={1} max={100} step={1} unit="kHz" value={bKhz} onChange={setBKhz} />
            <div className="an__reset">
              <button type="button" onClick={reset}>
                {t('an.gen.reset')}
              </button>
            </div>
          </Panel>
        </aside>

        <div className="an__content" key={resetKey}>
          <div className="an__readouts">
            <Metric label={<HintText text="$(S/N)_o$" />} value={snrNow.toFixed(1)} unit="dB" />
          </div>
          <Panel title={t('an.rep.diagram')}>
            <div style={{ maxWidth: 760 }}>
              {/* Coordinate space 460×90, BH=30. cy=45 → blocks 30–60; "L" wire labels at
                  y=24 (6px above block top); ellipsis at cy. */}
              <Schematic width={460} height={90} ariaLabel="Repeater chain Tx → amplifiers → Rx (§6.4.4)">
                <Block x={8} y={30} w={54} h={30} label="" tex="\text{Tx}" />
                <Wire points={[62, 45, 104, 45]} />
                <MathLabel x={83} y={24} tex="L" w={20} />
                <Arrowhead x={106} y={45} />
                <Block x={106} y={30} w={58} h={30} label="" tex="\text{Amp}" />
                <Wire points={[164, 45, 206, 45]} />
                <MathLabel x={185} y={24} tex="L" w={20} />
                <Arrowhead x={208} y={45} />
                <Block x={208} y={30} w={58} h={30} label="" tex="\text{Amp}" />
                <Wire points={[266, 45, 308, 45]} />
                <MathLabel x={287} y={45} tex="\cdots" w={20} />
                <Arrowhead x={310} y={45} />
                <Block x={310} y={30} w={58} h={30} label="" tex="\text{Amp}" />
                <Wire points={[368, 45, 410, 45]} />
                <MathLabel x={389} y={24} tex="L" w={20} />
                <Arrowhead x={412} y={45} />
                <Block x={412} y={30} w={44} h={30} label="" tex="\text{Rx}" />
              </Schematic>
            </div>
            <Canvas height={210} draw={draw} deps={[data, k, lo, hi]} ariaLabel="Output SNR versus number of repeater segments" onWheel={onWheel} onPan={onPan} />
            <Formula tex="\left(\tfrac{S}{N}\right)_o=\dfrac{P_T}{K\,L\,F_a\,N_0 B}" block />
          </Panel>
          <TheoryBox>
            <HintText text={t('an.rep.theory')} />
          </TheoryBox>
        </div>
      </div>
    </div>
  );
}
