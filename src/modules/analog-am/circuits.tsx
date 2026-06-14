import {
  Schematic,
  Wire,
  Block,
  Node,
  Label,
  Diode,
  Resistor,
  Capacitor,
  Transformer,
  Ground,
  Summer,
} from '@/lib/plot/schematic';
import { t } from '@/i18n';
import type { ModulatorKind } from './model';

/** Block diagram for each modulator (input → device → BPF → output). */
export function ModulatorBlockDiagram({ kind }: { kind: ModulatorKind }) {
  const deviceLabel =
    kind === 'power-law'
      ? 'Nonlinear device'
      : kind === 'switching'
        ? 'Diode switch'
        : kind === 'balanced'
          ? 'Balanced mods'
          : 'Diode ring';
  return (
    <Schematic width={200} height={70} ariaLabel={t('analog.mod.block')}>
      <Wire points={[6, 35, 40, 35]} />
      <Label x={20} y={28} text="m(t)" />
      <Block x={40} y={22} w={46} h={26} label={deviceLabel} />
      <Wire points={[86, 35, 120, 35]} />
      <Block x={120} y={22} w={40} h={26} label="BPF fc" />
      <Wire points={[160, 35, 194, 35]} />
      <Label x={180} y={28} text="u(t)" />
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
          <Label x={12} y={38} text="vi" anchor="start" />
          <Diode x={70} y={45} active={phase === 1} />
          <Wire points={[80, 45, 120, 45]} />
          <Block x={120} y={32} w={40} h={26} label="BPF" />
          <Wire points={[160, 45, 192, 45]} />
          <Label x={180} y={38} text="u(t)" />
          <Label x={70} y={62} text="P-N diode" />
        </Schematic>
      );
    case 'switching':
      return (
        <Schematic width={200} height={90} ariaLabel={t('analog.mod.circuit')}>
          <Wire points={[10, 45, 55, 45]} />
          <Label x={12} y={38} text="m+cos" anchor="start" />
          <Diode x={65} y={45} active={phase === 1} />
          <Wire points={[75, 45, 100, 45]} />
          <Resistor x={110} y={45} />
          <Wire points={[120, 45, 130, 45]} />
          <Node x={130} y={45} />
          <Wire points={[130, 45, 130, 70]} />
          <Ground x={130} y={70} />
          <Wire points={[130, 45, 150, 45]} />
          <Block x={150} y={32} w={36} h={26} label="BPF" />
          <Label x={65} y={62} text="switch s(t)" />
        </Schematic>
      );
    case 'balanced':
      return (
        <Schematic width={200} height={90} ariaLabel={t('analog.mod.circuit')}>
          <Label x={6} y={20} text="+m" anchor="start" />
          <Block x={30} y={10} w={40} h={20} label="AM mod" />
          <Label x={6} y={66} text="-m" anchor="start" />
          <Block x={30} y={56} w={40} h={20} label="AM mod" />
          <Wire points={[70, 20, 110, 20, 110, 38]} />
          <Wire points={[70, 66, 110, 66, 110, 52]} />
          <Summer x={110} y={45} sign="-" />
          <Wire points={[117, 45, 160, 45]} />
          <Label x={150} y={38} text="2Ac·m·cos" />
        </Schematic>
      );
    case 'ring':
      return (
        <Schematic width={200} height={90} ariaLabel={t('analog.mod.circuit')}>
          <Transformer x={30} y={45} />
          <Label x={24} y={72} text="m(t)" />
          <Diode x={90} y={25} rot={0} active={phase === 0} />
          <Diode x={90} y={65} rot={0} active={phase === 0} />
          <Diode x={120} y={45} rot={90} active={phase === 1} />
          <Diode x={60} y={45} rot={90} active={phase === 1} />
          <Transformer x={160} y={45} />
          {/* Diamond diode ring linking the two transformer taps. */}
          <Wire points={[60, 45, 90, 25, 120, 45, 90, 65, 60, 45]} />
          <Wire points={[42, 45, 60, 45]} />
          <Wire points={[120, 45, 148, 45]} />
          <Label x={95} y={84} text="square carrier fc" />
        </Schematic>
      );
  }
}

/** Envelope-detector circuit (diode + RC). `phase` drives the diode conduction. */
export function EnvelopeDetectorCircuit({ phase }: { phase: 0 | 1 }) {
  return (
    <Schematic width={200} height={90} ariaLabel={t('analog.mod.circuit')}>
      <Wire points={[10, 35, 50, 35]} />
      <Label x={12} y={28} text="r(t)" anchor="start" />
      <Diode x={60} y={35} active={phase === 1} />
      <Wire points={[70, 35, 120, 35]} />
      <Node x={120} y={35} />
      <Wire points={[120, 35, 120, 50]} />
      <Resistor x={120} y={58} />
      <Wire points={[120, 66, 120, 74]} />
      <Ground x={120} y={74} />
      <Wire points={[120, 35, 150, 35]} />
      <Capacitor x={150} y={48} />
      <Wire points={[150, 35, 150, 42]} />
      <Wire points={[150, 54, 150, 74]} />
      <Ground x={150} y={74} />
      <Wire points={[120, 35, 185, 35]} />
      <Label x={178} y={28} text="m(t)" />
    </Schematic>
  );
}
