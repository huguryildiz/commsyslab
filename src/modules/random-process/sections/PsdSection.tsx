import { Panel, Formula, TheoryBox } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { t } from '@/i18n';
import type { Derived, ProcessParams } from '../model';

interface Props {
  params: ProcessParams;
  d: Derived;
}

export function PsdSection({ d, params }: Props) {
  const freqs = Array.from(d.freqs);
  const est = Array.from(d.psdEstimate);
  const estMax = Math.max(1e-6, ...est);
  const estNorm = est.map((v) => v / estMax);
  const showTheory = params.kind === 'white-gaussian' || params.kind === 'colored' || params.kind === 'binary-nrz';
  const theory = Array.from(d.psdTheory);
  const thMax = Math.max(1e-6, ...theory);
  const thNorm = theory.map((v) => v / thMax);

  return (
    <Panel title={t('rp.psd.title')}>
      <Canvas
        height={240}
        ariaLabel="power spectral density: estimate vs theory"
        deps={[d]}
        draw={(ctx, w, h) => {
          const ax = {
            x: linScale([0, freqs[freqs.length - 1]], [36, w - 8]),
            y: linScale([0, 1.1], [h - 20, 12]),
          };
          drawAxes(ctx, ax, [0, freqs[freqs.length - 1]]);
          drawLine(ctx, ax, freqs, estNorm, CHART.blue, 1.6);
          if (showTheory) drawLine(ctx, ax, freqs, thNorm, CHART.orange, 2, true);
        }}
      />
      <Formula tex="S_X(f)=\mathcal{F}\{R_X(\tau)\},\quad P_X=\int_{-\infty}^{\infty} S_X(f)\,df=R_X(0)" />
      <TheoryBox>
        Wiener–Khinchin: the power spectral density is the Fourier transform of the autocorrelation.
        Blue = averaged periodogram estimate (normalized), dashed orange = theory. White noise is
        flat; the RC filter rolls it off; NRZ follows a sinc² shape.
      </TheoryBox>
    </Panel>
  );
}
