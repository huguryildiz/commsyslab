# Book.pdf — Reference Map (module ↔ chapter/page)

**Source:** Proakis & Salehi, _Fundamentals of Communication Systems_ (2nd ed.), 886 pp —
[book listing](https://amzn.eu/d/09xJVegK). This file is a map showing where to look in the book by module; it is
not the formulas themselves. When writing a simulation/formula, **read and verify the
relevant pages from the PDF** (mandatory rule in CLAUDE.md). Page numbers are the book's
printed numbers (PDF page offset ~+14).

> Notation: follow the book's conventions — `E_b/N_0`, `M`, `d_min`, `Q(·)` function,
> symbol energy `E_s`, noise PSD `N_0/2`.

**Status icons:**

- ✅ = Implemented in repo (module + DSP code exists)
- 🔶 = Partial implementation (some subsections or only DSP helpers exist)
- ⬜ = Not yet implemented

---

## Book structure (chapter map)

| Ch  | Title                                          | Page | Status | Platform relevance                                                                                             |
| --- | ---------------------------------------------- | ---- | ------ | -------------------------------------------------------------------------------------------------------------- |
| 1   | Introduction                                   | 1    | ⬜     | General system model, channel models                                                                           |
| 2   | Signals and Linear Systems                     | 21   | ✅     | Fourier, spectrum, convolution, filter design, Hilbert, bandpass/I-Q                                           |
| 3   | Amplitude Modulation                           | 117  | ✅     | AM (DSB-SC, SSB, VSB), demodulation                                                                            |
| 4   | Angle Modulation                               | 161  | ✅     | FM/PM signals, spectrum                                                                                        |
| 5   | Probability and Random Processes               | 190  | ✅     | Noise, AWGN, PSD, Gaussian processes                                                                           |
| 6   | Effect of Noise on Analog Communication        | 255  | ✅     | SNR analysis, threshold effect, pre-emphasis                                                                   |
| 7   | Analog-to-Digital Conversion                   | 296  | ✅     | Sampling, scalar/Lloyd-Max/vector quant., PCM+companding, DPCM, delta+ADM, LPC, Σ-Δ/TDM, JPEG DCT, line coding |
| 8   | Digital Modulation Methods in an AWGN Channel  | 347  | ✅     | Modulation & detection, SER/BER, DPSK, carrier-phase & symbol-timing sync, regenerative repeaters              |
| 9   | Multidimensional Digital Modulation            | 485  | ✅     | Orthogonal/biorthogonal/simplex signals, union bound, noncoherent FSK, CPFSK (CPFSK in wireless)               |
| 10  | Digital Transmission — Bandlimited Channels    | 543  | ✅     | Baseband, Nyquist, ISI, eye diagram                                                                            |
| 11  | Multicarrier Modulation and OFDM               | 621  | ✅     | OFDM modulation/demodulation                                                                                   |
| 12  | An Introduction to Information Theory          | 642  | ✅     | Entropy, Huffman, Lempel-Ziv, capacity                                                                         |
| 13  | Coding for Reliable Communications             | 689  | ✅     | Block codes, convolutional, BCH, RS, concatenated                                                              |
| 14  | Data Transmission in Fading Multipath Channels | 769  | ✅     | Rayleigh, Doppler, RAKE, MIMO, link budget                                                                     |
| 15  | Spread-Spectrum Communication Systems          | 825  | ✅     | DS-SS, CDMA, FHSS                                                                                              |

---

## Chapter details and repo mapping

---

### Chapter 1 — Introduction (pp. 1–20) ⬜

| Subsection                                           | Page | Status | Repo mapping                               |
| ---------------------------------------------------- | ---- | ------ | ------------------------------------------ |
| 1.1 Historical Review                                | 4    | ⬜     | —                                          |
| 1.2 Elements of an Electrical Communication System   | 7    | ⬜     | General model (inspiration for end-to-end) |
| 1.3 Communication Channels and Their Characteristics | 12   | ⬜     | —                                          |
| 1.4 Mathematical Models for Communication Channels   | 18   | ⬜     | —                                          |

> Introduction chapter; no direct simulation module, background knowledge only.

---

### Chapter 2 — Signals and Linear Systems (pp. 21–116) ✅

**Module:** `src/modules/fourier/` (6 tabs: Basic Signals · Convolution · Fourier Series ·
Fourier Transform & Spectra · Filters · Bandpass Signals) · **DSP:** `src/lib/dsp/fourier.ts`,
`fft.ts`, `signals.ts`, `spectrum.ts`, `window.ts`, `bandwidth.ts`, `ftpairs.ts`,
`analogfilters.ts` · module helpers `filterStudio.ts`, `model.ts`

| Subsection                            | Page | Status | Repo mapping                                                                                                                                                                                                               |
| ------------------------------------- | ---- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1 Basic Concepts (signals, systems) | 21   | ✅     | `signals.ts`, `model.ts` — Basic Signals tab + Convolution (LTI) tab                                                                                                                                                       |
| 2.2 Fourier Series                    | 43   | ✅     | `fourier.ts` — Fourier series; Fourier Series tab (partial-sum synthesis)                                                                                                                                                  |
| 2.3 Fourier Transform                 | 58   | ✅     | `fourier.ts`, `fft.ts`, `ftpairs.ts` — FFT spectra + FT pairs/properties                                                                                                                                                   |
| 2.4 Filter Design                     | 85   | ✅     | `window.ts`, `analogfilters.ts`, `filterStudio.ts` — Filters tab (LTI · Realizable Butterworth/Chebyshev · Filter Studio with audio bypass)                                                                                |
| 2.5 Power and Energy                  | 89   | ✅     | `spectrum.ts` — PSD computation; Fourier Transform tab theory cards (autocorrelation, energy spectral density `W_x(f)=\|X(f)\|²`, PSD / Wiener-Khinchin, LTI spectral I/O); periodic-signal line PSD in Fourier Series tab |
| 2.6 Hilbert Transform                 | 95   | ✅     | `fourier.ts` `hilbert()`; Bandpass Signals tab → Hilbert Transform sub-tab                                                                                                                                                 |
| 2.7 Lowpass and Bandpass Signals      | 98   | ✅     | `bandwidth.ts`, `ftpairs.ts`; Bandpass Signals tab → Lowpass & Bandpass + I/Q Representation sub-tabs                                                                                                                      |

---

### Chapter 3 — Amplitude Modulation (pp. 117–160) ✅

**Module:** `src/modules/analog-am/` (4 tabs) · **DSP:** `src/lib/dsp/analog.ts`, `src/lib/dsp/am-impl.ts`

| Subsection                                  | Page | Status | Repo mapping                                                                                                                                                  |
| ------------------------------------------- | ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 Introduction to Modulation              | 118  | ✅     | AM Schemes tab intro/TheoryBox                                                                                                                                |
| 3.2.1 DSB-SC AM                             | 119  | ✅     | `analog.ts` — DSB-SC; AM Schemes tab                                                                                                                          |
| 3.2.2 Conventional AM                       | 126  | ✅     | `analog.ts` — conventional AM + power/efficiency                                                                                                              |
| 3.2.3 SSB AM                                | 132  | ✅     | `analog.ts` — SSB (USB/LSB)                                                                                                                                   |
| 3.2.4 VSB AM                                | 134  | ✅     | `analog.ts` `vsbFilter` (complementary vestige) + AM Schemes tab                                                                                              |
| 3.3 Modulators and Demodulators             | 137  | ✅     | `am-impl.ts` (power-law/switching/balanced/ring + envelope) + Mod & Demod tab (block diagram + animated circuit + dirty/clean FFT)                            |
| 3.4.1 Frequency-Division Multiplexing (FDM) | 144  | ✅     | `am-impl.ts` `fdmCompose`/`fdmSeparate` + Signal Multiplexing tab → FDM sub-tab (channel stacking and overlap)                                                |
| 3.4.2 Quadrature-Carrier Multiplexing (QAM) | 145  | ✅     | `am-impl.ts` `qamModulate`/`qamDemod` + Signal Multiplexing tab → QAM sub-tab (I/Q channels, RX phase-error crosstalk readout, formula cards Eq. 3.4.1–3.4.2) |
| 3.5 AM Radio Broadcasting                   | 146  | ✅     | AM Radio tab (superheterodyne frequency plan + image)                                                                                                         |

---

### Chapter 4 — Angle Modulation (pp. 161–189) ✅

**Module:** `src/modules/analog-fm/` (4 tabs: Representation · Spectrum · Modulators & Demodulators · FM Radio Broadcasting) ·
**DSP:** `src/lib/dsp/analog.ts` · **Sections:** `src/modules/analog-fm/sections/`

| Subsection                                         | Page | Status | Repo mapping                                                                                                                                                                                                                        |
| -------------------------------------------------- | ---- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1 Representation of FM and PM Signals            | 161  | ✅     | `analog.ts` `fmModulate`/`pmModulate`; `RepresentationSection.tsx` — message m(t), angle-modulated signal u(t), instantaneous freq/phase (FM/PM toggle, NBFM overlay)                                                               |
| 4.2 Spectral Characteristics of Angle-Mod. Signals | 166  | ✅     | `analog.ts` `besselJ`/`fmBessel`; `SpectrumSection.tsx` — Bessel line spectrum (tone), FFT spectrum (arbitrary msg), Carson bandwidth shading, Bessel curves J₀..J₇ vs β                                                            |
| 4.3.1 FM Modulator Implementations                 | 171  | ✅     | `ModDemodSection.tsx` — Direct FM (VCO/varactor) and Armstrong indirect FM block diagrams (`FmModDemodDiagram.tsx`)                                                                                                                 |
| 4.3.2 FM Demodulator / Discriminator               | 175  | ✅     | `analog.ts` `fmDiscriminate`; `ModDemodSection.tsx` — discriminator sub-tab (differentiate → envelope → LPF) with AWGN noise toggle; block diagram in `FmDiscriminatorDiagram`; varactor-VCO and Armstrong multiplier formula cards |
| 4.3.3 PLL FM Demodulator                           | 177  | ✅     | `analog.ts` `fmPllDemodulate`; `ModDemodSection.tsx` — PLL sub-tab (2nd-order loop, B_n / ζ controls, linearized phase-error + transfer-function cards Eq. 4.3.21–4.3.28); `FmPllDiagram`                                           |
| 4.4.1 Superheterodyne FM Receiver                  | 179  | ✅     | `RadioSection.tsx` `SuperHetSubTab` — interactive block diagram, RF/LO/IF freq readouts (88–108 MHz band, f_IF = 10.7 MHz)                                                                                                          |
| 4.4.2 FM Stereo Multiplexing                       | 182  | ✅     | `analog.ts` `stereoMuxSpectrum`; `RadioSection.tsx` `StereoSubTab` — composite baseband spectrum (L+R / pilot / L−R DSB-SC), balance slider                                                                                         |
| 4.4.3 Pre-emphasis and De-emphasis                 | 185  | ✅     | `analog.ts` `preEmphasisMagDb`/`deEmphasisMagDb`/`emphasisSnrGainDb`; `RadioSection.tsx` `PreEmphSubTab` — H_pe/H_de frequency response, SNR gain readout (τ = 75 µs standard)                                                      |

---

### Chapter 5 — Probability and Random Processes (pp. 190–254) ✅

**Module:** `src/modules/random-process/` — 3-tab shell (Probability §5.1 · Random Processes
§5.2 · Gaussian & White §5.3), URL `/random-process/:tab`. **DSP:** `src/lib/dsp/probability.ts`,
`random.ts`, `awgn.ts`, `math.ts` (`qfunc`/`erf`). **Formula cards:** every section renders
book-formula info cards via the shared `cards.tsx` helper (`FormulaCards`/`FormulaCard`/`CardFormula`)
styled by `.rp__card*` in `random-process.css`.

| Subsection                                           | Page | Status | Repo mapping                                                             |
| ---------------------------------------------------- | ---- | ------ | ------------------------------------------------------------------------ |
| 5.1 Review of Probability and Random Variables       | 190  | ✅     | `probability.ts` + `sections/prob/` (5 sub-tabs)                         |
| 5.1.1–5.1.2 Sample space / conditional prob / Bayes  | 190  | ✅     | `BayesSection.tsx` — binary-channel posterior                            |
| 5.1.3 Random Variables (CDF/PDF, distributions, Q)   | 194  | ✅     | `RandomVariableSection.tsx` — distribution explorer + Q-function         |
| 5.1.4 Functions of a Random Variable                 | 201  | ✅     | `FunctionsSection.tsx` — Y=aX+b Gaussian map                             |
| 5.1.5 Multiple Random Variables (joint Gaussian / ρ) | 203  | ✅     | `JointGaussianSection.tsx`                                               |
| 5.1.6 Sums of Random Variables (LLN / CLT)           | 208  | ✅     | `CltSection.tsx`                                                         |
| 5.2 Random Processes: Basic Concepts                 | 209  | ✅     | `ProcessTab.tsx` (single/multiple sub-tabs)                              |
| 5.2.1 Statistical Averages                           | 212  | ✅     | `panels.tsx` `EnsemblePanel`                                             |
| 5.2.2 Wide-Sense Stationary Processes                | 215  | ✅     | `panels.tsx` `AutocorrPanel`                                             |
| 5.2.3 Multiple Random Processes (cross-correlation)  | 217  | ✅     | `process/CrossCorrSection.tsx`, `random.ts` `crossCorrelation`           |
| 5.2.4 Random Processes and Linear Systems            | 218  | ✅     | `panels.tsx` `FilterMagPanel`                                            |
| 5.2.5 Power Spectral Density (Wiener–Khinchin)       | 220  | ✅     | `panels.tsx` `PsdPanel`                                                  |
| 5.2.6 Power Spectral Density of a Sum Process        | 225  | ✅     | `process/CrossCorrSection.tsx` (sum-process R_Z / S_Z)                   |
| 5.3 Gaussian and White Processes                     | 226  | ✅     | `GaussianTab.tsx` (3 sub-tabs)                                           |
| 5.3.1 Gaussian Processes                             | 226  | ✅     | `gaussian/GaussianProcessSection.tsx` — σ²=∫S_X df                       |
| 5.3.2 White Processes                                | 228  | ✅     | `gaussian/WhiteNoiseSection.tsx`, `random.ts` `thermalNoisePsd`          |
| 5.3.3 Filtered Noise Processes (I/Q, B_neq)          | 230  | ✅     | `gaussian/FilteredNoiseSection.tsx`, `random.ts` `rcNoiseEquivBandwidth` |

> **Formula cards:** each subsection above also renders titled, §/Eq.-cited book-formula info
> cards below its plots (verified against this chapter) — e.g. Gaussian PDF (5.1.6), Q-function
> (5.1.7), mean/autocorrelation (5.2.1–5.2.2), cross-correlation (5.2.9/5.2.11), Wiener–Khinchin
> (5.2.15), power (5.2.18/5.2.21), LTI PSD (5.2.22/5.2.23), white & thermal noise (5.3.1–5.3.2),
> and noise-equivalent bandwidth (5.3.12/5.3.13).

---

### Chapter 6 — Effect of Noise on Analog Communication (pp. 255–295) ✅

**Module:** `src/modules/analog-noise/` (4 tabs) · **DSP:** `src/lib/dsp/analognoise.ts`,
`src/lib/dsp/linkbudget.ts` (§6.4, shared with wireless), reuses `analog.ts` (`amSignal`,
`envelopeDetect`, `emphasisSnrGainDb`, `preEmphasisMagDb`).

| Subsection                                       | Page | Status | Repo mapping                                         |
| ------------------------------------------------ | ---- | ------ | ---------------------------------------------------- |
| 6.1 Effect of Noise on AM Systems                | 255  | ✅     | `AmNoiseTab.tsx` (4 sub-tabs)                        |
| 6.1.1 Baseband System                            | 256  | ✅     | `am/BasebandSection.tsx`                             |
| 6.1.2 DSB-SC AM                                  | 256  | ✅     | `am/DsbScSection.tsx` (real coherent chain)          |
| 6.1.3 SSB AM                                     | 258  | ✅     | `am/SsbSection.tsx`                                  |
| 6.1.4 Conventional AM                            | 259  | ✅     | `am/ConventionalAmSection.tsx` (envelope+thr.)       |
| 6.2 Effect of Noise on Angle Modulation          | 263  | ✅     | `angle/NoisePsdSection.tsx` (FM/PM, `angleNoisePsd`) |
| 6.2.1 Threshold Effect                           | 271  | ✅     | `angle/ThresholdSection.tsx` (Fig 6.5 family)        |
| 6.2.2 Pre-emphasis and De-emphasis (FM)          | 274  | ✅     | `angle/EmphasisSection.tsx` (Eq. 6.2.42)             |
| 6.3 Comparison of Analog-Modulation Systems      | 277  | ✅     | `ComparisonSection.tsx` (curves + table)             |
| 6.4 Transmission Losses and Noise                | 278  | ✅     | `LinkBudgetTab.tsx` (4 sub-tabs), `linkbudget.ts`    |
| 6.4.1 Thermal Noise Sources                      | 279  | ✅     | `link/ThermalNoiseSection.tsx` (kTB)                 |
| 6.4.2 Effective Noise Temperature / Noise Figure | 280  | ✅     | `link/NoiseFigureSection.tsx` (Friis cascade)        |
| 6.4.3 Transmission Losses                        | 283  | ✅     | `link/PathLossSection.tsx` (path loss)               |
| 6.4.4 Repeaters for Signal Transmission          | 284  | ✅     | `link/RepeaterSection.tsx` (K-segment SNR)           |

---

### Chapter 7 — Analog-to-Digital Conversion (pp. 296–338) ✅

**Module:** `src/modules/sampling-quantization/` (single "Analog-to-Digital Conversion" module;
`AdcModule.tsx` is a 5-tab shell — Sampling · Quantization · Waveform Coding · Line Coding ·
Source & Media Coding — with the former standalone `deltamod` module absorbed as a Waveform
sub-tab) · **DSP:** `src/lib/dsp/sampling.ts`, `quantize.ts`, `lloydmax.ts`, `vq.ts`, `pcm.ts`,
`companding.ts`, `dpcm.ts`, `deltamod.ts`, `lpc.ts`, `sigmadelta.ts`, `tdm.ts`, `dct.ts`, `linecode.ts`

| Subsection                             | Page | Status | Repo mapping                                                              |
| -------------------------------------- | ---- | ------ | ------------------------------------------------------------------------- |
| 7.1 Sampling and Signal Reconstruction | 297  | ✅     | `sampling.ts`, `SamplingSection.tsx`                                      |
| 7.1.1 The Sampling Theorem             | 297  | ✅     | `sampling.ts` — Nyquist                                                   |
| 7.2 Quantization                       | 301  | ✅     | `quantize.ts`                                                             |
| 7.2.1 Scalar Quantization              | 302  | ✅     | `quantize.ts` SQNR; `lloydmax.ts` (Lloyd-Max), `ScalarQuantSection.tsx`   |
| 7.2.2 Vector Quantization              | 309  | ✅     | `vq.ts` (LBG/Voronoi), `VectorQuantSection.tsx`                           |
| 7.3 Encoding                           | 311  | ✅     | `pcm.ts` (NBC/Gray), `PcmSection.tsx`                                     |
| 7.4 Waveform Coding                    | 312  | ✅     | `pcm.ts`, `dpcm.ts`, `deltamod.ts`                                        |
| 7.4.1 PCM + companding                 | 313  | ✅     | `pcm.ts`, `companding.ts` (μ-law/A-law), `PcmSection.tsx`                 |
| 7.4.2 DPCM                             | 316  | ✅     | `dpcm.ts`, `DpcmSection.tsx`                                              |
| 7.4.3 Delta Modulation (+ ADM)         | 318  | ✅     | `deltamod.ts` (linear + adaptive), `DeltaModSection.tsx`                  |
| 7.5 Analysis-Synthesis (LPC)           | 321  | ✅     | `lpc.ts` (autocorr/Levinson, pitch, formants), `LpcSection.tsx`           |
| 7.6 Digital Audio Transmission         | 325  | ✅     | `sigmadelta.ts` (Σ-Δ), `tdm.ts` (DS hierarchy), `DigitalAudioSection.tsx` |
| 7.7 JPEG Image-Coding Standard         | 332  | ✅     | `dct.ts` (8×8 DCT, Table 7.5), `JpegSection.tsx`                          |
| 8.3 Baseband line coding (ADC tab)     | ~345 | ✅     | `linecode.ts` (NRZ/RZ/AMI/Manchester), `LineCodeSection.tsx`              |

---

### Chapter 8 — Digital Modulation Methods in an AWGN Channel (pp. 347–484) ✅

**Module:** `src/modules/modulation/` (7 tabs: Constellation & Detection · Optimum Receiver · DPSK ·
Noncoherent FSK · Multidim Signals · Repeaters · Synchronization) ·
**DSP:** `src/lib/dsp/modulation.ts`, `detector.ts`, `ser.ts`, `awgn.ts`, `gram-schmidt.ts`,
`matchedfilter.ts`, `carrierbasis.ts`, `dpsk.ts`, `pll.ts`, `timing.ts`, `repeater.ts`

| Subsection                                       | Page | Status | Repo mapping                                     |
| ------------------------------------------------ | ---- | ------ | ------------------------------------------------ |
| 8.1 Geometric Representation of Signal Waveforms | 348  | ✅     | `gram-schmidt.ts`, optrx + constellation         |
| 8.2.1 / 8.2.2 Binary Antipodal / Orthogonal      | 352  | ✅     | `modulation.ts` — `bpsk` / `bfsk`                |
| 8.3.1 Correlation-Type Demodulator               | 362  | ✅     | `OptimumReceiverSection`, `model.ts`             |
| 8.3.2 Matched-Filter Demodulator                 | 371  | ✅     | `matchedfilter.ts`                               |
| 8.3.3 Performance of Optimum Detector (binary)   | 379  | ✅     | `ser.ts`, `peakSnr`                              |
| 8.4.1 Optimum Receiver for M-ary                 | 384  | ✅     | `detector.ts` — ML/MAP                           |
| 8.4.2 Union Bound                                | 396  | ✅     | `ser.ts` `unionBoundSer`; Multidim-tab overlay   |
| 8.5.1–8.5.3 M-ary PAM / ASK + Pe                 | 398  | ✅     | `modulation.ts` `mask`, `carrierbasis`, `ser.ts` |
| 8.6.1–8.6.3 PSK geo / demod / coherent Pe        | 406  | ✅     | `modulation.ts` `mpsk`, `ser.ts`                 |
| 8.6.4 Differential Encoding & DPSK               | 416  | ✅     | `dpsk.ts`, `DpskSection` (NEW)                   |
| 8.6.5 Probability of Error for DPSK              | 418  | ✅     | `dpsk.ts` — `½e^{-Eb/N0}` + Eq.8.6.37 integral   |
| 8.7.1–8.7.3 QAM geo / demod / Pe                 | 419  | ✅     | `modulation.ts` `mqam`, `ser.ts`                 |
| 8.8.1 Carrier-Phase Estimation — PLL             | 429  | ✅     | `pll.ts`, `SyncSection` (Carrier Phase)          |
| 8.8.2 Costas Loop                                | 437  | 🔶     | `SyncSection` InfoCard                           |
| 8.8.3–8.8.5 Carrier-phase est. PAM / PSK / QAM   | 439  | 🔶     | `pll.ts` `mlPhaseEstimate`; InfoCards            |
| 8.9.1 Early–Late Gate Synchronizer               | 447  | ✅     | `timing.ts`, `SyncSection` (Symbol Timing)       |
| 8.9.3 / 8.9.4 ML timing / Spectral-line          | 451  | 🔶     | `SyncSection` InfoCards + TheoryBox              |
| 8.10 Regenerative Repeaters                      | 456  | ✅     | `repeater.ts`, `RepeaterSection` (NEW)           |

> **Rule:** Theoretical `P_s`/`P_b` curves and decision regions must be fully consistent with
> §8.3–8.7 (including Gray coding, `E_b/N_0` axis). DPSK `½e^{-Eb/N0}` (Eq. 8.6.42),
> regenerative-vs-analog reproduces Example 8.10.1 (11.3 vs 29.6 dB).

---

### Chapter 9 — Multidimensional Digital Modulation (pp. 485–542) ✅

**Module:** `src/modules/modulation/` (Multidim Signals + Noncoherent FSK tabs); CPFSK lives in
`src/modules/wireless/` · **DSP:** `src/lib/dsp/multidim.ts`, `noncoherent.ts`, `ser.ts`
(`unionBoundSer`), `carrierbasis.ts` (`fskBasis`), `cpm.ts` (wireless)

| Subsection                                        | Page | Status | Repo mapping                                      |
| ------------------------------------------------- | ---- | ------ | ------------------------------------------------- |
| 9.1.1 M-ary Orthogonal — Pe                       | 488  | ✅     | `multidim.ts` `orthogonalPe`; `mfsk` bank         |
| 9.1.2 Union Bound on Orthogonal                   | 491  | ✅     | `multidim.ts`; Multidim-tab overlay (NEW)         |
| 9.2 Biorthogonal Signals + Pe                     | 492  | ✅     | `multidim.ts` `biorthogonalSet` (NEW)             |
| 9.3 Simplex Signals + Pe                          | 497  | ✅     | `multidim.ts` `simplexPe`, `simplexGainDb` (NEW)  |
| 9.4 Binary-Coded Signals + Pe                     | 499  | 🔶     | deferred to Channel Coding module (Ch 13)         |
| 9.5.1 Demodulation of M-ary FSK (coherent)        | 503  | ✅     | `carrierbasis.ts` `fskBasis`, correlator bank     |
| 9.5.2 Optimum Detector for Noncoherent Binary FSK | 507  | ✅     | `noncoherent.ts` `squareLawDecide` (NEW)          |
| 9.5.3 Pe for Noncoherent M-ary FSK                | 510  | ✅     | `noncoherent.ts` Eq.9.5.40 / `½e^{-Eb/2N0}` (NEW) |
| 9.6.1 Continuous-Phase FSK (CPFSK)                | 513  | ✅     | `cpm.ts` — CPFSK simulation (wireless)            |
| 9.6.2 Spectral Characteristics of CPFSK           | 524  | 🔶     | `wireless/sections/CpmSection.tsx`                |

> **Note:** §9.4 binary-coded signals — the book defers their performance to Ch 13; covered by the
> Channel Coding module. §9.6 CPFSK is implemented in the Wireless module (cross-linked, not duplicated).

---

### Chapter 10 — Digital Transmission through Bandlimited Channels (pp. 543–620) ✅

**Module:** `src/modules/baseband/` (7 tabs) · **DSP:** `src/lib/dsp/pulse.ts`, `eye.ts`,
`equalizer.ts`, `matchedfilter.ts`, `psd.ts`, `partialresponse.ts`, `channeldistortion.ts`

| Subsection                                        | Page | Status | Repo mapping                                                    |
| ------------------------------------------------- | ---- | ------ | --------------------------------------------------------------- |
| 10.1 Characterization of Bandlimited Channels     | 543  | ✅     | `BasebandModule.tsx`                                            |
| 10.1.1 Intersymbol Interference (ISI)             | 547  | ✅     | `eye.ts` — eye diagram                                          |
| 10.1.2 Digital Transmission — Bandpass            | 549  | 🔶     | Partial (matched filter; no constellation explorer)             |
| 10.2 Power Spectrum of Digitally Mod. Signals     | 552  | ✅     | `psd.ts` — Power Spectrum tab (`pamPsd`/`symbolPsd`)            |
| 10.3 Signal Design for Bandlimited Channels       | 556  | ✅     | `pulse.ts` — pulse shaping                                      |
| 10.3.1 Nyquist Criterion, Zero ISI, Raised Cosine | 558  | ✅     | `pulse.ts` — raised cosine                                      |
| 10.3.2 Controlled ISI — Partial Response          | 564  | ✅     | `partialresponse.ts` — Partial Response tab (duo/mod-duo)       |
| 10.4 Detection of Partial-Response Signals        | 566  | ✅     | `partialresponse.ts` — PR Detection tab                         |
| 10.4.1 Symbol-by-Symbol Detection + Precoding     | 567  | ✅     | `precode`, `symbolBySymbolDetect`, error-propagation demo       |
| 10.4.2 Error Probability (Symbol-by-Symbol)       | 570  | ✅     | `prBerCurves` — ≈2.1 dB penalty                                 |
| 10.4.3 ML Sequence Detection (PR trellis)         | 573  | ✅     | `viterbiPR` — 2-state Viterbi survivor                          |
| 10.4.4 Error Probability of MLSD                  | 576  | ✅     | `prBerCurves` — ≈0.34 dB penalty (Eq. 10.4.41)                  |
| 10.5 System Design — Channel Distortion           | 577  | ✅     | `channeldistortion.ts` — Channel Distortion tab; `equalizer.ts` |
| 10.5.1 Transmitting/Receiving Filter Design       | 578  | ✅     | `channeldistortion.ts` `designFilters` (Eq. 10.5.1)             |
| 10.5.2 Channel Equalization                       | 582  | ✅     | `equalizer.ts`, `EyeEqualizationSection.tsx`                    |

---

### Chapter 11 — Multicarrier Modulation and OFDM (pp. 621–641) ✅

**Module:** `src/modules/wireless/` · **DSP:** `src/lib/dsp/ofdm.ts`

| Subsection                                      | Page | Status | Repo mapping                  |
| ----------------------------------------------- | ---- | ------ | ----------------------------- |
| 11.1 Orthogonal Frequency-Division Multiplexing | 621  | ✅     | `ofdm.ts`, `OfdmSection.tsx`  |
| 11.2 Modulation and Demodulation in OFDM        | 622  | ✅     | `ofdm.ts`                     |
| 11.3 OFDM via FFT Algorithm                     | 626  | ✅     | `ofdm.ts` — FFT-based         |
| 11.4 Spectral Characteristics of OFDM           | 629  | ✅     | `OfdmSection.tsx`             |
| 11.5 Peak-to-Average Power Ratio (PAPR)         | 631  | ⬜     | —                             |
| 11.6 Applications of OFDM                       | 633  | ⬜     | Informational (no simulation) |

---

### Chapter 12 — An Introduction to Information Theory (pp. 642–688) ✅

**Module:** `src/modules/infotheory/` · **DSP:** `src/lib/dsp/entropy.ts`, `huffman.ts`, `lz78.ts`, `capacity.ts`

| Subsection                              | Page | Status | Repo mapping                                 |
| --------------------------------------- | ---- | ------ | -------------------------------------------- |
| 12.1 Modeling Information Sources       | 642  | ✅     | `entropy.ts`, `EntropySection.tsx`           |
| 12.1.1 Measure of Information / Entropy | 644  | ✅     | `entropy.ts`                                 |
| 12.1.2 Joint and Conditional Entropy    | 647  | ✅     | `entropy.ts`                                 |
| 12.1.3 Mutual Information               | 650  | ⬜     | —                                            |
| 12.1.4 Differential Entropy             | 650  | ⬜     | —                                            |
| 12.2 Source Coding Theorem              | 652  | ✅     | `PrefixKraftSection.tsx`                     |
| 12.3.1 Huffman Algorithm                | 655  | ✅     | `huffman.ts`, `HuffmanSection.tsx`           |
| 12.3.2 Lempel-Ziv Algorithm             | 659  | ✅     | `lz78.ts`, `LempelZivSection.tsx`            |
| 12.4 Modeling of Communication Channels | 661  | 🔶     | `capacity.ts` (channel model, partial)       |
| 12.5 Channel Capacity                   | 664  | ✅     | `capacity.ts`, `ChannelsCapacitySection.tsx` |
| 12.5.1 Gaussian Channel Capacity        | 669  | ✅     | `capacity.ts` — Shannon                      |
| 12.6 Bounds on Communication            | 671  | ✅     | `ShannonLimitSection.tsx`                    |

---

### Chapter 13 — Coding for Reliable Communications (pp. 689–768) ✅

**Module:** `src/modules/channel-coding/` · **DSP:** `src/lib/dsp/blockcodes.ts`, `convcodes.ts`, `cyclic.ts`, `bch.ts`, `reedsolomon.ts`, `gf2m.ts`, `codes.ts`, `concatenated.ts`, `codingcompare.ts`

| Subsection                                     | Page | Status | Repo mapping                                    |
| ---------------------------------------------- | ---- | ------ | ----------------------------------------------- |
| 13.1 The Promise of Coding                     | 689  | ✅     | `ShannonLimitSection.tsx`                       |
| 13.2 Linear Block Codes                        | 694  | ✅     | `blockcodes.ts`, `BlockCodesSection.tsx`        |
| 13.2.1 Decoding / Performance of LBC           | 700  | ✅     | `blockcodes.ts` — syndrome decoding             |
| 13.2.2 Some Important Linear Block Codes       | 707  | ✅     | `blockcodes.ts` — Hamming etc.                  |
| 13.2.3 Error Detection vs. Error Correction    | 708  | 🔶     | Partial in `BlockCodesSection.tsx`              |
| 13.2.4 Burst-Error-Correcting Codes            | 709  | ⬜     | —                                               |
| 13.3 Convolutional Codes                       | 711  | ✅     | `convcodes.ts`, `ConvCodesSection.tsx`          |
| 13.3.1 Basic Properties                        | 712  | ✅     | `convcodes.ts`                                  |
| 13.3.2 ML Decoding — Viterbi Algorithm         | 717  | ✅     | `convcodes.ts` — Viterbi                        |
| 13.3.3 Other Decoding Algorithms               | 722  | ⬜     | —                                               |
| 13.3.4 Bounds on Error Probability             | 722  | 🔶     | `ConvCodesSection.tsx`                          |
| 13.4 Good Codes — Combination of Simple Codes  | 725  | ✅     | `concatenated.ts`, `ConcatenatedSection.tsx`    |
| 13.4.1 Product Codes                           | 727  | ⬜     | —                                               |
| 13.4.2 Concatenated Codes                      | 728  | ✅     | `concatenated.ts`                               |
| 13.5 Turbo Codes and Iterative Decoding        | 728  | ⬜     | —                                               |
| 13.6 Low-Density Parity-Check (LDPC) Codes     | 741  | ⬜     | —                                               |
| 13.7 Coding for Bandwidth-Constrained Channels | 747  | ⬜     | —                                               |
| 13.7.2 Trellis-Coded Modulation                | 749  | ⬜     | —                                               |
| **Extra:** Cyclic Codes                        | —    | ✅     | `cyclic.ts`, `CyclicCodesSection.tsx`           |
| **Extra:** BCH Codes                           | —    | ✅     | `bch.ts`, `gf2m.ts`, `GfBchSection.tsx`         |
| **Extra:** Reed-Solomon Codes                  | —    | ✅     | `reedsolomon.ts`, `ReedSolomonSection.tsx`      |
| **Extra:** Codes vs Shannon Comparison         | —    | ✅     | `codingcompare.ts`, `CodesVsShannonSection.tsx` |

> Note: Cyclic, BCH, and Reed-Solomon codes do not appear as separate chapters in the book,
> but align with §13.2.2 "Some Important Linear Block Codes" and forward references.
> Implemented as separate detailed sections in the repo.

---

### Chapter 14 — Data Transmission in Fading Multipath Channels (pp. 769–824) ✅

**Module:** `src/modules/wireless/` · **DSP:** `src/lib/dsp/fading.ts`, `doppler.ts`, `diversity.ts`, `rake.ts`, `mimo.ts`, `shadowing.ts`, `linkbudget.ts`

| Subsection                                          | Page | Status | Repo mapping                             |
| --------------------------------------------------- | ---- | ------ | ---------------------------------------- |
| 14.1 Characterization of Physical Wireless Channels | 769  | ✅     | `fading.ts`, `FadingChannelSection.tsx`  |
| 14.2 Channel Models for Time-Variant Multipath      | 771  | ✅     | `fading.ts` — Rayleigh/Rician            |
| 14.2.1 Frequency Nonselective Fading                | 774  | ✅     | `fading.ts` — flat fading                |
| 14.2.2 Frequency Selective Fading                   | 777  | ✅     | `fading.ts`                              |
| 14.2.3 Models for the Doppler Power Spectrum        | 778  | ✅     | `doppler.ts`, `DopplerSection.tsx`       |
| 14.2.4 Propagation Models for Mobile Radio          | 781  | 🔶     | `shadowing.ts` — log-normal              |
| 14.3 Performance of Binary Mod. in Rayleigh Fading  | 783  | ✅     | `RayleighBerSection.tsx`                 |
| 14.3.1 Prob. of Error — Freq. Nonselective          | 783  | ✅     | BER curve                                |
| 14.3.2 Signal Diversity                             | 786  | ✅     | `diversity.ts`                           |
| 14.3.3 RAKE Demodulator                             | 792  | ✅     | `rake.ts`, `RakeSection.tsx`             |
| 14.3.4 OFDM in Frequency Selective Channels         | 794  | 🔶     | `OfdmSection.tsx` (partial)              |
| 14.4 Multiple Antenna Systems (MIMO)                | 795  | ✅     | `mimo.ts`, `MimoSection.tsx`             |
| 14.4.1 Channel Models for MIMO                      | 796  | ✅     | `mimo.ts`                                |
| 14.4.2 Signal Transmission in MIMO                  | 797  | ✅     | `mimo.ts`                                |
| 14.4.3 Detection in MIMO                            | 799  | ✅     | `mimo.ts`                                |
| 14.4.4 Error Rate Performance                       | 800  | 🔶     | `MimoSection.tsx`                        |
| 14.4.5 Space-Time Codes                             | 802  | ⬜     | —                                        |
| 14.5 Link Budget Analysis for Radio Channels        | 810  | ✅     | `linkbudget.ts`, `LinkBudgetSection.tsx` |

---

### Chapter 15 — Spread-Spectrum Communication Systems (pp. 825–876) ✅

**Module:** `src/modules/wireless/` · **DSP:** `src/lib/dsp/spread.ts`, `cdma.ts`, `fhss.ts`

| Subsection                                    | Page | Status | Repo mapping                             |
| --------------------------------------------- | ---- | ------ | ---------------------------------------- |
| 15.1 Model of SS Digital Comm. System         | 826  | ✅     | `spread.ts`                              |
| 15.2 DS Spread-Spectrum Systems               | 827  | ✅     | `spread.ts`, `SpreadSpectrumSection.tsx` |
| 15.2.1 Despreading on Narrowband Interference | 830  | ✅     | `SpreadSpectrumSection.tsx`              |
| 15.2.2 Probability of Error at the Detector   | 831  | 🔶     | Partial                                  |
| 15.3 Applications of DS SS                    | 836  | 🔶     | CDMA section exists                      |
| 15.3.2 CDMA                                   | 837  | ✅     | `cdma.ts`, `CdmaSection.tsx`             |
| 15.3.3 Communication over Multipath Channels  | 838  | 🔶     | Linked to RAKE                           |
| 15.4 Generation of PN Sequences               | 840  | ⬜     | —                                        |
| 15.5 Frequency-Hopped Spread Spectrum         | 843  | ✅     | `fhss.ts`, `FhssSection.tsx`             |
| 15.5.1 Slow FH and Partial-Band Interference  | 844  | ✅     | `fhss.ts`                                |
| 15.5.2 Fast Frequency Hopping                 | 847  | 🔶     | `fhss.ts` (partial)                      |
| 15.6 Synchronization of SS Systems            | 849  | ⬜     | —                                        |
| 15.7 Digital Cellular Communication Systems   | 856  | ⬜     | Informational                            |

---

## Summary statistics

| Status      | Chapter count (main) | Description                                    |
| ----------- | -------------------- | ---------------------------------------------- |
| ✅ Complete | 13 / 15              | Chapters 2–8, 10–15                            |
| 🔶 Partial  | 1 / 15               | Chapter 9 (CPFSK exists, rest missing)         |
| ⬜ None     | 1 / 15               | Chapter 1 (introduction, no simulation needed) |

> Subsection breakdown: of ~99 subsections, **~73 ✅**, **~11 🔶**, **~15 ⬜**.

---

## Usage

When adding a new simulation or formula: find the chapter from the table above →
read the relevant page with `pdftotext -f <pdf_page> -l <pdf_page> refs/Book.pdf -` →
verify the formula/range → add a chapter reference as a comment in code (e.g. `// Proakis §8.6.3`).
