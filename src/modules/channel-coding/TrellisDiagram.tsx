import { Canvas } from '@/lib/plot/Canvas';
import { CHART, alpha } from '@/lib/plot/colors';
import { nextState, type ConvCode, type ViterbiResult } from '@/lib/dsp/convcodes';

interface TrellisDiagramProps {
  code: ConvCode;
  result: ViterbiResult;
  stepIndex: number; // 0..result.steps.length (== final → show ML traceback)
}

/**
 * Trellis: states stacked vertically, time on x. Branches drawn up to stepIndex; surviving
 * branches bold, pruned faint. Input-0 solid, input-1 dashed (book convention). At the final
 * step the ML path (traceback) is highlighted. Accumulated path metrics annotate the nodes.
 */
export function TrellisDiagram({ code, result, stepIndex }: TrellisDiagramProps) {
  const m = result.steps.length;
  const nS = code.nStates;
  return (
    <Canvas
      height={40 + nS * 46}
      ariaLabel="Trellis and Viterbi survivor paths"
      deps={[code.L, code.g1.join(''), code.g2.join(''), stepIndex, m]}
      draw={(ctx, w, h) => {
        const padL = 30;
        const padR = 44;
        const padT = 18;
        const padB = 18;
        const xAt = (t: number) => padL + (t * (w - padL - padR)) / Math.max(1, m);
        const yAt = (s: number) => padT + (s * (h - padT - padB)) / Math.max(1, nS - 1);
        const shown = Math.min(stepIndex, m);

        // state labels (binary) down the left edge
        ctx.font = '10px ui-monospace, monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = CHART.dim;
        for (let s = 0; s < nS; s++) {
          ctx.fillText(s.toString(2).padStart(code.L - 1, '0'), padL - 6, yAt(s));
        }

        // branches up to `shown`
        for (let t = 0; t < shown; t++) {
          const step = result.steps[t];
          for (let s = 0; s < nS; s++) {
            // a state is a valid source if it had a finite metric before this branch
            const prevMetric = t === 0 ? (s === 0 ? 0 : Infinity) : result.steps[t - 1].metric[s];
            if (!isFinite(prevMetric)) continue;
            for (let input = 0; input < 2; input++) {
              const ns = nextState(s, input, code.L);
              const surviving = step.survivor[ns] === s;
              ctx.beginPath();
              ctx.setLineDash(input === 1 ? [4, 3] : []);
              ctx.strokeStyle = surviving ? alpha(CHART.green, 0.9) : alpha(CHART.dim, 0.3);
              ctx.lineWidth = surviving ? 2 : 1;
              ctx.moveTo(xAt(t), yAt(s));
              ctx.lineTo(xAt(t + 1), yAt(ns));
              ctx.stroke();
            }
          }
        }
        ctx.setLineDash([]);

        // ML traceback once the animation has reached the end
        if (stepIndex >= m && m > 0) {
          ctx.beginPath();
          ctx.strokeStyle = CHART.blue;
          ctx.lineWidth = 3;
          ctx.moveTo(xAt(0), yAt(result.mlPath[0]));
          for (let t = 1; t <= m; t++) ctx.lineTo(xAt(t), yAt(result.mlPath[t]));
          ctx.stroke();
        }

        // nodes + accumulated metric labels at the current frontier
        ctx.textAlign = 'center';
        for (let t = 0; t <= shown; t++) {
          for (let s = 0; s < nS; s++) {
            const metric = t === 0 ? (s === 0 ? 0 : Infinity) : result.steps[t - 1].metric[s];
            const reachable = isFinite(metric);
            ctx.beginPath();
            ctx.arc(xAt(t), yAt(s), 4, 0, Math.PI * 2);
            ctx.fillStyle = reachable ? CHART.green : CHART.bgDeep;
            ctx.fill();
            if (!reachable) {
              ctx.strokeStyle = alpha(CHART.dim, 0.5);
              ctx.lineWidth = 1;
              ctx.stroke();
            }
            if (reachable && t === shown) {
              ctx.fillStyle = CHART.text;
              ctx.font = '9px ui-monospace, monospace';
              ctx.fillText(String(metric), xAt(t) + 12, yAt(s) - 6);
            }
          }
        }
      }}
    />
  );
}
