import {
  Schematic,
  Wire,
  Block,
  Node,
  Label,
  MathLabel,
  Diode,
  Resistor,
  Capacitor,
  Transformer,
  Ground,
  Summer,
  Oscillator,
  Mixer,
  Arrowhead,
  FlowPacket,
  pointAlong,
} from '@/lib/plot/schematic';
import { t } from '@/i18n';
import type { ModulatorKind } from './model';

/**
 * Block diagram for each modulator (input → device → BPF → output).
 * Blocks are sized to their label so the text never overflows, the BPF centre
 * frequency is shown in kHz, and a glowing packet flows along the chain (driven
 * by the shared `clock`).
 */
export function ModulatorBlockDiagram({
  kind,
  carrierFreq,
}: {
  kind: ModulatorKind;
  carrierFreq: number;
}) {
  const deviceLabel =
    kind === 'power-law'
      ? 'Nonlinear device'
      : kind === 'switching'
        ? 'Diode switch'
        : kind === 'balanced'
          ? 'Balanced mods'
          : 'Diode ring';
  const deviceTex =
    kind === 'power-law'
      ? '\\text{Nonlinear device}'
      : kind === 'switching'
        ? '\\text{Diode switch}'
        : kind === 'balanced'
          ? '\\text{Balanced mods}'
          : '\\text{Diode ring}';
  const fcK = Number((carrierFreq / 1000).toFixed(carrierFreq % 1000 === 0 ? 0 : 1));
  const bpfLabel = `BPF @ ${fcK} kHz`;

  // Size each block to fit its label at the 9px mono schematic font (≈5.6 px/char).
  const charW = 5.6;
  const devW = Math.max(58, deviceLabel.length * charW + 16);
  const bpfW = Math.max(58, bpfLabel.length * charW + 16);
  const lead = 40;
  const gap = 30;
  const tail = 40;
  const y = 42;
  const blockH = 26;
  const blockY = y - blockH / 2;
  const devX = lead;
  const bpfX = devX + devW + gap;
  const outX = bpfX + bpfW;
  const W = outX + tail;

  return (
    <Schematic width={W} height={84} ariaLabel={t('analog.mod.block')}>
      <Wire points={[6, y, devX, y]} />
      <MathLabel x={(6 + devX) / 2} y={y - 9} tex="m(t)" w={32} />
      <Block x={devX} y={blockY} w={devW} h={blockH} label={deviceLabel} tex={deviceTex} />
      <Wire points={[devX + devW, y, bpfX, y]} />
      <Block
        x={bpfX}
        y={blockY}
        w={bpfW}
        h={blockH}
        label={bpfLabel}
        tex={`\\mathrm{BPF}\\;@\\;${fcK}\\,\\mathrm{kHz}`}
      />
      <Wire points={[outX, y, W - 6, y]} />
      <MathLabel x={(outX + W - 6) / 2} y={y - 9} tex="u(t)" w={32} />
    </Schematic>
  );
}

/** Circuit schematic for each modulator. `phase` ∈ {0,1} drives diode conduction. */
export function ModulatorCircuit({ kind, phase }: { kind: ModulatorKind; phase: 0 | 1 }) {
  switch (kind) {
    case 'power-law':
      return (
        <Schematic width={200} height={90} ariaLabel={t('analog.mod.circuit')}>
          <Wire points={[10, 45, 60, 45]} />
          <MathLabel x={12} y={38} tex="v_i(t)" anchor="start" w={35} />
          <Diode x={70} y={45} active={phase === 1} />
          <Wire points={[80, 45, 120, 45]} />
          <Block x={120} y={32} w={40} h={26} label="BPF" tex="\mathrm{BPF}" />
          <Wire points={[160, 45, 192, 45]} />
          <MathLabel x={180} y={38} tex="u(t)" w={32} />
          <Label x={70} y={62} text="P-N diode" />
        </Schematic>
      );
    case 'switching':
      return (
        <Schematic width={220} height={100} ariaLabel={t('analog.mod.circuit')}>
          <Wire points={[10, 36, 52, 36]} />
          <MathLabel x={12} y={16} tex="m(t)+\cos(2\pi f_c t)" anchor="start" w={110} />
          <Diode x={62} y={36} active={phase === 1} />
          <Wire points={[72, 36, 112, 36]} />
          <Node x={112} y={36} />
          {/* Shunt load R_L to ground */}
          <Wire points={[112, 36, 112, 51]} />
          <Resistor x={112} y={60} rot={90} />
          <Wire points={[112, 69, 112, 82]} />
          <Ground x={112} y={82} />
          <MathLabel x={122} y={60} tex="R_L" anchor="start" w={24} />
          {/* Output wire */}
          <Wire points={[112, 36, 200, 36]} />
          <MathLabel x={188} y={28} tex="u(t)" w={32} />
        </Schematic>
      );
    case 'balanced':
      return (
        <Schematic width={430} height={140} ariaLabel={t('analog.mod.circuit')}>
          {/* Top path: m(t) → AM mod */}
          <Wire points={[8, 30, 80, 30]} />
          <MathLabel x={44} y={20} tex="m(t)" w={44} />
          <Block x={80} y={19} w={55} h={22} label="AM mod" tex="\text{AM mod}" />

          {/* Carrier oscillator — center between the two blocks */}
          <Oscillator x={40} y={70} r={10} />
          {/* horizontal backbone to the split node */}
          <Wire points={[50, 70, 107, 70]} />
          <Node x={107} y={70} />
          {/* up to bottom of top AM mod block (y=41) */}
          <Wire points={[107, 70, 107, 41]} />
          {/* down to top of bottom AM mod block (y=99) */}
          <Wire points={[107, 70, 107, 99]} />
          {/* carrier label beside the vertical split feed, clear of the backbone wire */}
          <MathLabel x={113} y={64} tex="A_c\cos(2\pi f_c t)" anchor="start" w={104} />

          {/* Bottom path: -m(t) → AM mod */}
          <Wire points={[8, 110, 80, 110]} />
          <MathLabel x={44} y={100} tex="-m(t)" w={50} />
          <Block x={80} y={99} w={55} h={22} label="AM mod" tex="\text{AM mod}" />

          {/* Top output wire + intermediate signal label */}
          <Wire points={[135, 30, 255, 30, 255, 54]} />
          <MathLabel x={195} y={18} tex="A_c[1{+}m(t)]\cos 2\pi f_c t" w={165} />

          {/* Bottom output wire + intermediate signal label */}
          <Wire points={[135, 110, 255, 110, 255, 86]} />
          <MathLabel x={195} y={122} tex="A_c[1{-}m(t)]\cos 2\pi f_c t" w={165} />

          {/* Summing junction — no center glyph; polarity shown by the port marks */}
          <Summer x={255} y={70} sign="" r={16} />
          {/* port polarity marks — top input is +, bottom input is −, vertically aligned */}
          <text style={{ fill: 'var(--text)', fontFamily: 'var(--mono)', fontSize: '12px', stroke: 'none' }}
                x={255} y={61} textAnchor="middle" dominantBaseline="middle">+</text>
          <text style={{ fill: 'var(--text)', fontFamily: 'var(--mono)', fontSize: '12px', stroke: 'none' }}
                x={255} y={80} textAnchor="middle" dominantBaseline="middle">−</text>

          {/* Output */}
          <Wire points={[271, 70, 422, 70]} />
          <MathLabel x={418} y={58} tex="2A_c\,m(t)\cos(2\pi f_c t)" anchor="end" w={165} />
        </Schematic>
      );
    case 'ring': {
      // Ring modulator — Proakis & Salehi, Communication Systems Engineering,
      // §3.3, Figure 3.26 (p. 140-141). The square-wave carrier c(t) drives the
      // CENTER TAPS of both transformers. c(t) > 0 (phase 0): the top & bottom
      // diodes conduct → m(t) × (+1); c(t) < 0 (phase 1): the two crossarm
      // diodes conduct → m(t) × (-1). Output v_o(t) = m(t)·c(t) → DSB-SC.
      const cPos = phase === 0; // carrier half-cycle with top/bottom conducting
      // Ring corner nodes: TL(104,22) TR(174,22) BL(104,74) BR(174,74).
      return (
        <Schematic width={262} height={154} ariaLabel={t('analog.mod.circuit')}>
          {/* Message input transformer (left); centre-tapped secondary feeds the ring. */}
          <Transformer x={59} y={48} />
          <Wire points={[53, 36, 38, 36]} />
          <Wire points={[53, 60, 38, 60]} />
          <Wire points={[38, 36, 38, 60]} />
          <MathLabel x={34} y={48} tex="m(t)" anchor="end" w={30} />
          {/* Secondary leads out to the top-left and bottom-left ring corners. */}
          <Wire points={[65, 36, 65, 22, 104, 22]} />
          <Wire points={[65, 60, 65, 74, 104, 74]} />

          {/* Diode ring: top & bottom horizontal arms + two crossing crossarms.
              The conducting arm pair lights up with the carrier half-cycle. */}
          <Wire points={[104, 22, 174, 22]} active={cPos} />
          <Wire points={[104, 74, 174, 74]} active={cPos} />
          <Wire points={[174, 22, 104, 74]} active={!cPos} />
          <Wire points={[174, 74, 104, 22]} active={!cPos} />
          <Node x={104} y={22} />
          <Node x={174} y={22} />
          <Node x={104} y={74} />
          <Node x={174} y={74} />
          {/* Diodes circulate head-to-tail around the ring TL→TR→BL→BR→TL. */}
          <Diode x={139} y={22} rot={0} active={cPos} />
          <Diode x={139} y={74} rot={0} active={cPos} />
          <Diode x={155} y={36} rot={143} active={!cPos} />
          <Diode x={155} y={60} rot={217} active={!cPos} />

          {/* Output transformer (right); centre-tapped primary tapped from the ring. */}
          <Wire points={[198, 36, 198, 22, 174, 22]} />
          <Wire points={[198, 60, 198, 74, 174, 74]} />
          <Transformer x={204} y={48} />
          <Wire points={[210, 36, 232, 36]} />
          <Wire points={[210, 60, 232, 60]} />
          <Wire points={[232, 36, 232, 60]} />
          <MathLabel x={236} y={48} tex="u(t)" anchor="start" w={24} />

          {/* Square-wave carrier applied to both centre taps. */}
          <Wire points={[59, 60, 59, 119]} />
          <Wire points={[204, 60, 204, 119]} />
          <Wire points={[59, 119, 122, 119]} />
          <Wire points={[142, 119, 204, 119]} />
          <Oscillator x={132} y={119} r={10} />
          <MathLabel x={132} y={140} tex="\text{sq. carrier }c(t),\;f_c" w={120} />
        </Schematic>
      );
    }
  }
}

// Loop period (seconds) for the flowing signal packets in the detector diagrams.
const FLOW_PERIOD = 1.8;

/**
 * Coherent (synchronous) detector — Proakis & Salehi §3.4.2. The received signal
 * r(t) is multiplied by a locally generated, phase-coherent carrier and the
 * product is low-pass filtered to recover m(t). A green packet (input) turns blue
 * once it passes the multiplier (baseband), and an orange packet rises from the
 * local oscillator into the mixer.
 */
export function CoherentDetectorCircuit({ clock }: { clock: number }) {
  const cp = (((clock / FLOW_PERIOD) % 1) + 1) % 1;
  const mainPath: [number, number][] = [
    [36, 62],
    [274, 62],
    [500, 62],
    [700, 62],
  ];
  const [mx, my] = pointAlong(mainPath, cp);
  const mColor = mx < 274 ? 'var(--color-x)' : 'var(--color-y)';
  const loPath: [number, number][] = [
    [274, 103],
    [274, 74],
  ];
  const [lx, ly] = pointAlong(loPath, cp);

  return (
    <Schematic width={760} height={150} ariaLabel={t('analog.mod.circuit')} zoomable={false}>
      {/* Forward path: r(t) → ⊗ → LPF → m̂(t) */}
      <Wire points={[36, 62, 262, 62]} />
      <MathLabel x={36} y={40} tex="r(t)" anchor="start" w={70} />
      <Mixer x={274} y={62} r={12} />
      <Wire points={[286, 62, 380, 62]} />
      <Block x={380} y={42} w={120} h={40} label="LPF" tex="\text{LPF}" />
      <Wire points={[500, 62, 700, 62]} />
      <MathLabel x={700} y={40} tex="\hat{m}(t)" anchor="end" w={70} />

      {/* Local oscillator feeding the multiplier from below. */}
      <Wire points={[274, 103, 274, 74]} />
      <Arrowhead x={274} y={84} rot={-90} s={1.8} />
      <Oscillator x={274} y={118} r={15} />
      <MathLabel x={298} y={118} tex="\cos(2\pi f_c t)" anchor="start" w={170} />
      <Label x={274} y={141} text="local oscillator" />

      {/* Animated signal packets. */}
      <FlowPacket x={mx} y={my} color={mColor} r={5} />
      <FlowPacket x={lx} y={ly} color="var(--color-h)" r={5} />
    </Schematic>
  );
}

/**
 * PLL carrier recovery + coherent detection — Proakis & Salehi §3.4.2 / §3.5.
 * The phase-locked loop (phase detector ⊗ → loop filter → VCO, closed by the
 * feedback path) regenerates a carrier locked to the incoming signal; that
 * recovered carrier ĉ(t) drives the product detector on top to demodulate r(t).
 * An orange packet circulates the loop (showing the closed feedback), while the
 * detector packet turns from green (input) to blue (baseband) past the mixer.
 */
export function PllCircuit({ clock }: { clock: number }) {
  const cp = (((clock / FLOW_PERIOD) % 1) + 1) % 1;
  // Circulating loop: PD → loop filter → VCO → feedback → PD.
  const loopPath: [number, number][] = [
    [254, 106],
    [395, 106],
    [562, 106],
    [640, 106],
    [640, 134],
    [254, 134],
    [254, 118],
  ];
  const [lpx, lpy] = pointAlong(loopPath, cp);
  // Detector chain on top: r(t) → ⊗ → LPF → m̂(t).
  const topPath: [number, number][] = [
    [40, 46],
    [664, 46],
    [830, 46],
    [875, 46],
  ];
  const [tx, ty] = pointAlong(topPath, cp);
  const tColor = tx < 664 ? 'var(--color-x)' : 'var(--color-y)';

  return (
    <Schematic width={900} height={152} ariaLabel={t('analog.mod.circuit')} zoomable={false}>
      {/* Product detector (top): r(t) → ⊗ → LPF → m̂(t) */}
      <Wire points={[40, 46, 100, 46]} />
      <MathLabel x={40} y={26} tex="r(t)" anchor="start" w={60} />
      <Node x={100} y={46} />
      <Wire points={[100, 46, 652, 46]} />
      <Mixer x={664} y={46} r={12} />
      <MathLabel x={664} y={24} tex="\text{product det.}" w={130} />
      <Wire points={[676, 46, 720, 46]} />
      <Block x={720} y={28} w={110} h={36} label="LPF" tex="\text{LPF}" />
      <Wire points={[830, 46, 875, 46]} />
      <MathLabel x={875} y={26} tex="\hat{m}(t)" anchor="end" w={58} />

      {/* PLL loop (bottom): phase detector → loop filter → VCO */}
      <Wire points={[100, 46, 100, 106, 242, 106]} />
      <Mixer x={254} y={106} r={12} />
      <MathLabel x={254} y={84} tex="\text{phase det.}" w={110} />
      <Wire points={[266, 106, 320, 106]} />
      <Block x={320} y={90} w={150} h={32} label="Loop filter" tex="\text{Loop filter}" />
      <Wire points={[470, 106, 520, 106]} />
      <Block x={520} y={90} w={84} h={32} label="VCO" tex="\text{VCO}" />
      <Wire points={[604, 106, 640, 106]} />
      <Node x={640} y={106} />

      {/* Recovered carrier taps up into the product detector. */}
      <Wire points={[640, 106, 640, 58]} />
      <Arrowhead x={640} y={68} rot={-90} s={1.8} />
      <MathLabel x={652} y={80} tex="\hat{c}(t)" anchor="start" w={46} />

      {/* Feedback path closes the loop back to the phase detector. */}
      <Wire points={[640, 106, 640, 134, 254, 134, 254, 118]} />
      <Arrowhead x={440} y={134} rot={180} s={1.8} />
      <MathLabel x={447} y={146} tex="\text{feedback}" w={100} />

      {/* Animated signal packets. */}
      <FlowPacket x={lpx} y={lpy} color="var(--color-h)" r={5} />
      <FlowPacket x={tx} y={ty} color={tColor} r={5} />
    </Schematic>
  );
}

/** Envelope-detector circuit (diode + RC). `phase` drives the diode conduction;
 *  `clock` drives the flowing signal packet (green AM in → blue envelope out). */
export function EnvelopeDetectorCircuit({ phase, clock }: { phase: 0 | 1; clock: number }) {
  const cp = (((clock / FLOW_PERIOD) % 1) + 1) % 1;
  const mainPath: [number, number][] = [
    [36, 54],
    [205, 54],
    [330, 54],
    [700, 54],
  ];
  const [ex, ey] = pointAlong(mainPath, cp);
  const eColor = ex < 330 ? 'var(--color-x)' : 'var(--color-y)';

  return (
    <Schematic width={760} height={140} ariaLabel={t('analog.mod.circuit')} zoomable={false}>
      {/* Half-wave rectifier */}
      <Wire points={[36, 54, 180, 54]} />
      <MathLabel x={36} y={32} tex="r(t)" anchor="start" w={70} />
      <Diode x={205} y={54} s={1.7} active={phase === 1} />
      <Wire points={[222, 54, 330, 54]} />
      <Node x={330} y={54} />

      {/* Shunt R to ground */}
      <Wire points={[330, 54, 330, 82]} />
      <Resistor x={330} y={98} rot={90} len={30} />
      <Wire points={[330, 114, 330, 124]} />
      <Ground x={330} y={124} s={1.4} />
      <MathLabel x={350} y={98} tex="R" anchor="start" w={24} />

      {/* Shunt C to ground */}
      <Wire points={[330, 54, 480, 54]} />
      <Wire points={[480, 54, 480, 86]} />
      <Capacitor x={480} y={92} s={1.6} />
      <Wire points={[480, 98, 480, 124]} />
      <Ground x={480} y={124} s={1.4} />
      <MathLabel x={500} y={92} tex="C" anchor="start" w={24} />

      {/* Recovered envelope */}
      <Wire points={[480, 54, 700, 54]} />
      <MathLabel x={700} y={32} tex="\hat{m}(t)" anchor="end" w={70} />

      {/* Animated signal packet: AM in (green) → recovered envelope (blue). */}
      <FlowPacket x={ex} y={ey} color={eColor} r={5} />
    </Schematic>
  );
}
