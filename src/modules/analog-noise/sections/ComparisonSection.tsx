import { Panel, Formula, TheoryBox } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { t } from '@/i18n';
import type { AnalogScheme, Derived, ScenarioParams } from '../model';

interface Props {
  params: ScenarioParams;
  d: Derived;
}

const COLORS: Record<AnalogScheme, string> = {
  dsb: CHART.green,
  ssb: CHART.blue,
  am: CHART.orange,
  fm: CHART.pink,
};

export function ComparisonSection({ params, d }: Props) {
  const x = Array.from(d.cnrSweep);
  const schemes: AnalogScheme[] = ['dsb', 'ssb', 'am', 'fm'];
  const yMax = Math.max(
    1,
    ...schemes.flatMap((s) => Array.from(d.curves[s])),
  );
  const yMin = Math.min(0, ...schemes.flatMap((s) => Array.from(d.curves[s])));

  return (
    <Panel title={t('an.compare.title')}>
      <Canvas
        height={260}
        ariaLabel="output SNR vs channel CNR for all schemes"
        deps={[d]}
        draw={(ctx, w, h) => {
          const ax = {
            x: linScale([x[0], x[x.length - 1]], [36, w - 8]),
            y: linScale([yMin, yMax], [h - 20, 12]),
          };
          drawAxes(ctx, ax, [x[0], x[x.length - 1]]);
          for (const s of schemes) {
            drawLine(ctx, ax, x, Array.from(d.curves[s]), COLORS[s], s === params.scheme ? 2.4 : 1.2);
          }
          // operating point marker for the current scheme
          const px = ax.x(params.cnrDb);
          const py = ax.y(d.outputSnrDb);
          ctx.fillStyle = CHART.text;
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, 2 * Math.PI);
          ctx.fill();
        }}
      />
      <Formula tex="\Upsilon = \tfrac{B_c}{W} = 2(\beta+1),\quad \left(\tfrac{S}{N}\right)_{o,\text{FM}} \propto \beta^2" />
      <TheoryBox>
        DSB/SSB sit on the unity-gain line; conventional AM is below it; FM climbs as β² above its
        threshold. The dot marks the current scenario. FM trades bandwidth (Carson B_c = 2(β+1)W)
        for SNR.
      </TheoryBox>
    </Panel>
  );
}
