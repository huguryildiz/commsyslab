/**
 * FM Radio Broadcasting tab — Proakis & Salehi §4.4.
 * Three sub-tabs:
 *   1. Pre/De-emphasis (§6.2.2, referenced from §4.4.3)
 *   2. Stereo Multiplexing (§4.4.2)
 *   3. Superheterodyne Receiver (§4.4.1)
 */
import { useMemo, useState } from 'react';
import { Panel, Slider, HintText, Formula, Segmented } from '@/components';
import { t } from '@/i18n';
import { Canvas } from '@/lib/plot/Canvas';
import { useZoom } from '@/lib/plot/useZoom';
import { linScale, drawAxes, drawLine } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import {
  preEmphasisMagDb,
  deEmphasisMagDb,
  emphasisSnrGainDb,
  stereoMuxSpectrum,
} from '@/lib/dsp/analog';
import { Schematic, Block, Wire, Arrowhead, MathLabel, Label } from '@/lib/plot/schematic';
import { ResetButton } from './ResetButton';
import '@/lib/plot/schematic.css';

type RadioSubTab = 'emphasis' | 'stereo' | 'superhet';

// ── Audio bandwidth for FM radio (Proakis §4.4, W = 15 kHz) ─────────────────
const AUDIO_W = 15_000;
const DEFAULT_F1 = 2_120; // τ = 75 µs → f₀ ≈ 2120 Hz (§6.2.2)
const DEFAULT_RF = 98.0; // MHz (mid FM band)
const IF_FREQ = 10.7; // MHz (fixed, §4.4.1)

// ── Pre/De-emphasis sub-tab ─────────────────────────────────────────────────

function PreEmphSubTab() {
  const [f1, setF1] = useState(DEFAULT_F1);
  const [resetKey, setResetKey] = useState(0);

  const reset = () => {
    setF1(DEFAULT_F1);
    setResetKey((k) => k + 1);
  };

  const snrGain = useMemo(() => emphasisSnrGainDb(f1, AUDIO_W), [f1]);

  // Frequency axis: 100 Hz – 20 kHz
  const freqs = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i <= 400; i++) {
      pts.push(100 + (i / 400) * (20_000 - 100));
    }
    return pts;
  }, []);

  const peMag = useMemo(() => preEmphasisMagDb(freqs, f1), [freqs, f1]);
  const deMag = useMemo(() => deEmphasisMagDb(freqs, f1), [freqs, f1]);

  const [fLo, fHi, handleWheel, , handlePan] = useZoom(0.1, 20, {
    minSpan: 0.5,
    maxSpan: 80,
    clampMin: 0.05,
  });

  const PAD = { l: 56, r: 18, t: 18, b: 46 };

  const draw = (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    ctx.clearRect(0, 0, W, H);

    // xScale domain: kHz; yScale domain: dB
    const xScale = linScale([fLo, fHi], [PAD.l, W - PAD.r]);
    const yScale = linScale([-30, 16], [H - PAD.b, PAD.t]);
    const ax = { x: xScale, y: yScale };

    drawAxes(ctx, ax, [fLo, fHi], {
      domainY: [-30, 16],
      xLabel: '$f\\,(\\mathrm{kHz})$',
      yLabel: '$|H(f)|\\,(\\mathrm{dB})$',
      xTickFormat: (v) => v.toFixed(0),
    });

    ctx.save();
    ctx.beginPath();
    ctx.rect(PAD.l, PAD.t, W - PAD.l - PAD.r, H - PAD.t - PAD.b);
    ctx.clip();

    // Data-domain arrays (kHz, dB) — drawLine applies the scales internally
    const freqsKHz = freqs.map((f) => f / 1000);
    drawLine(ctx, ax, freqsKHz, peMag, CHART.green, 2);
    drawLine(ctx, ax, freqsKHz, deMag, CHART.orange, 2);

    // 0 dB reference line
    ctx.strokeStyle = CHART.dim;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    const y0 = yScale(0);
    ctx.beginPath();
    ctx.moveTo(PAD.l, y0);
    ctx.lineTo(W - PAD.r, y0);
    ctx.stroke();
    ctx.setLineDash([]);

    // f₁ vertical marker
    const xF1 = xScale(f1 / 1000);
    if (xF1 >= PAD.l && xF1 <= W - PAD.r) {
      ctx.strokeStyle = CHART.pink;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(xF1, PAD.t);
      ctx.lineTo(xF1, H - PAD.b);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();

    // Legend
    const lx = PAD.l + 12;
    let ly = PAD.t + 16;
    ctx.fillStyle = CHART.green;
    ctx.font = '11px var(--mono)';
    ctx.fillText('H_pe(f)', lx, ly);
    ly += 16;
    ctx.fillStyle = CHART.orange;
    ctx.fillText('H_de(f)', lx, ly);
  };

  return (
    <div className="analog__section">
      <div className="module-layout">
        <aside className="analog__controls">
          <Panel title={t('analog.fm.radio.emphasis.panel')}>
            <Slider
              label={<HintText text={t('analog.fm.radio.emphasis.f1')} />}
              value={f1 / 1000}
              min={1}
              max={5}
              step={0.1}
              unit="kHz"
              onChange={(v) => setF1(v * 1000)}
            />
            <ResetButton onClick={reset} />
          </Panel>
        </aside>

        <div className="analog__content">
          <div className="analog__readouts">
            <div className="analog__metric">
              <span className="analog__metric__label">
                <HintText text="$f_1$" />
              </span>
              <span className="analog__metric__value">
                {(f1 / 1000).toFixed(2)}
                <small>kHz</small>
              </span>
            </div>
            <div className="analog__metric">
              <span className="analog__metric__label">
                <HintText text={t('analog.fm.radio.emphasis.snrGain')} />
              </span>
              <span className="analog__metric__value analog__metric__value--ok">
                +{snrGain.toFixed(1)}
                <small>dB</small>
              </span>
            </div>
            <div className="analog__metric">
              <span className="analog__metric__label">
                <HintText text="$\tau$" />
              </span>
              <span className="analog__metric__value">
                {(1e6 / (2 * Math.PI * f1)).toFixed(1)}
                <small>µs</small>
              </span>
            </div>
          </div>

          <Panel key={resetKey} title={<HintText text={t('analog.fm.radio.emphasis.plot')} />}>
            <Canvas
              draw={draw}
              deps={[peMag, deMag, fLo, fHi]}
              height={280}
              ariaLabel="Pre/de-emphasis frequency response"
              onWheel={handleWheel}
              onPan={handlePan}
            />
          </Panel>

          <div className="analog__cards">
            <div className="analog__card">
              <h3 className="analog__card__title analog__card__title--green">
                Pre-emphasis (§6.2.2)
              </h3>
              <div className="analog__card__body">
                <p>
                  Before FM modulation, the audio signal is passed through a high-frequency
                  boost filter to increase the power of high-frequency components:
                </p>
                <div className="analog__card__formula">
                  <Formula tex="H_{pe}(f) = 1 + j\,\frac{f}{f_1}" block />
                </div>
                <p>
                  This raises high-frequency content (where FM noise is worst) so the
                  signal-to-noise ratio at the receiver can be improved.
                </p>
              </div>
            </div>

            <div className="analog__card">
              <h3 className="analog__card__title analog__card__title--orange">
                De-emphasis (§6.2.2)
              </h3>
              <div className="analog__card__body">
                <p>
                  After FM demodulation, the complementary low-pass filter restores flat audio
                  while suppressing the high-frequency noise amplified by FM:
                </p>
                <div className="analog__card__formula">
                  <Formula tex="H_{de}(f) = \frac{1}{1 + j\,f/f_1}" block />
                </div>
                <p>
                  The time constant <Formula tex="\tau = 1/(2\pi f_1) = 75\,\mu\mathrm{s}" /> is
                  standardized in commercial FM broadcasting.
                </p>
              </div>
            </div>

            <div className="analog__card">
              <h3 className="analog__card__title analog__card__title--blue">SNR Improvement</h3>
              <div className="analog__card__body">
                <p>
                  The pre/de-emphasis pair provides an SNR gain relative to FM without emphasis.
                  For a flat audio spectrum over <Formula tex="[0, W]" />:
                </p>
                <div className="analog__card__formula">
                  <Formula
                    tex="\text{SNR gain} = \frac{(W/f_1)^3}{3\bigl(W/f_1 - \arctan(W/f_1)\bigr)}"
                    block
                  />
                </div>
                <p>
                  At <Formula tex="f_1 = 2.12\,\mathrm{kHz}" />, <Formula tex="W = 15\,\mathrm{kHz}" />,
                  the gain is approximately 13 dB.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stereo Multiplexing sub-tab ──────────────────────────────────────────────

function StereoSubTab() {
  const [balance, setBalance] = useState(0.8);
  const [resetKey, setResetKey] = useState(0);

  const reset = () => {
    setBalance(0.8);
    setResetKey((k) => k + 1);
  };

  const { freqs, mag } = useMemo(() => stereoMuxSpectrum(balance), [balance]);

  const [fLo, fHi, handleWheel, , handlePan] = useZoom(0, 60, {
    minSpan: 5,
    maxSpan: 240,
    clampMin: 0,
  });

  const PAD = { l: 48, r: 18, t: 18, b: 46 };

  const draw = (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    ctx.clearRect(0, 0, W, H);

    // xScale domain: kHz; freqs from stereoMuxSpectrum are Hz → divide by 1000
    const xScale = linScale([fLo, fHi], [PAD.l, W - PAD.r]);
    const yScale = linScale([0, 1.1], [H - PAD.b, PAD.t]);
    const ax = { x: xScale, y: yScale };

    drawAxes(ctx, ax, [fLo, fHi], {
      domainY: [0, 1.1],
      xLabel: '$f\\,(\\mathrm{kHz})$',
      yLabel: 'Magnitude (norm.)',
      xTickFormat: (v) => v.toFixed(0),
    });

    ctx.save();
    ctx.beginPath();
    ctx.rect(PAD.l, PAD.t, W - PAD.l - PAD.r, H - PAD.t - PAD.b);
    ctx.clip();

    const freqsKHz = freqs.map((f) => f / 1000);

    // Fill under the composite spectrum
    ctx.beginPath();
    for (let i = 0; i < freqsKHz.length; i++) {
      const px = xScale(freqsKHz[i]);
      const py = yScale(mag[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.lineTo(xScale(freqsKHz[freqsKHz.length - 1]), yScale(0));
    ctx.lineTo(xScale(freqsKHz[0]), yScale(0));
    ctx.closePath();
    ctx.fillStyle = `${CHART.blue}22`;
    ctx.fill();

    // Composite spectrum line (data-domain values, drawLine applies scales internally)
    drawLine(ctx, ax, freqsKHz, mag, CHART.blue, 2);

    // Region labels (data-domain kHz positions)
    ctx.font = '10px var(--mono)';
    ctx.textAlign = 'center';
    ctx.fillStyle = CHART.green;
    const lrPlusX = xScale(7.5);
    if (lrPlusX >= PAD.l && lrPlusX <= W - PAD.r) ctx.fillText('L+R', lrPlusX, PAD.t + 12);
    ctx.fillStyle = CHART.pink;
    const pilotX = xScale(19);
    if (pilotX >= PAD.l && pilotX <= W - PAD.r) ctx.fillText('pilot', pilotX, PAD.t + 12);
    ctx.fillStyle = CHART.orange;
    const dsbX = xScale(38);
    if (dsbX >= PAD.l && dsbX <= W - PAD.r) ctx.fillText('L−R (DSB-SC)', dsbX, PAD.t + 12);

    ctx.restore();
  };

  return (
    <div className="analog__section">
      <div className="module-layout">
        <aside className="analog__controls">
          <Panel title={t('analog.fm.radio.stereo.panel')}>
            <Slider
              label={<HintText text={t('analog.fm.radio.stereo.balance')} />}
              value={balance}
              min={-1}
              max={1}
              step={0.05}
              onChange={setBalance}
            />
            <ResetButton onClick={reset} />
          </Panel>
        </aside>

        <div className="analog__content">
          <div className="analog__readouts">
            <div className="analog__metric">
              <span className="analog__metric__label">
                <HintText text="L/R" />
              </span>
              <span className="analog__metric__value">
                {balance > 0.05
                  ? `L ${(((balance + 1) / 2) * 100).toFixed(0)}%`
                  : balance < -0.05
                    ? `R ${(((1 - balance) / 2) * 100).toFixed(0)}%`
                    : 'Mono'}
              </span>
            </div>
            <div className="analog__metric">
              <span className="analog__metric__label">Pilot</span>
              <span className="analog__metric__value">
                19<small>kHz</small>
              </span>
            </div>
            <div className="analog__metric">
              <span className="analog__metric__label">L−R SC</span>
              <span className="analog__metric__value">
                38<small>kHz</small>
              </span>
            </div>
          </div>

          <Panel key={resetKey} title={t('analog.fm.radio.stereo.plot')}>
            <Canvas
              draw={draw}
              deps={[freqs, mag, fLo, fHi]}
              height={280}
              ariaLabel="Stereo composite baseband spectrum"
              onWheel={handleWheel}
              onPan={handlePan}
            />
          </Panel>

          <div className="analog__cards">
            <div className="analog__card">
              <h3 className="analog__card__title analog__card__title--green">
                L+R Baseband (§4.4.2)
              </h3>
              <div className="analog__card__body">
                <p>
                  The sum channel carries mono-compatible audio from 0 to 15 kHz. Any FM receiver
                  (stereo or mono) can decode this channel independently.
                </p>
                <div className="analog__card__formula">
                  <Formula tex="s_1(t) = L(t) + R(t),\quad 0 \leq f \leq 15\,\mathrm{kHz}" block />
                </div>
              </div>
            </div>

            <div className="analog__card">
              <h3 className="analog__card__title analog__card__title--orange">
                L−R DSB-SC Channel
              </h3>
              <div className="analog__card__body">
                <p>
                  The difference channel is double-sideband suppressed-carrier modulated at
                  38 kHz, occupying 23–53 kHz. The 19 kHz pilot tone enables the receiver to
                  regenerate the 38 kHz carrier for demodulation:
                </p>
                <div className="analog__card__formula">
                  <Formula
                    tex="s_2(t) = \bigl[L(t) - R(t)\bigr]\cos(2\pi \cdot 38\,\mathrm{kHz}\cdot t)"
                    block
                  />
                </div>
              </div>
            </div>

            <div className="analog__card">
              <h3 className="analog__card__title analog__card__title--blue">
                Composite Baseband (Fig. 4.17)
              </h3>
              <div className="analog__card__body">
                <p>
                  The complete FM stereo composite signal is the sum of three components.
                  Its bandwidth is approximately 53 kHz, well within the ±75 kHz peak deviation
                  allowed for commercial FM:
                </p>
                <div className="analog__card__formula">
                  <Formula
                    tex="s_{BB}(t) = \underbrace{(L+R)}_{\text{0–15 kHz}} + \underbrace{(L-R)\cos(2\pi f_{sc} t)}_{\text{DSB-SC}} + \underbrace{p(t)}_{\text{pilot}}"
                    block
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Superheterodyne Receiver sub-tab ─────────────────────────────────────────

function SuperHetDiagram({ rfMHz }: { rfMHz: number }) {
  const loMHz = rfMHz + IF_FREQ;
  const W = 680;
  const H = 148;

  return (
    <Schematic width={W} height={H} ariaLabel="Superheterodyne FM receiver block diagram">
      {/* Antenna symbol */}
      <line x1={20} y1={68} x2={20} y2={42} stroke="var(--text-dim)" strokeWidth={1.5} />
      <line x1={11} y1={42} x2={29} y2={42} stroke="var(--text-dim)" strokeWidth={1.5} />
      <line x1={8} y1={46} x2={32} y2={46} stroke="var(--text-dim)" strokeWidth={1} />
      <text
        x={20}
        y={32}
        textAnchor="middle"
        fontSize="9"
        fill="var(--text-dim)"
        fontFamily="var(--mono)"
      >
        ANT
      </text>

      {/* Horizontal wires */}
      <Wire points={[20, 68, 80, 68]} />
      <Arrowhead x={80} y={68} />
      <Wire points={[152, 68, 186, 68]} />
      <Arrowhead x={186} y={68} />
      <Wire points={[258, 68, 292, 68]} />
      <Arrowhead x={292} y={68} />
      <Wire points={[364, 68, 398, 68]} />
      <Arrowhead x={398} y={68} />
      <Wire points={[470, 68, 504, 68]} />
      <Arrowhead x={504} y={68} />
      <Wire points={[584, 68, 618, 68]} />
      <Arrowhead x={618} y={68} />

      {/* LO vertical wire up into mixer */}
      <Wire points={[270, 126, 270, 84]} />
      <Arrowhead x={270} y={84} rot={-90} />

      {/* Blocks */}
      <Block x={80} y={52} w={72} h={32} label="" tex="\text{RF Amp}" />
      <Block x={186} y={52} w={72} h={32} label="" tex="\text{Mixer}" />
      <Block x={292} y={52} w={72} h={32} label="" tex="\text{IF Filter}" />
      <Block x={398} y={52} w={72} h={32} label="" tex="\text{Limiter}" />
      <Block x={504} y={52} w={80} h={32} label="" tex="\text{Discrim.}" />
      <Block x={234} y={96} w={72} h={30} label="" tex="\text{LO}" />

      {/* Audio output label */}
      <Label x={634} y={68} text="Audio" />

      {/* Frequency annotations below blocks */}
      <MathLabel x={116} y={96} tex={`${rfMHz.toFixed(1)}\\,\\text{MHz}`} w={68} />
      <MathLabel x={328} y={96} tex={`${IF_FREQ}\\,\\text{MHz}`} w={62} />
      <MathLabel x={270} y={140} tex={`f_{LO}\\!=\\!${loMHz.toFixed(1)}\\,\\text{MHz}`} w={110} />
    </Schematic>
  );
}

function SuperHetSubTab() {
  const [rfMHz, setRfMHz] = useState(DEFAULT_RF);

  const loMHz = rfMHz + IF_FREQ;

  return (
    <div className="analog__section">
      <div className="module-layout">
        <aside className="analog__controls">
          <Panel title={t('analog.fm.radio.superhet.panel')}>
            <Slider
              label={<HintText text={t('analog.fm.radio.superhet.rfFreq')} />}
              value={rfMHz}
              min={88}
              max={108}
              step={0.1}
              unit="MHz"
              onChange={setRfMHz}
            />
          </Panel>
        </aside>

        <div className="analog__content">
          <div className="analog__readouts">
            <div className="analog__metric">
              <span className="analog__metric__label">
                <HintText text={t('analog.fm.radio.superhet.readout.rf')} />
              </span>
              <span className="analog__metric__value">
                {rfMHz.toFixed(1)}
                <small>MHz</small>
              </span>
            </div>
            <div className="analog__metric">
              <span className="analog__metric__label">
                <HintText text={t('analog.fm.radio.superhet.readout.lo')} />
              </span>
              <span className="analog__metric__value">
                {loMHz.toFixed(1)}
                <small>MHz</small>
              </span>
            </div>
            <div className="analog__metric">
              <span className="analog__metric__label">
                <HintText text={t('analog.fm.radio.superhet.readout.if')} />
              </span>
              <span className="analog__metric__value analog__metric__value--ok">
                {IF_FREQ}
                <small>MHz</small>
              </span>
            </div>
          </div>

          <Panel title={t('analog.fm.radio.superhet.diagram')}>
            <SuperHetDiagram rfMHz={rfMHz} />
          </Panel>

          <div className="analog__cards">
            <div className="analog__card">
              <h3 className="analog__card__title analog__card__title--green">
                Heterodyning (§4.4.1)
              </h3>
              <div className="analog__card__body">
                <p>
                  The mixer multiplies the received RF signal with the local oscillator (LO),
                  translating it down to the fixed intermediate frequency:
                </p>
                <div className="analog__card__formula">
                  <Formula
                    tex="f_{IF} = f_{LO} - f_{RF} = 10.7\,\mathrm{MHz}"
                    block
                  />
                </div>
                <p>
                  Fixing <Formula tex="f_{IF}" /> allows the IF filter and discriminator to be
                  optimised once for all FM stations in the 88–108 MHz band.
                </p>
              </div>
            </div>

            <div className="analog__card">
              <h3 className="analog__card__title analog__card__title--orange">
                FM Band (§4.4, Fig. 4.16)
              </h3>
              <div className="analog__card__body">
                <p>
                  Commercial FM broadcasting occupies 88–108 MHz with 200 kHz channel spacing
                  and a maximum peak frequency deviation of 75 kHz:
                </p>
                <div className="analog__card__formula">
                  <Formula
                    tex="\Delta f_{\max} = 75\,\mathrm{kHz},\quad B_{channel} = 200\,\mathrm{kHz}"
                    block
                  />
                </div>
                <ul>
                  <li>Carson bandwidth: <Formula tex="B_c = 2(\Delta f + W) = 2(75+15) = 180\,\mathrm{kHz}" /></li>
                  <li>Channel spacing: 200 kHz (leaves ~10 kHz guard bands)</li>
                </ul>
              </div>
            </div>

            <div className="analog__card">
              <h3 className="analog__card__title analog__card__title--blue">
                Discriminator & Limiter
              </h3>
              <div className="analog__card__body">
                <p>
                  The limiter removes AM noise and amplitude fluctuations before the FM
                  discriminator recovers the instantaneous frequency deviation:
                </p>
                <div className="analog__card__formula">
                  <Formula
                    tex="\hat{m}(t) = \frac{1}{2\pi k_f}\,\frac{d\theta(t)}{dt} - f_c"
                    block
                  />
                </div>
                <p>
                  The IF filter (centered at 10.7 MHz) also provides image-frequency rejection,
                  suppressing stations at <Formula tex="f_{RF} - 2f_{IF} = f_{RF} - 21.4\,\mathrm{MHz}" />.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Top-level RadioSection ───────────────────────────────────────────────────

export function RadioSection() {
  const [subTab, setSubTab] = useState<RadioSubTab>('emphasis');

  return (
    <div>
      <div className="analog__subtabbar">
        <Segmented<RadioSubTab>
          ariaLabel={t('analog.fm.radio.subtab.ariaLabel')}
          value={subTab}
          options={[
            { value: 'emphasis', label: t('analog.fm.radio.subtab.emphasis') },
            { value: 'stereo', label: t('analog.fm.radio.subtab.stereo') },
            { value: 'superhet', label: t('analog.fm.radio.subtab.superhet') },
          ]}
          onChange={setSubTab}
        />
      </div>

      {subTab === 'emphasis' && <PreEmphSubTab />}
      {subTab === 'stereo' && <StereoSubTab />}
      {subTab === 'superhet' && <SuperHetSubTab />}
    </div>
  );
}
