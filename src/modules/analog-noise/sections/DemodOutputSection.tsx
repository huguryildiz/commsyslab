import { Panel, Readout, Formula, TheoryBox } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { t } from '@/i18n';
import type { Derived, ScenarioParams } from '../model';

interface Props {
  params: ScenarioParams;
  d: Derived;
}

export function DemodOutputSection({ params, d }: Props) {
  const ref = Array.from(d.reference);
  const out = Array.from(d.outputNoisy);
  const ts = ref.map((_, n) => n / params.fs);
  const yMax = Math.max(1e-6, ...out.map(Math.abs), 1);

  return (
    <Panel title={t('an.demod.title')}>
      <Canvas
        height={240}
        ariaLabel="clean message vs noisy demodulated output"
        deps={[d]}
        draw={(ctx, w, h) => {
          const ax = {
            x: linScale([0, ts[ts.length - 1]], [36, w - 8]),
            y: linScale([-yMax, yMax], [h - 20, 12]),
          };
          drawAxes(ctx, ax, [0, ts[ts.length - 1]]);
          drawLine(ctx, ax, ts, out, alpha(CHART.pink, 0.85), 1.2); // noisy output
          drawLine(ctx, ax, ts, ref, CHART.green, 2); // clean message
        }}
      />
      <Readout label="output SNR_o" value={d.outputSnrDb.toFixed(1)} unit="dB" />
      <Readout
        label="demodulation gain"
        value={d.demodGainDb.toFixed(1)}
        unit="dB"
        tone={d.demodGainDb >= 0 ? 'ok' : 'warn'}
      />
      <Formula tex="\left(\tfrac{S}{N}\right)_o = G\cdot\left(\tfrac{S}{N}\right)_{\text{ch}}" />
      <TheoryBox>
        Green = clean message, pink = demodulated output. The output is drawn as the message plus
        Gaussian noise at the theoretical output SNR_o, so the noise you see reflects the scheme's
        gain or loss at the current channel CNR.
      </TheoryBox>
    </Panel>
  );
}
