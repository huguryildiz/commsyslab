/* eslint-disable react-refresh/only-export-components */
import {
  Schematic,
  Wire,
  Block,
  Node,
  Summer,
  MathLabel,
  FlowPacket,
  pointAlong,
} from '@/lib/plot/schematic';
import { CHART } from '@/lib/plot/colors';
import { t } from '@/i18n';
import { FDM_PERIOD, fdmBandReveal, type FdmView } from './model';

/**
 * Animated FDM block diagram — a live rendering of Proakis & Salehi Figure 3.31
 * (§3.4.1). K message signals each pass LPF → modulator (own carrier fₖ from the
 * frequency synthesizer), are summed, sent over the channel, then separated by a
 * bank of bandpass filters → demodulator → LPF at the receiver.
 *
 * One shared `clock` drives a normalized cycle phase cp ∈ [0,1):
 *  - First half (transmit): channel k's coloured packet glides to its modulator,
 *    arriving exactly at `fdmBandReveal(k, K)` — the same instant band k appears
 *    in the composite spectrum, keeping diagram and spectrum in lockstep.
 *  - Second half (receive): a single packet travels from Σ through the channel
 *    and down the *selected* receiver chain to the recovered output.
 *
 * The diagram scales with K and switches to a compact style at K ≥ 5.
 */

/** Channel colour palette (theme-aware, cycles for K > 5). Matches the spectrum bands. */
export function fdmChannelColor(k: number): string {
  const palette = [CHART.green, CHART.orange, CHART.blue, CHART.pink, CHART.cyan];
  return palette[k % palette.length];
}

export function FdmBlockDiagram({ view, clock }: { view: FdmView; clock: number }) {
  const K = view.carriers.length;
  const sel = view.selected;
  const compact = K >= 5;

  // Vertical layout.
  const rowH = compact ? 24 : 32;
  const blockH = compact ? 14 : 18;
  const padTop = 14;
  const stub = 5; // carrier feeder length below each modulator/demodulator
  const synthGap = 12;
  const synthH = compact ? 14 : 18;
  const rowsBottom = padTop + rowH * K;
  const yMid = padTop + (rowH * K) / 2;
  const synthY = rowsBottom + stub + synthGap;
  const height = synthY + synthH + 14;
  const yRow = (k: number) => padTop + rowH * k + rowH / 2;

  // Horizontal columns (viewBox units). Wide left/right gutters leave room for
  // the m_k(t) / m̂_k(t) labels without overlapping the dots or LPF blocks.
  const xLPF = 52,
    wLPF = 22;
  const xMod = 86,
    wMod = 26,
    xModC = xMod + wMod / 2;
  const xBus = 128;
  const xSum = 144,
    rSum = 8;
  const xCh = 162,
    wCh = 40;
  const xFan = 220;
  const xBPF = 234,
    wBPF = 22;
  const xDem = 268,
    wDem = 30,
    xDemC = xDem + wDem / 2;
  const xLPF2 = 310,
    wLPF2 = 22;
  const xOut = 352;
  const width = 396;

  const blockY = (k: number) => yRow(k) - blockH / 2;

  // Animation phase.
  const cp = (((clock / FDM_PERIOD) % 1) + 1) % 1;

  // Transmit packets (first half): one per channel, arriving at its modulator at reveal_k.
  const txDots = cp < 0.5
    ? view.carriers.map((_, k) => {
        const reveal = fdmBandReveal(k, K);
        const pre: [number, number][] = [
          [47, yRow(k)],
          [xModC, yRow(k)],
        ];
        const post: [number, number][] = [
          [xModC, yRow(k)],
          [xBus, yRow(k)],
          [xBus, yMid],
          [xSum, yMid],
        ];
        const [x, y] =
          cp <= reveal
            ? pointAlong(pre, reveal > 0 ? cp / reveal : 1)
            : pointAlong(post, (cp - reveal) / (0.5 - reveal));
        return { k, x, y };
      })
    : [];

  // Receive packet (second half): Σ → channel → selected receiver chain → output.
  const rxPath: [number, number][] = [
    [xSum, yMid],
    [xCh, yMid],
    [xCh + wCh, yMid],
    [xFan, yMid],
    [xFan, yRow(sel)],
    [xBPF, yRow(sel)],
    [xLPF2 + wLPF2, yRow(sel)],
    [xOut, yRow(sel)],
  ];
  const rxDot = cp >= 0.5 ? pointAlong(rxPath, (cp - 0.5) / 0.5) : null;
  const rxColor = view.overlap ? CHART.red : fdmChannelColor(sel);

  const rows = view.carriers.map((_, k) => k);

  return (
    <Schematic width={width} height={height} ariaLabel={t('analog.mux.fdm.diagram')}>
      {/* Selected receiver chain: faint highlight behind the active row. */}
      <rect
        x={xFan - 2}
        y={blockY(sel) - 4}
        width={xOut - xFan + 2}
        height={blockH + 8}
        rx={4}
        style={{ fill: rxColor, opacity: 0.1 }}
      />

      {/* Transmit + receive merge/fan buses. */}
      <Wire points={[xBus, yRow(0), xBus, yRow(K - 1)]} />
      <Wire points={[xBus, yMid, xSum - rSum, yMid]} />
      <Wire points={[xFan, yRow(0), xFan, yRow(K - 1)]} />
      <Wire points={[xCh + wCh, yMid, xFan, yMid]} />

      {/* Summer → channel → fan. */}
      <Summer x={xSum} y={yMid} sign="Σ" r={rSum} />
      <Wire points={[xSum + rSum, yMid, xCh, yMid]} />
      <Block x={xCh} y={yMid - blockH / 2} w={wCh} h={blockH} label={t('analog.mux.fdm.channel.block')} tex="\text{Channel}" />

      {/* Per-channel transmit and receive chains. */}
      {rows.map((k) => {
        const y = yRow(k);
        const isSel = k === sel;
        const col = fdmChannelColor(k);
        return (
          <g key={k}>
            {/* Channel colour key + message label. */}
            <circle cx={8} cy={y} r={3} style={{ fill: col, stroke: 'none' }} />
            <MathLabel x={13} y={y} anchor="start" tex={`m_{${k}}(t)`} w={34} />

            {/* TX: msg → LPF → Mod → merge bus. */}
            <Wire points={[47, y, xLPF, y]} />
            <Block x={xLPF} y={blockY(k)} w={wLPF} h={blockH} label="LPF" tex="\text{LPF}" />
            <Wire points={[xLPF + wLPF, y, xMod, y]} />
            <Block x={xMod} y={blockY(k)} w={wMod} h={blockH} label="Mod" tex="\text{Mod}" />
            <Wire points={[xMod + wMod, y, xBus, y]} />
            <Node x={xBus} y={y} />
            {/* Carrier feeder from synthesizer. */}
            <Wire points={[xModC, y + blockH / 2, xModC, y + blockH / 2 + stub]} />

            {/* RX: fan → BPF → Demod → LPF → output (selected chain glows). */}
            <Node x={xFan} y={y} />
            <Wire points={[xFan, y, xBPF, y]} active={isSel} color={rxColor} />
            <Block x={xBPF} y={blockY(k)} w={wBPF} h={blockH} label="BPF" tex="\text{BPF}" />
            <Wire points={[xBPF + wBPF, y, xDem, y]} active={isSel} color={rxColor} />
            <Block x={xDem} y={blockY(k)} w={wDem} h={blockH} label="Demod" tex="\text{Demod}" />
            <Wire points={[xDem + wDem, y, xLPF2, y]} active={isSel} color={rxColor} />
            <Block x={xLPF2} y={blockY(k)} w={wLPF2} h={blockH} label="LPF" tex="\text{LPF}" />
            <Wire points={[xLPF2 + wLPF2, y, xOut, y]} active={isSel} color={rxColor} />
            <MathLabel x={xOut + 8} y={y} anchor="start" tex={`\\hat{m}_{${k}}(t)`} w={34} />
            {/* Demodulator carrier feeder. */}
            <Wire points={[xDemC, y + blockH / 2, xDemC, y + blockH / 2 + stub]} />
          </g>
        );
      })}

      {/* Frequency synthesizers feeding the modulator / demodulator banks. */}
      <Wire points={[xModC, yRow(K - 1) + blockH / 2 + stub, xModC, synthY]} />
      <Block x={xMod - 10} y={synthY} w={wMod + 26} h={synthH} label="Synth" tex="\text{Freq. synth}" />
      <Wire points={[xDemC, yRow(K - 1) + blockH / 2 + stub, xDemC, synthY]} />
      <Block x={xDem - 8} y={synthY} w={wDem + 18} h={synthH} label="Synth" tex="\text{Freq. synth}" />

      {/* Flowing packets. */}
      {txDots.map((d) => (
        <FlowPacket key={d.k} x={d.x} y={d.y} color={fdmChannelColor(d.k)} />
      ))}
      {rxDot && <FlowPacket x={rxDot[0]} y={rxDot[1]} color={rxColor} />}
    </Schematic>
  );
}
