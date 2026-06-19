# Book.pdf — Reference Map (module ↔ chapter/page)

**Source:** Proakis & Salehi, *Fundamentals of Communication Systems* (2nd ed.), 886 pp —
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

| Ch | Title | Page | Status | Platform relevance |
|----|-------|-------|--------|-------------------|
| 1 | Introduction | 1 | ⬜ | General system model, channel models |
| 2 | Signals and Linear Systems | 21 | ✅ | Fourier, spectrum, convolution, filter design, Hilbert, bandpass/I-Q |
| 3 | Amplitude Modulation | 117 | ✅ | AM (DSB-SC, SSB, VSB), demodulation |
| 4 | Angle Modulation | 161 | ✅ | FM/PM signals, spectrum |
| 5 | Probability and Random Processes | 190 | ✅ | Noise, AWGN, PSD, Gaussian processes |
| 6 | Effect of Noise on Analog Communication | 255 | ✅ | SNR analysis, threshold effect, pre-emphasis |
| 7 | Analog-to-Digital Conversion | 296 | ✅ | Sampling, quantization, PCM, Delta Mod. |
| 8 | Digital Modulation in AWGN Channel | ~340 | ✅ | Modulation & detection, SER/BER |
| 9 | Noncoherent Modulation / Memory | ~470 | 🔶 | DPSK, noncoherent FSK, CPFSK |
| 10 | Digital Transmission — Bandlimited Channels | 543 | ✅ | Baseband, Nyquist, ISI, eye diagram |
| 11 | Multicarrier Modulation and OFDM | 621 | ✅ | OFDM modulation/demodulation |
| 12 | An Introduction to Information Theory | 642 | ✅ | Entropy, Huffman, Lempel-Ziv, capacity |
| 13 | Coding for Reliable Communications | 689 | ✅ | Block codes, convolutional, BCH, RS, concatenated |
| 14 | Data Transmission in Fading Multipath Channels | 769 | ✅ | Rayleigh, Doppler, RAKE, MIMO, link budget |
| 15 | Spread-Spectrum Communication Systems | 825 | ✅ | DS-SS, CDMA, FHSS |

---

## Chapter details and repo mapping

---

### Chapter 1 — Introduction (pp. 1–20) ⬜

| Subsection | Page | Status | Repo mapping |
|------------|------|--------|--------------|
| 1.1 Historical Review | 4 | ⬜ | — |
| 1.2 Elements of an Electrical Communication System | 7 | ⬜ | General model (inspiration for end-to-end) |
| 1.3 Communication Channels and Their Characteristics | 12 | ⬜ | — |
| 1.4 Mathematical Models for Communication Channels | 18 | ⬜ | — |

> Introduction chapter; no direct simulation module, background knowledge only.

---

### Chapter 2 — Signals and Linear Systems (pp. 21–116) ✅

**Module:** `src/modules/fourier/` (6 tabs: Basic Signals · Convolution · Fourier Series ·
Fourier Transform & Spectra · Filters · Bandpass Signals) · **DSP:** `src/lib/dsp/fourier.ts`,
`fft.ts`, `signals.ts`, `spectrum.ts`, `window.ts`, `bandwidth.ts`, `ftpairs.ts`,
`analogfilters.ts` · module helpers `filterStudio.ts`, `model.ts`

| Subsection | Page | Status | Repo mapping |
|------------|------|--------|--------------|
| 2.1 Basic Concepts (signals, systems) | 21 | ✅ | `signals.ts`, `model.ts` — Basic Signals tab + Convolution (LTI) tab |
| 2.2 Fourier Series | 43 | ✅ | `fourier.ts` — Fourier series; Fourier Series tab (partial-sum synthesis) |
| 2.3 Fourier Transform | 58 | ✅ | `fourier.ts`, `fft.ts`, `ftpairs.ts` — FFT spectra + FT pairs/properties |
| 2.4 Filter Design | 85 | ✅ | `window.ts`, `analogfilters.ts`, `filterStudio.ts` — Filters tab (LTI · Realizable Butterworth/Chebyshev · Filter Studio with audio bypass) |
| 2.5 Power and Energy | 89 | ✅ | `spectrum.ts` — PSD computation; Fourier Transform tab theory cards (autocorrelation, energy spectral density `W_x(f)=\|X(f)\|²`, PSD / Wiener-Khinchin, LTI spectral I/O); periodic-signal line PSD in Fourier Series tab |
| 2.6 Hilbert Transform | 95 | ✅ | `fourier.ts` `hilbert()`; Bandpass Signals tab → Hilbert Transform sub-tab |
| 2.7 Lowpass and Bandpass Signals | 98 | ✅ | `bandwidth.ts`, `ftpairs.ts`; Bandpass Signals tab → Lowpass & Bandpass + I/Q Representation sub-tabs |

---

### Chapter 3 — Amplitude Modulation (pp. 117–160) ✅

**Module:** `src/modules/analog-am/` (4 tabs) · **DSP:** `src/lib/dsp/analog.ts`, `src/lib/dsp/am-impl.ts`

| Subsection | Page | Status | Repo mapping |
|------------|------|--------|--------------|
| 3.1 Introduction to Modulation | 118 | ✅ | AM Schemes tab intro/TheoryBox |
| 3.2.1 DSB-SC AM | 119 | ✅ | `analog.ts` — DSB-SC; AM Schemes tab |
| 3.2.2 Conventional AM | 126 | ✅ | `analog.ts` — conventional AM + power/efficiency |
| 3.2.3 SSB AM | 132 | ✅ | `analog.ts` — SSB (USB/LSB) |
| 3.2.4 VSB AM | 134 | ✅ | `analog.ts` `vsbFilter` (complementary vestige) + AM Schemes tab |
| 3.3 Modulators and Demodulators | 137 | ✅ | `am-impl.ts` (power-law/switching/balanced/ring + envelope) + Mod & Demod tab (block diagram + animated circuit + dirty/clean FFT) |
| 3.4.1 Frequency-Division Multiplexing (FDM) | 144 | ✅ | `am-impl.ts` `fdmCompose`/`fdmSeparate` + Signal Multiplexing tab → FDM sub-tab (channel stacking and overlap) |
| 3.4.2 Quadrature-Carrier Multiplexing (QAM) | 145 | ✅ | `am-impl.ts` `qamModulate`/`qamDemod` + Signal Multiplexing tab → QAM sub-tab (I/Q channels, RX phase-error crosstalk readout, formula cards Eq. 3.4.1–3.4.2) |
| 3.5 AM Radio Broadcasting | 146 | ✅ | AM Radio tab (superheterodyne frequency plan + image) |

---

### Chapter 4 — Angle Modulation (pp. 161–189) ✅

**Module:** `src/modules/analog-fm/` (4 tabs: Representation · Spectrum · Modulators & Demodulators · FM Radio Broadcasting) ·
**DSP:** `src/lib/dsp/analog.ts` · **Sections:** `src/modules/analog-fm/sections/`

| Subsection | Page | Status | Repo mapping |
|------------|------|--------|--------------|
| 4.1 Representation of FM and PM Signals | 161 | ✅ | `analog.ts` `fmModulate`/`pmModulate`; `RepresentationSection.tsx` — message m(t), angle-modulated signal u(t), instantaneous freq/phase (FM/PM toggle, NBFM overlay) |
| 4.2 Spectral Characteristics of Angle-Mod. Signals | 166 | ✅ | `analog.ts` `besselJ`/`fmBessel`; `SpectrumSection.tsx` — Bessel line spectrum (tone), FFT spectrum (arbitrary msg), Carson bandwidth shading, Bessel curves J₀..J₇ vs β |
| 4.3.1 FM Modulator Implementations | 171 | ✅ | `ModDemodSection.tsx` — Direct FM (VCO/varactor) and Armstrong indirect FM block diagrams (`FmModDemodDiagram.tsx`) |
| 4.3.2 FM Demodulator / Discriminator | 175 | ✅ | `analog.ts` `fmDiscriminate`; `ModDemodSection.tsx` — discriminator sub-tab (differentiate → envelope → LPF) with AWGN noise toggle; block diagram in `FmDiscriminatorDiagram`; varactor-VCO and Armstrong multiplier formula cards |
| 4.3.3 PLL FM Demodulator | 177 | ✅ | `analog.ts` `fmPllDemodulate`; `ModDemodSection.tsx` — PLL sub-tab (2nd-order loop, B_n / ζ controls, linearized phase-error + transfer-function cards Eq. 4.3.21–4.3.28); `FmPllDiagram` |
| 4.4.1 Superheterodyne FM Receiver | 179 | ✅ | `RadioSection.tsx` `SuperHetSubTab` — interactive block diagram, RF/LO/IF freq readouts (88–108 MHz band, f_IF = 10.7 MHz) |
| 4.4.2 FM Stereo Multiplexing | 182 | ✅ | `analog.ts` `stereoMuxSpectrum`; `RadioSection.tsx` `StereoSubTab` — composite baseband spectrum (L+R / pilot / L−R DSB-SC), balance slider |
| 4.4.3 Pre-emphasis and De-emphasis | 185 | ✅ | `analog.ts` `preEmphasisMagDb`/`deEmphasisMagDb`/`emphasisSnrGainDb`; `RadioSection.tsx` `PreEmphSubTab` — H_pe/H_de frequency response, SNR gain readout (τ = 75 µs standard) |

---

### Chapter 5 — Probability and Random Processes (pp. 190–254) ✅

**Module:** `src/modules/random-process/` · **DSP:** `src/lib/dsp/random.ts`, `awgn.ts`

| Subsection | Page | Status | Repo mapping |
|------------|------|--------|--------------|
| 5.1 Review of Probability and Random Variables | 190 | 🔶 | `random.ts` — distribution generation |
| 5.2 Random Processes: Basic Concepts | 209 | ✅ | `random.ts`, `RandomProcessModule` |
| 5.2.1 Statistical Averages | 212 | ✅ | `EnsembleSection.tsx` |
| 5.2.2 Wide-Sense Stationary Processes | 215 | ✅ | `AutocorrSection.tsx` |
| 5.2.4 Random Processes and Linear Systems | 218 | ✅ | `FilterSection.tsx` |
| 5.2.5 Power Spectral Density | 220 | ✅ | `PsdSection.tsx` |
| 5.3 Gaussian and White Processes | 226 | ✅ | `awgn.ts` — AWGN generator |
| 5.3.2 White Processes | 228 | ✅ | `awgn.ts` |
| 5.3.3 Filtered Noise Processes | 230 | ✅ | `FilterSection.tsx` |

---

### Chapter 6 — Effect of Noise on Analog Communication (pp. 255–295) ✅

**Module:** `src/modules/analog-noise/` · **DSP:** `src/lib/dsp/analognoise.ts`

| Subsection | Page | Status | Repo mapping |
|------------|------|--------|--------------|
| 6.1 Effect of Noise on AM Systems | 255 | ✅ | `DemodOutputSection.tsx`, `analognoise.ts` |
| 6.1.1 Baseband System | 256 | ✅ | Basic SNR analysis |
| 6.1.2 DSB-SC AM | 256 | ✅ | `analognoise.ts` |
| 6.1.3 SSB AM | 258 | ✅ | `analognoise.ts` |
| 6.1.4 Conventional AM | 259 | ✅ | `analognoise.ts` |
| 6.2 Effect of Noise on Angle Modulation | 263 | ✅ | `ThresholdEmphasisSection.tsx` |
| 6.2.1 Threshold Effect | 271 | ✅ | `ThresholdEmphasisSection.tsx` |
| 6.2.2 Pre-emphasis and De-emphasis (FM) | 274 | ✅ | `ThresholdEmphasisSection.tsx` |
| 6.3 Comparison of Analog-Modulation Systems | 277 | ✅ | `ComparisonSection.tsx` |
| 6.4 Transmission Losses and Noise | 278 | ⬜ | — |
| 6.4.1 Thermal Noise Sources | 279 | ⬜ | — |
| 6.4.2 Effective Noise Temperature / Noise Figure | 280 | ⬜ | — |

---

### Chapter 7 — Analog-to-Digital Conversion (pp. 296–338) ✅

**Module:** `src/modules/sampling-quantization/` (single "Analog-to-Digital Conversion" module;
`AdcModule.tsx` wraps the Sampling & Quantization view and the Delta Modulation view —
`src/modules/deltamod/` — as two tabs) · **DSP:** `src/lib/dsp/sampling.ts`, `quantize.ts`, `pcm.ts`, `deltamod.ts`

| Subsection | Page | Status | Repo mapping |
|------------|------|--------|--------------|
| 7.1 Sampling and Signal Reconstruction | 297 | ✅ | `sampling.ts`, `SamplingModule.tsx` |
| 7.1.1 The Sampling Theorem | 297 | ✅ | `sampling.ts` — Nyquist |
| 7.2 Quantization | 301 | ✅ | `quantize.ts` |
| 7.2.1 Scalar Quantization | 302 | ✅ | `quantize.ts` — SQNR |
| 7.2.2 Vector Quantization | 309 | ⬜ | — |
| 7.3 Encoding | 311 | 🔶 | `pcm.ts` (PCM encoding, partial) |
| 7.4 Waveform Coding | 312 | ✅ | `pcm.ts`, `deltamod.ts` |
| 7.4.1 PCM | 313 | ✅ | `pcm.ts` — SQNR ≈ 6.02n+1.76 dB |
| 7.4.2 DPCM | 316 | ⬜ | — |
| 7.4.3 Delta Modulation | 318 | ✅ | `deltamod.ts`, `DeltaModModule.tsx` |
| 7.5 Analysis-Synthesis Techniques | 321 | ⬜ | — |
| 7.6 Digital Audio Transmission | 325 | ⬜ | — |
| 7.7 JPEG Image-Coding Standard | 332 | ⬜ | — |

---

### Chapter 8 — Digital Modulation in AWGN Channel (pp. ~340–470) ✅

**Module:** `src/modules/modulation/` · **DSP:** `src/lib/dsp/modulation.ts`, `detector.ts`, `ser.ts`, `awgn.ts`, `gram-schmidt.ts`, `matchedfilter.ts`, `carrierbasis.ts`

| Subsection | Page | Status | Repo mapping |
|------------|------|--------|--------------|
| 8.1 Geometric Representation of Signals | ~341 | ✅ | `gram-schmidt.ts`, constellation |
| 8.2 PAM | ~345 | ✅ | `modulation.ts` — M-PAM |
| 8.3 2-D Signals: PSK & QAM | ~350 | ✅ | `modulation.ts` — PSK, QAM |
| 8.4 Multidimensional / Orthogonal (FSK) | ~360 | ✅ | `modulation.ts` — M-FSK |
| 8.5 Optimum Receiver | ~369 | ✅ | `OptimumReceiverSection.tsx` |
| 8.5.1 Correlation Demodulator | ~369 | ✅ | `detector.ts` |
| 8.5.2 Matched Filter | ~375 | ✅ | `matchedfilter.ts` |
| 8.5.3 Optimum Detector (ML/MAP) | ~381 | ✅ | `detector.ts` — ML/MAP |
| 8.6 Probability of Error | ~404 | ✅ | `ser.ts` |
| 8.6.2 M-ary PAM | ~408 | ✅ | `ser.ts` — PAM SER |
| 8.6.3 Coherent PSK | ~413 | ✅ | `ser.ts` — PSK SER |
| 8.6.5 QAM | ~418 | ✅ | `ser.ts` — QAM SER |
| 8.6.6 M-ary Orthogonal | ~423 | ✅ | `ser.ts` — FSK SER |
| 8.6.10 Modulation Comparison | ~432 | ✅ | `ModulationModule.tsx` comparison |
| 8.7 Performance Analysis / Link Budget | ~436 | 🔶 | `linkbudget.ts` (in wireless module) |

> **Rule:** Theoretical `P_s`/`P_b` curves and decision regions must be fully consistent with
> §8.5–8.6 (including Gray coding, `E_b/N_0` axis).

---

### Chapter 9 — Noncoherent Modulation & Systems with Memory (pp. ~470–540) 🔶

**Module:** `src/modules/wireless/` (partial) · **DSP:** `src/lib/dsp/cpm.ts`

| Subsection | Page | Status | Repo mapping |
|------------|------|--------|--------------|
| 9.1 Carrier Phase Estimation | ~470 | ⬜ | — |
| 9.2 Carrier Recovery for Suppressed-Carrier | ~475 | ⬜ | — |
| 9.3 Symbol Timing Estimation | ~485 | ⬜ | — |
| 9.4 DPSK | ~495 | ⬜ | — |
| 9.5 Noncoherent Detection | ~504 | ⬜ | — |
| 9.5.1 Noncoherent Binary FSK Receiver | ~505 | ⬜ | — |
| 9.5.2 Optimum Detector for Noncoherent Binary FSK | ~507 | ⬜ | — |
| 9.5.3 Prob. of Error for M-ary FSK (noncoherent) | ~510 | ⬜ | — |
| 9.6 Modulation Systems with Memory | ~513 | 🔶 | `cpm.ts`, `CpmSection.tsx` |
| 9.6.1 Continuous-Phase FSK (CPFSK) | ~513 | ✅ | `cpm.ts` — CPFSK simulation |
| 9.6.2 Spectral Characteristics of CPFSK | ~524 | 🔶 | `CpmSection.tsx` |
| 9.7 Comparison of Modulation Methods | ~525 | ⬜ | — |

---

### Chapter 10 — Digital Transmission through Bandlimited Channels (pp. 543–620) ✅

**Module:** `src/modules/baseband/` · **DSP:** `src/lib/dsp/pulse.ts`, `eye.ts`, `equalizer.ts`

| Subsection | Page | Status | Repo mapping |
|------------|------|--------|--------------|
| 10.1 Characterization of Bandlimited Channels | 543 | ✅ | `BasebandModule.tsx` |
| 10.1.1 Intersymbol Interference (ISI) | 547 | ✅ | `eye.ts` — eye diagram |
| 10.1.2 Digital Transmission — Bandpass | 549 | 🔶 | Partial |
| 10.2 Power Spectrum of Digitally Mod. Signals | 552 | ⬜ | — |
| 10.3 Signal Design for Bandlimited Channels | 556 | ✅ | `pulse.ts` — pulse shaping |
| 10.3.1 Nyquist Criterion, Zero ISI, Raised Cosine | 558 | ✅ | `pulse.ts` — raised cosine |
| 10.3.2 Controlled ISI — Partial Response | 564 | ⬜ | — |
| 10.4 Detection of Partial-Response Signals | 566 | ⬜ | — |
| 10.5 System Design — Channel Distortion | 577 | 🔶 | `equalizer.ts` |
| 10.5.1 Transmitting/Receiving Filter Design | 578 | 🔶 | `PulseShapingSection.tsx` |
| 10.5.2 Channel Equalization | 582 | ✅ | `equalizer.ts`, `EyeEqualizationSection.tsx` |

---

### Chapter 11 — Multicarrier Modulation and OFDM (pp. 621–641) ✅

**Module:** `src/modules/wireless/` · **DSP:** `src/lib/dsp/ofdm.ts`

| Subsection | Page | Status | Repo mapping |
|------------|------|--------|--------------|
| 11.1 Orthogonal Frequency-Division Multiplexing | 621 | ✅ | `ofdm.ts`, `OfdmSection.tsx` |
| 11.2 Modulation and Demodulation in OFDM | 622 | ✅ | `ofdm.ts` |
| 11.3 OFDM via FFT Algorithm | 626 | ✅ | `ofdm.ts` — FFT-based |
| 11.4 Spectral Characteristics of OFDM | 629 | ✅ | `OfdmSection.tsx` |
| 11.5 Peak-to-Average Power Ratio (PAPR) | 631 | ⬜ | — |
| 11.6 Applications of OFDM | 633 | ⬜ | Informational (no simulation) |

---

### Chapter 12 — An Introduction to Information Theory (pp. 642–688) ✅

**Module:** `src/modules/infotheory/` · **DSP:** `src/lib/dsp/entropy.ts`, `huffman.ts`, `lz78.ts`, `capacity.ts`

| Subsection | Page | Status | Repo mapping |
|------------|------|--------|--------------|
| 12.1 Modeling Information Sources | 642 | ✅ | `entropy.ts`, `EntropySection.tsx` |
| 12.1.1 Measure of Information / Entropy | 644 | ✅ | `entropy.ts` |
| 12.1.2 Joint and Conditional Entropy | 647 | ✅ | `entropy.ts` |
| 12.1.3 Mutual Information | 650 | ⬜ | — |
| 12.1.4 Differential Entropy | 650 | ⬜ | — |
| 12.2 Source Coding Theorem | 652 | ✅ | `PrefixKraftSection.tsx` |
| 12.3.1 Huffman Algorithm | 655 | ✅ | `huffman.ts`, `HuffmanSection.tsx` |
| 12.3.2 Lempel-Ziv Algorithm | 659 | ✅ | `lz78.ts`, `LempelZivSection.tsx` |
| 12.4 Modeling of Communication Channels | 661 | 🔶 | `capacity.ts` (channel model, partial) |
| 12.5 Channel Capacity | 664 | ✅ | `capacity.ts`, `ChannelsCapacitySection.tsx` |
| 12.5.1 Gaussian Channel Capacity | 669 | ✅ | `capacity.ts` — Shannon |
| 12.6 Bounds on Communication | 671 | ✅ | `ShannonLimitSection.tsx` |

---

### Chapter 13 — Coding for Reliable Communications (pp. 689–768) ✅

**Module:** `src/modules/channel-coding/` · **DSP:** `src/lib/dsp/blockcodes.ts`, `convcodes.ts`, `cyclic.ts`, `bch.ts`, `reedsolomon.ts`, `gf2m.ts`, `codes.ts`, `concatenated.ts`, `codingcompare.ts`

| Subsection | Page | Status | Repo mapping |
|------------|------|--------|--------------|
| 13.1 The Promise of Coding | 689 | ✅ | `ShannonLimitSection.tsx` |
| 13.2 Linear Block Codes | 694 | ✅ | `blockcodes.ts`, `BlockCodesSection.tsx` |
| 13.2.1 Decoding / Performance of LBC | 700 | ✅ | `blockcodes.ts` — syndrome decoding |
| 13.2.2 Some Important Linear Block Codes | 707 | ✅ | `blockcodes.ts` — Hamming etc. |
| 13.2.3 Error Detection vs. Error Correction | 708 | 🔶 | Partial in `BlockCodesSection.tsx` |
| 13.2.4 Burst-Error-Correcting Codes | 709 | ⬜ | — |
| 13.3 Convolutional Codes | 711 | ✅ | `convcodes.ts`, `ConvCodesSection.tsx` |
| 13.3.1 Basic Properties | 712 | ✅ | `convcodes.ts` |
| 13.3.2 ML Decoding — Viterbi Algorithm | 717 | ✅ | `convcodes.ts` — Viterbi |
| 13.3.3 Other Decoding Algorithms | 722 | ⬜ | — |
| 13.3.4 Bounds on Error Probability | 722 | 🔶 | `ConvCodesSection.tsx` |
| 13.4 Good Codes — Combination of Simple Codes | 725 | ✅ | `concatenated.ts`, `ConcatenatedSection.tsx` |
| 13.4.1 Product Codes | 727 | ⬜ | — |
| 13.4.2 Concatenated Codes | 728 | ✅ | `concatenated.ts` |
| 13.5 Turbo Codes and Iterative Decoding | 728 | ⬜ | — |
| 13.6 Low-Density Parity-Check (LDPC) Codes | 741 | ⬜ | — |
| 13.7 Coding for Bandwidth-Constrained Channels | 747 | ⬜ | — |
| 13.7.2 Trellis-Coded Modulation | 749 | ⬜ | — |
| **Extra:** Cyclic Codes | — | ✅ | `cyclic.ts`, `CyclicCodesSection.tsx` |
| **Extra:** BCH Codes | — | ✅ | `bch.ts`, `gf2m.ts`, `GfBchSection.tsx` |
| **Extra:** Reed-Solomon Codes | — | ✅ | `reedsolomon.ts`, `ReedSolomonSection.tsx` |
| **Extra:** Codes vs Shannon Comparison | — | ✅ | `codingcompare.ts`, `CodesVsShannonSection.tsx` |

> Note: Cyclic, BCH, and Reed-Solomon codes do not appear as separate chapters in the book,
> but align with §13.2.2 "Some Important Linear Block Codes" and forward references.
> Implemented as separate detailed sections in the repo.

---

### Chapter 14 — Data Transmission in Fading Multipath Channels (pp. 769–824) ✅

**Module:** `src/modules/wireless/` · **DSP:** `src/lib/dsp/fading.ts`, `doppler.ts`, `diversity.ts`, `rake.ts`, `mimo.ts`, `shadowing.ts`, `linkbudget.ts`

| Subsection | Page | Status | Repo mapping |
|------------|------|--------|--------------|
| 14.1 Characterization of Physical Wireless Channels | 769 | ✅ | `fading.ts`, `FadingChannelSection.tsx` |
| 14.2 Channel Models for Time-Variant Multipath | 771 | ✅ | `fading.ts` — Rayleigh/Rician |
| 14.2.1 Frequency Nonselective Fading | 774 | ✅ | `fading.ts` — flat fading |
| 14.2.2 Frequency Selective Fading | 777 | ✅ | `fading.ts` |
| 14.2.3 Models for the Doppler Power Spectrum | 778 | ✅ | `doppler.ts`, `DopplerSection.tsx` |
| 14.2.4 Propagation Models for Mobile Radio | 781 | 🔶 | `shadowing.ts` — log-normal |
| 14.3 Performance of Binary Mod. in Rayleigh Fading | 783 | ✅ | `RayleighBerSection.tsx` |
| 14.3.1 Prob. of Error — Freq. Nonselective | 783 | ✅ | BER curve |
| 14.3.2 Signal Diversity | 786 | ✅ | `diversity.ts` |
| 14.3.3 RAKE Demodulator | 792 | ✅ | `rake.ts`, `RakeSection.tsx` |
| 14.3.4 OFDM in Frequency Selective Channels | 794 | 🔶 | `OfdmSection.tsx` (partial) |
| 14.4 Multiple Antenna Systems (MIMO) | 795 | ✅ | `mimo.ts`, `MimoSection.tsx` |
| 14.4.1 Channel Models for MIMO | 796 | ✅ | `mimo.ts` |
| 14.4.2 Signal Transmission in MIMO | 797 | ✅ | `mimo.ts` |
| 14.4.3 Detection in MIMO | 799 | ✅ | `mimo.ts` |
| 14.4.4 Error Rate Performance | 800 | 🔶 | `MimoSection.tsx` |
| 14.4.5 Space-Time Codes | 802 | ⬜ | — |
| 14.5 Link Budget Analysis for Radio Channels | 810 | ✅ | `linkbudget.ts`, `LinkBudgetSection.tsx` |

---

### Chapter 15 — Spread-Spectrum Communication Systems (pp. 825–876) ✅

**Module:** `src/modules/wireless/` · **DSP:** `src/lib/dsp/spread.ts`, `cdma.ts`, `fhss.ts`

| Subsection | Page | Status | Repo mapping |
|------------|------|--------|--------------|
| 15.1 Model of SS Digital Comm. System | 826 | ✅ | `spread.ts` |
| 15.2 DS Spread-Spectrum Systems | 827 | ✅ | `spread.ts`, `SpreadSpectrumSection.tsx` |
| 15.2.1 Despreading on Narrowband Interference | 830 | ✅ | `SpreadSpectrumSection.tsx` |
| 15.2.2 Probability of Error at the Detector | 831 | 🔶 | Partial |
| 15.3 Applications of DS SS | 836 | 🔶 | CDMA section exists |
| 15.3.2 CDMA | 837 | ✅ | `cdma.ts`, `CdmaSection.tsx` |
| 15.3.3 Communication over Multipath Channels | 838 | 🔶 | Linked to RAKE |
| 15.4 Generation of PN Sequences | 840 | ⬜ | — |
| 15.5 Frequency-Hopped Spread Spectrum | 843 | ✅ | `fhss.ts`, `FhssSection.tsx` |
| 15.5.1 Slow FH and Partial-Band Interference | 844 | ✅ | `fhss.ts` |
| 15.5.2 Fast Frequency Hopping | 847 | 🔶 | `fhss.ts` (partial) |
| 15.6 Synchronization of SS Systems | 849 | ⬜ | — |
| 15.7 Digital Cellular Communication Systems | 856 | ⬜ | Informational |

---

## Summary statistics

| Status | Chapter count (main) | Description |
|--------|---------------------|-------------|
| ✅ Complete | 13 / 15 | Chapters 2–8, 10–15 |
| 🔶 Partial | 1 / 15 | Chapter 9 (CPFSK exists, rest missing) |
| ⬜ None | 1 / 15 | Chapter 1 (introduction, no simulation needed) |

> Subsection breakdown: of ~99 subsections, **~73 ✅**, **~11 🔶**, **~15 ⬜**.

---

## Usage
When adding a new simulation or formula: find the chapter from the table above →
read the relevant page with `pdftotext -f <pdf_page> -l <pdf_page> refs/Book.pdf -` →
verify the formula/range → add a chapter reference as a comment in code (e.g. `// Proakis §8.6.3`).
