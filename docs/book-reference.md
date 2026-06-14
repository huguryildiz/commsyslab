# Book.pdf — Referans Haritası (modül ↔ bölüm/sayfa)

**Kaynak:** `refs/Book.pdf` — Proakis & Salehi, *Fundamentals of Communication Systems*
(2nd ed.), 886 s. Bu dosya kitabın **modüllere göre nereye bakılacağını** gösteren
haritadır; formüllerin kendisi değildir. Bir simülasyon/formül yazarken **ilgili sayfaları
PDF'ten oku ve doğrula** (CLAUDE.md zorunlu kuralı). Sayfa no'ları kitabın basılı
numaralarıdır (PDF sayfa ofseti ~+14).

> Notasyon: kitabın gösterimini izle — `E_b/N_0`, `M`, `d_min`, `Q(·)` fonksiyonu,
> sembol enerjisi `E_s`, gürültü PSD `N_0/2`.

**Durum simgeleri:**
- ✅ = Repoda uygulanmış (modül + DSP kodu var)
- 🔶 = Kısmi uygulama (bazı alt-bölümler veya sadece DSP yardımcıları var)
- ⬜ = Henüz uygulanmamış

---

## Kitap yapısı (bölüm haritası)

| Bl | Başlık | Sayfa | Durum | Platformla ilgisi |
|----|--------|-------|-------|-------------------|
| 1 | Introduction | 1 | ⬜ | Genel sistem modeli, kanal modelleri |
| 2 | Signals and Linear Systems | 21 | ✅ | Fourier, spektrum, filtre tasarımı |
| 3 | Amplitude Modulation | 117 | ✅ | AM (DSB-SC, SSB, VSB), demodülasyon |
| 4 | Angle Modulation | 161 | ✅ | FM/PM sinyalleri, spektrum |
| 5 | Probability and Random Processes | 190 | ✅ | Gürültü, AWGN, PSD, Gauss süreçleri |
| 6 | Effect of Noise on Analog Communication | 255 | ✅ | SNR analizi, eşik etkisi, ön-vurgu |
| 7 | Analog-to-Digital Conversion | 296 | ✅ | Örnekleme, kuantalama, PCM, Delta Mod. |
| 8 | Digital Modulation in AWGN Channel | ~340 | ✅ | Modülasyon & sezim, SER/BER |
| 9 | Noncoherent Modulation / Memory | ~470 | 🔶 | DPSK, noncoherent FSK, CPFSK |
| 10 | Digital Transmission — Bandlimited Channels | 543 | ✅ | Baseband, Nyquist, ISI, göz diyagramı |
| 11 | Multicarrier Modulation and OFDM | 621 | ✅ | OFDM modülasyon/demodülasyon |
| 12 | An Introduction to Information Theory | 642 | ✅ | Entropy, Huffman, Lempel-Ziv, kapasite |
| 13 | Coding for Reliable Communications | 689 | ✅ | Blok kod, konvolüsyon, BCH, RS, birleşik |
| 14 | Data Transmission in Fading Multipath Channels | 769 | ✅ | Rayleigh, Doppler, RAKE, MIMO, link bütçesi |
| 15 | Spread-Spectrum Communication Systems | 825 | ✅ | DS-SS, CDMA, FHSS |

---

## Bölüm detayları ve repo eşlemesi

---

### Bölüm 1 — Introduction (s. 1–20) ⬜

| Alt-bölüm | Sayfa | Durum | Repo karşılığı |
|-----------|-------|-------|----------------|
| 1.1 Historical Review | 4 | ⬜ | — |
| 1.2 Elements of an Electrical Communication System | 7 | ⬜ | Genel model (end-to-end'e ilham) |
| 1.3 Communication Channels and Their Characteristics | 12 | ⬜ | — |
| 1.4 Mathematical Models for Communication Channels | 18 | ⬜ | — |

> Giriş bölümü; doğrudan simülasyon modülü yok, arka plan bilgisi.

---

### Bölüm 2 — Signals and Linear Systems (s. 21–116) ✅

**Modül:** `src/modules/fourier/` · **DSP:** `src/lib/dsp/fourier.ts`, `fft.ts`, `signals.ts`, `spectrum.ts`, `window.ts`

| Alt-bölüm | Sayfa | Durum | Repo karşılığı |
|-----------|-------|-------|----------------|
| 2.1 Basic Concepts (sinyaller, sistemler) | 21 | ✅ | `signals.ts`, `FourierModule.tsx` |
| 2.2 Fourier Series | 43 | ✅ | `fourier.ts` — Fourier serisi |
| 2.3 Fourier Transform | 58 | ✅ | `fourier.ts`, `fft.ts` — FFT |
| 2.4 Filter Design | 85 | 🔶 | `window.ts` (pencere fonksiyonları) |
| 2.5 Power and Energy | 89 | ✅ | `spectrum.ts` — PSD hesaplama |
| 2.6 Hilbert Transform | 95 | ⬜ | — |
| 2.7 Lowpass and Bandpass Signals | 98 | 🔶 | Analog modülde kısmen |

---

### Bölüm 3 — Amplitude Modulation (s. 117–160) ✅

**Modül:** `src/modules/analog/` · **DSP:** `src/lib/dsp/analog.ts`

| Alt-bölüm | Sayfa | Durum | Repo karşılığı |
|-----------|-------|-------|----------------|
| 3.1 Introduction to Modulation | 118 | ✅ | `AnalogModule.tsx` giriş |
| 3.2.1 DSB-SC AM | 119 | ✅ | `analog.ts` — DSB-SC |
| 3.2.2 Conventional AM | 126 | ✅ | `analog.ts` — konvansiyonel AM |
| 3.2.3 SSB AM | 132 | ✅ | `analog.ts` — SSB |
| 3.2.4 VSB AM | 134 | ⬜ | — |
| 3.3 Modulators and Demodulators | 137 | ✅ | `analog.ts` — demodülasyon |
| 3.4 Signal Multiplexing (FDM, QAM) | 144 | ⬜ | — |
| 3.5 AM Radio Broadcasting | 146 | ⬜ | — |

---

### Bölüm 4 — Angle Modulation (s. 161–189) ✅

**Modül:** `src/modules/analog/` · **DSP:** `src/lib/dsp/analog.ts`

| Alt-bölüm | Sayfa | Durum | Repo karşılığı |
|-----------|-------|-------|----------------|
| 4.1 Representation of FM and PM Signals | 161 | ✅ | `analog.ts` — FM/PM |
| 4.2 Spectral Characteristics of Angle-Mod. Signals | 166 | ✅ | `AnalogModule.tsx` spektrum paneli |
| 4.3 Implementation of Angle Mod./Demod. | 171 | ✅ | `analog.ts` — FM demod |
| 4.4 FM Radio Broadcasting | 179 | ⬜ | — |

---

### Bölüm 5 — Probability and Random Processes (s. 190–254) ✅

**Modül:** `src/modules/random-process/` · **DSP:** `src/lib/dsp/random.ts`, `awgn.ts`

| Alt-bölüm | Sayfa | Durum | Repo karşılığı |
|-----------|-------|-------|----------------|
| 5.1 Review of Probability and Random Variables | 190 | 🔶 | `random.ts` — dağılım üretimi |
| 5.2 Random Processes: Basic Concepts | 209 | ✅ | `random.ts`, `RandomProcessModule` |
| 5.2.1 Statistical Averages | 212 | ✅ | `EnsembleSection.tsx` |
| 5.2.2 Wide-Sense Stationary Processes | 215 | ✅ | `AutocorrSection.tsx` |
| 5.2.4 Random Processes and Linear Systems | 218 | ✅ | `FilterSection.tsx` |
| 5.2.5 Power Spectral Density | 220 | ✅ | `PsdSection.tsx` |
| 5.3 Gaussian and White Processes | 226 | ✅ | `awgn.ts` — AWGN üreteci |
| 5.3.2 White Processes | 228 | ✅ | `awgn.ts` |
| 5.3.3 Filtered Noise Processes | 230 | ✅ | `FilterSection.tsx` |

---

### Bölüm 6 — Effect of Noise on Analog Communication (s. 255–295) ✅

**Modül:** `src/modules/analog-noise/` · **DSP:** `src/lib/dsp/analognoise.ts`

| Alt-bölüm | Sayfa | Durum | Repo karşılığı |
|-----------|-------|-------|----------------|
| 6.1 Effect of Noise on AM Systems | 255 | ✅ | `DemodOutputSection.tsx`, `analognoise.ts` |
| 6.1.1 Baseband System | 256 | ✅ | Temel SNR analizi |
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

### Bölüm 7 — Analog-to-Digital Conversion (s. 296–338) ✅

**Modül:** `src/modules/sampling-quantization/`, `src/modules/deltamod/` · **DSP:** `src/lib/dsp/sampling.ts`, `quantize.ts`, `pcm.ts`, `deltamod.ts`

| Alt-bölüm | Sayfa | Durum | Repo karşılığı |
|-----------|-------|-------|----------------|
| 7.1 Sampling and Signal Reconstruction | 297 | ✅ | `sampling.ts`, `SamplingModule.tsx` |
| 7.1.1 The Sampling Theorem | 297 | ✅ | `sampling.ts` — Nyquist |
| 7.2 Quantization | 301 | ✅ | `quantize.ts` |
| 7.2.1 Scalar Quantization | 302 | ✅ | `quantize.ts` — SQNR |
| 7.2.2 Vector Quantization | 309 | ⬜ | — |
| 7.3 Encoding | 311 | 🔶 | `pcm.ts` (PCM kodlama kısmen) |
| 7.4 Waveform Coding | 312 | ✅ | `pcm.ts`, `deltamod.ts` |
| 7.4.1 PCM | 313 | ✅ | `pcm.ts` — SQNR ≈ 6.02n+1.76 dB |
| 7.4.2 DPCM | 316 | ⬜ | — |
| 7.4.3 Delta Modulation | 318 | ✅ | `deltamod.ts`, `DeltaModModule.tsx` |
| 7.5 Analysis-Synthesis Techniques | 321 | ⬜ | — |
| 7.6 Digital Audio Transmission | 325 | ⬜ | — |
| 7.7 JPEG Image-Coding Standard | 332 | ⬜ | — |

---

### Bölüm 8 — Digital Modulation in AWGN Channel (s. ~340–470) ✅

**Modül:** `src/modules/modulation/` · **DSP:** `src/lib/dsp/modulation.ts`, `detector.ts`, `ser.ts`, `awgn.ts`, `gram-schmidt.ts`, `matchedfilter.ts`, `carrierbasis.ts`

| Alt-bölüm | Sayfa | Durum | Repo karşılığı |
|-----------|-------|-------|----------------|
| 8.1 Geometric Representation of Signals | ~341 | ✅ | `gram-schmidt.ts`, takımyıldız |
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
| 8.6.10 Modulation Comparison | ~432 | ✅ | `ModulationModule.tsx` karşılaştırma |
| 8.7 Performance Analysis / Link Budget | ~436 | 🔶 | `linkbudget.ts` (wireless modülde) |

> **Kural:** Teorik `P_s`/`P_b` eğrileri ve karar bölgeleri tam olarak §8.5–8.6 ile uyumlu
> olmalı (Gray kodlaması, `E_b/N_0` ekseni dahil).

---

### Bölüm 9 — Noncoherent Modulation & Systems with Memory (s. ~470–540) 🔶

**Modül:** `src/modules/wireless/` (kısmen) · **DSP:** `src/lib/dsp/cpm.ts`

| Alt-bölüm | Sayfa | Durum | Repo karşılığı |
|-----------|-------|-------|----------------|
| 9.1 Carrier Phase Estimation | ~470 | ⬜ | — |
| 9.2 Carrier Recovery for Suppressed-Carrier | ~475 | ⬜ | — |
| 9.3 Symbol Timing Estimation | ~485 | ⬜ | — |
| 9.4 DPSK | ~495 | ⬜ | — |
| 9.5 Noncoherent Detection | ~504 | ⬜ | — |
| 9.5.1 Noncoherent Binary FSK Receiver | ~505 | ⬜ | — |
| 9.5.2 Optimum Detector for Noncoherent Binary FSK | ~507 | ⬜ | — |
| 9.5.3 Prob. of Error for M-ary FSK (noncoherent) | ~510 | ⬜ | — |
| 9.6 Modulation Systems with Memory | ~513 | 🔶 | `cpm.ts`, `CpmSection.tsx` |
| 9.6.1 Continuous-Phase FSK (CPFSK) | ~513 | ✅ | `cpm.ts` — CPFSK simülasyonu |
| 9.6.2 Spectral Characteristics of CPFSK | ~524 | 🔶 | `CpmSection.tsx` |
| 9.7 Comparison of Modulation Methods | ~525 | ⬜ | — |

---

### Bölüm 10 — Digital Transmission through Bandlimited Channels (s. 543–620) ✅

**Modül:** `src/modules/baseband/` · **DSP:** `src/lib/dsp/pulse.ts`, `eye.ts`, `equalizer.ts`

| Alt-bölüm | Sayfa | Durum | Repo karşılığı |
|-----------|-------|-------|----------------|
| 10.1 Characterization of Bandlimited Channels | 543 | ✅ | `BasebandModule.tsx` |
| 10.1.1 Intersymbol Interference (ISI) | 547 | ✅ | `eye.ts` — göz diyagramı |
| 10.1.2 Digital Transmission — Bandpass | 549 | 🔶 | Kısmen |
| 10.2 Power Spectrum of Digitally Mod. Signals | 552 | ⬜ | — |
| 10.3 Signal Design for Bandlimited Channels | 556 | ✅ | `pulse.ts` — darbe şekillendirme |
| 10.3.1 Nyquist Criterion, Zero ISI, Raised Cosine | 558 | ✅ | `pulse.ts` — raised cosine |
| 10.3.2 Controlled ISI — Partial Response | 564 | ⬜ | — |
| 10.4 Detection of Partial-Response Signals | 566 | ⬜ | — |
| 10.5 System Design — Channel Distortion | 577 | 🔶 | `equalizer.ts` |
| 10.5.1 Transmitting/Receiving Filter Design | 578 | 🔶 | `PulseShapingSection.tsx` |
| 10.5.2 Channel Equalization | 582 | ✅ | `equalizer.ts`, `EyeEqualizationSection.tsx` |

---

### Bölüm 11 — Multicarrier Modulation and OFDM (s. 621–641) ✅

**Modül:** `src/modules/wireless/` · **DSP:** `src/lib/dsp/ofdm.ts`

| Alt-bölüm | Sayfa | Durum | Repo karşılığı |
|-----------|-------|-------|----------------|
| 11.1 Orthogonal Frequency-Division Multiplexing | 621 | ✅ | `ofdm.ts`, `OfdmSection.tsx` |
| 11.2 Modulation and Demodulation in OFDM | 622 | ✅ | `ofdm.ts` |
| 11.3 OFDM via FFT Algorithm | 626 | ✅ | `ofdm.ts` — FFT tabanlı |
| 11.4 Spectral Characteristics of OFDM | 629 | ✅ | `OfdmSection.tsx` |
| 11.5 Peak-to-Average Power Ratio (PAPR) | 631 | ⬜ | — |
| 11.6 Applications of OFDM | 633 | ⬜ | Bilgi amaçlı (simülasyon yok) |

---

### Bölüm 12 — An Introduction to Information Theory (s. 642–688) ✅

**Modül:** `src/modules/infotheory/` · **DSP:** `src/lib/dsp/entropy.ts`, `huffman.ts`, `lz78.ts`, `capacity.ts`

| Alt-bölüm | Sayfa | Durum | Repo karşılığı |
|-----------|-------|-------|----------------|
| 12.1 Modeling Information Sources | 642 | ✅ | `entropy.ts`, `EntropySection.tsx` |
| 12.1.1 Measure of Information / Entropy | 644 | ✅ | `entropy.ts` |
| 12.1.2 Joint and Conditional Entropy | 647 | ✅ | `entropy.ts` |
| 12.1.3 Mutual Information | 650 | ⬜ | — |
| 12.1.4 Differential Entropy | 650 | ⬜ | — |
| 12.2 Source Coding Theorem | 652 | ✅ | `PrefixKraftSection.tsx` |
| 12.3.1 Huffman Algorithm | 655 | ✅ | `huffman.ts`, `HuffmanSection.tsx` |
| 12.3.2 Lempel-Ziv Algorithm | 659 | ✅ | `lz78.ts`, `LempelZivSection.tsx` |
| 12.4 Modeling of Communication Channels | 661 | 🔶 | `capacity.ts` (kanal modeli kısmen) |
| 12.5 Channel Capacity | 664 | ✅ | `capacity.ts`, `ChannelsCapacitySection.tsx` |
| 12.5.1 Gaussian Channel Capacity | 669 | ✅ | `capacity.ts` — Shannon |
| 12.6 Bounds on Communication | 671 | ✅ | `ShannonLimitSection.tsx` |

---

### Bölüm 13 — Coding for Reliable Communications (s. 689–768) ✅

**Modül:** `src/modules/channel-coding/` · **DSP:** `src/lib/dsp/blockcodes.ts`, `convcodes.ts`, `cyclic.ts`, `bch.ts`, `reedsolomon.ts`, `gf2m.ts`, `codes.ts`, `concatenated.ts`, `codingcompare.ts`

| Alt-bölüm | Sayfa | Durum | Repo karşılığı |
|-----------|-------|-------|----------------|
| 13.1 The Promise of Coding | 689 | ✅ | `ShannonLimitSection.tsx` |
| 13.2 Linear Block Codes | 694 | ✅ | `blockcodes.ts`, `BlockCodesSection.tsx` |
| 13.2.1 Decoding / Performance of LBC | 700 | ✅ | `blockcodes.ts` — sendrom dekodlama |
| 13.2.2 Some Important Linear Block Codes | 707 | ✅ | `blockcodes.ts` — Hamming vb. |
| 13.2.3 Error Detection vs. Error Correction | 708 | 🔶 | Kısmen `BlockCodesSection.tsx` |
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
| **Ek:** Cyclic Codes | — | ✅ | `cyclic.ts`, `CyclicCodesSection.tsx` |
| **Ek:** BCH Codes | — | ✅ | `bch.ts`, `gf2m.ts`, `GfBchSection.tsx` |
| **Ek:** Reed-Solomon Codes | — | ✅ | `reedsolomon.ts`, `ReedSolomonSection.tsx` |
| **Ek:** Codes vs Shannon Comparison | — | ✅ | `codingcompare.ts`, `CodesVsShannonSection.tsx` |

> Not: Cyclic, BCH ve Reed-Solomon kodları kitapta ayrı bölüm olarak yok ama §13.2.2
> "Some Important Linear Block Codes" ve ileri referanslarla örtüşür. Repoda ayrı
> section'lar olarak detaylı uygulanmış.

---

### Bölüm 14 — Data Transmission in Fading Multipath Channels (s. 769–824) ✅

**Modül:** `src/modules/wireless/` · **DSP:** `src/lib/dsp/fading.ts`, `doppler.ts`, `diversity.ts`, `rake.ts`, `mimo.ts`, `shadowing.ts`, `linkbudget.ts`

| Alt-bölüm | Sayfa | Durum | Repo karşılığı |
|-----------|-------|-------|----------------|
| 14.1 Characterization of Physical Wireless Channels | 769 | ✅ | `fading.ts`, `FadingChannelSection.tsx` |
| 14.2 Channel Models for Time-Variant Multipath | 771 | ✅ | `fading.ts` — Rayleigh/Rician |
| 14.2.1 Frequency Nonselective Fading | 774 | ✅ | `fading.ts` — düz sönümleme |
| 14.2.2 Frequency Selective Fading | 777 | ✅ | `fading.ts` |
| 14.2.3 Models for the Doppler Power Spectrum | 778 | ✅ | `doppler.ts`, `DopplerSection.tsx` |
| 14.2.4 Propagation Models for Mobile Radio | 781 | 🔶 | `shadowing.ts` — log-normal |
| 14.3 Performance of Binary Mod. in Rayleigh Fading | 783 | ✅ | `RayleighBerSection.tsx` |
| 14.3.1 Prob. of Error — Freq. Nonselective | 783 | ✅ | BER eğrisi |
| 14.3.2 Signal Diversity | 786 | ✅ | `diversity.ts` |
| 14.3.3 RAKE Demodulator | 792 | ✅ | `rake.ts`, `RakeSection.tsx` |
| 14.3.4 OFDM in Frequency Selective Channels | 794 | 🔶 | `OfdmSection.tsx` (kısmen) |
| 14.4 Multiple Antenna Systems (MIMO) | 795 | ✅ | `mimo.ts`, `MimoSection.tsx` |
| 14.4.1 Channel Models for MIMO | 796 | ✅ | `mimo.ts` |
| 14.4.2 Signal Transmission in MIMO | 797 | ✅ | `mimo.ts` |
| 14.4.3 Detection in MIMO | 799 | ✅ | `mimo.ts` |
| 14.4.4 Error Rate Performance | 800 | 🔶 | `MimoSection.tsx` |
| 14.4.5 Space-Time Codes | 802 | ⬜ | — |
| 14.5 Link Budget Analysis for Radio Channels | 810 | ✅ | `linkbudget.ts`, `LinkBudgetSection.tsx` |

---

### Bölüm 15 — Spread-Spectrum Communication Systems (s. 825–876) ✅

**Modül:** `src/modules/wireless/` · **DSP:** `src/lib/dsp/spread.ts`, `cdma.ts`, `fhss.ts`

| Alt-bölüm | Sayfa | Durum | Repo karşılığı |
|-----------|-------|-------|----------------|
| 15.1 Model of SS Digital Comm. System | 826 | ✅ | `spread.ts` |
| 15.2 DS Spread-Spectrum Systems | 827 | ✅ | `spread.ts`, `SpreadSpectrumSection.tsx` |
| 15.2.1 Despreading on Narrowband Interference | 830 | ✅ | `SpreadSpectrumSection.tsx` |
| 15.2.2 Probability of Error at the Detector | 831 | 🔶 | Kısmen |
| 15.3 Applications of DS SS | 836 | 🔶 | CDMA kısmı var |
| 15.3.2 CDMA | 837 | ✅ | `cdma.ts`, `CdmaSection.tsx` |
| 15.3.3 Communication over Multipath Channels | 838 | 🔶 | RAKE ile bağlantılı |
| 15.4 Generation of PN Sequences | 840 | ⬜ | — |
| 15.5 Frequency-Hopped Spread Spectrum | 843 | ✅ | `fhss.ts`, `FhssSection.tsx` |
| 15.5.1 Slow FH and Partial-Band Interference | 844 | ✅ | `fhss.ts` |
| 15.5.2 Fast Frequency Hopping | 847 | 🔶 | `fhss.ts` (kısmen) |
| 15.6 Synchronization of SS Systems | 849 | ⬜ | — |
| 15.7 Digital Cellular Communication Systems | 856 | ⬜ | Bilgi amaçlı |

---

## Özet istatistikleri

| Durum | Bölüm sayısı (ana) | Açıklama |
|-------|---------------------|----------|
| ✅ Tam | 13 / 15 | Bölüm 2–8, 10–15 |
| 🔶 Kısmi | 1 / 15 | Bölüm 9 (CPFSK var, geri kalanı yok) |
| ⬜ Yok | 1 / 15 | Bölüm 1 (giriş, simülasyon gerektirmez) |

> Alt-bölüm bazında: ~95 alt-bölümden **~65 ✅**, **~13 🔶**, **~17 ⬜**.

---

## Kullanım
Yeni simülasyon veya formül eklerken: yukarıdaki tablodan bölümü bul →
`pdftotext -f <pdf_sayfa> -l <pdf_sayfa> refs/Book.pdf -` ile ilgili sayfayı oku →
formülü/aralığı doğrula → koda bölüm referansı yorum olarak ekle (ör. `// Proakis §8.6.3`).
