import { Panel, Readout, Formula, TheoryBox } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, drawVLine } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { t } from '@/i18n';
import { outputSnrDb, emphasisGainDb } from '@/lib/dsp/analognoise';
import { MESSAGE_POWER, type Derived, type ScenarioParams } from '../model';

interface Props {
  params: ScenarioParams;
  d: Derived;
}

export function ThresholdEmphasisSection({ params, d }: Props) {
  const x = Array.from(d.cnrSweep);
  const sp = { amIndex: params.amIndex, beta: params.beta, messagePower: MESSAGE_POWER, emphasis: false, W: params.W };
  const spE = { ...sp, emphasis: true };
  // FM output SNR with and without emphasis. Below the threshold FM collapses, so we clamp the
  // curve to cnr-10 to make the knee visible; above the threshold we use the theoretical SNR.
  const noEmph = x.map((cnr) => (cnr < d.fmThresholdDb ? cnr - 10 : outputSnrDb('fm', cnr, sp)));
  const withEmph = x.map((cnr) => (cnr < d.fmThresholdDb ? cnr - 10 : outputSnrDb('fm', cnr, spE)));
  const yMax = Math.max(1, ...withEmph);
  const yMin = Math.min(0, ...noEmph);
  const emphGain = emphasisGainDb(params.beta, params.W);

  return (
    <Panel title={t('an.threshold.title')}>
      <Canvas
        height={240}
        ariaLabel="FM output SNR with threshold knee and emphasis gain"
        deps={[d]}
        draw={(ctx, w, h) => {
          const ax = {
            x: linScale([x[0], x[x.length - 1]], [36, w - 8]),
            y: linScale([yMin, yMax], [h - 20, 12]),
          };
          drawAxes(ctx, ax, [x[0], x[x.length - 1]]);
          drawLine(ctx, ax, x, noEmph, CHART.pink, 1.6);
          drawLine(ctx, ax, x, withEmph, CHART.green, 2);
          drawVLine(ctx, ax, d.fmThresholdDb, yMin, yMax, CHART.dim, true);
        }}
      />
      <Readout label="FM threshold CNR" value={d.fmThresholdDb.toFixed(1)} unit="dB" />
      <Readout label="pre/de-emphasis gain" value={emphGain.toFixed(1)} unit="dB" />
      <Formula tex="\text{threshold} \uparrow \text{ with } \beta;\quad \text{de-emphasis adds SNR}" />
      <TheoryBox>
        Above the threshold (dashed line) FM SNR rises with β²; below it the signal collapses into
        the noise. Pre-emphasis at the transmitter and de-emphasis at the receiver lift the output
        SNR further (green vs pink).
      </TheoryBox>
    </Panel>
  );
}
