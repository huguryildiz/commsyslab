# Book.pdf — Referans Haritası (modül ↔ bölüm/sayfa)

**Kaynak:** `slides/Book.pdf` — Proakis & Salehi, *Communication Systems Engineering*
(2nd ed.), 815 s. Bu dosya kitabın **modüllere göre nereye bakılacağını** gösteren
haritadır; formüllerin kendisi değildir. Bir simülasyon/formül yazarken **ilgili sayfaları
PDF'ten oku ve doğrula** (CLAUDE.md zorunlu kuralı). Sayfa no'ları kitabın basılı
numaralarıdır (PDF sayfa ofseti ~+14).

> Notasyon: kitabın gösterimini izle — `E_b/N_0`, `M`, `d_min`, `Q(·)` fonksiyonu,
> sembol enerjisi `E_s`, gürültü PSD `N_0/2`.

---

## Kitap yapısı (bölüm haritası)

| Bl | Başlık | Sayfa | Platformla ilgisi |
|----|--------|-------|-------------------|
| 1 | Introduction | 1 | Genel sistem modeli |
| 2 | Frequency Domain Analysis of Signals and Systems | ~17 | Fourier, spektrum (DSP yardımcı) |
| 3 | Analog Signal Transmission and Reception | 70 | AM/FM (kapsam dışı, arka plan) |
| 4 | Random Processes | 144 | Gürültü, AWGN, **örnekleme (4.5)** |
| 5 | Effect of Noise on Analog Communication | 217 | SNR temelleri (arka plan) |
| 6 | **Information Sources and Source Coding** | 267 | **Entropy, Huffman, Kuantalama, PCM** |
| 7 | **Digital Transmission through the AWGN Channel** | 340 | **Modülasyon & Sezim, SER** |
| 8 | **Digital Transmission through Bandlimited Channels** | 474 | **Baseband, Nyquist, ISI, Göz** |
| 9 | Channel Capacity and Coding | 576 | Kapasite, kodlama (ileri/opsiyonel) |
| 10 | Wireless Communications | 674 | Sönümleme, OFDM, yayılı spektrum (ileri) |

---

## Modül ↔ kitap eşlemesi

### Sampling & Quantization (`src/modules/sampling`)
- **4.5 Bandlimited Processes and Sampling** (s. 192) — örnekleme teoremi, Nyquist hızı,
  örtüşme (aliasing).
- **6.5 Quantization** (s. 290) — 6.5.1 Skaler kuantalama (s. 291), 6.5.2 Vektör kuant. (s. 300):
  kuantalama gürültüsü, SQNR, tekdüze/tekdüze-olmayan kuantalayıcı.
- **6.6 Waveform Coding** (s. 302) — 6.6.1 **PCM** (s. 302), 6.6.2 DPCM (s. 307),
  6.6.3 Delta Mod. (s. 310): bit hızı = `n·f_s`, SQNR ≈ `6.02n + 1.76` dB.
- İlgili DSP: `src/lib/dsp/sampling.ts`, `quantize.ts`, `pcm.ts`.

### Modulation & Detection (`src/modules/modulation`)
- **7.1 Geometric Representation of Signal Waveforms** (s. 341) — sinyal-uzayı, Gram-Schmidt,
  takımyıldız temeli.
- **7.2 PAM** (s. 345), **7.3 2-B sinyaller: PSK & QAM** (s. 350–360), **7.4 Çok boyutlu /
  ortogonal (FSK)** (s. 360).
- **7.5 Optimum Receiver** (s. 369) — 7.5.1 Korelasyon demod., 7.5.2 Uyumlu-filtre (matched
  filter), 7.5.3 **Optimum dedektör (ML/MAP, min-distance)** (s. 381).
- **7.6 Probability of Error** (s. 404) — **SER formüllerinin kaynağı**:
  - 7.6.2 M-ary PAM (s. 408)
  - 7.6.3 Faz-uyumlu PSK (s. 413)
  - 7.6.5 QAM (s. 418)
  - 7.6.6 M-ary ortogonal (s. 423)
  - 7.6.10 Modülasyon yöntemleri karşılaştırması (s. 432)
- İlgili DSP: `src/lib/dsp/modulation.ts`, `detector.ts`, `ser.ts`, `awgn.ts`.
- **Kural:** Teorik `P_s`/`P_b` eğrileri ve karar bölgeleri tam olarak §7.5–7.6 ile uyumlu
  olmalı (Gray kodlaması, `E_b/N_0` ekseni dahil).

### Baseband & Eye Diagram (`src/modules/baseband` — planlı)
- **8.1 Digital Transmission through Bandlimited Channels** (s. 474).
- **8.3 Signal Design for Bandlimited Channels** (s. 490) — 8.3.1 **Nyquist kriteri,
  sıfır-ISI**, raised-cosine; 8.3.2 kontrollü ISI (partial response).
- **8.4 Probability of Error in Detection of Digital PAM** (s. 499).
- **Göz diyagramı** ve ISI görselleştirmesi §8.1–8.4'e dayanır.

### Huffman & Entropy (`src/modules/huffman` — planlı)
- **6.1 Modeling of Information Sources** (s. 268) — 6.1.1 Bilgi ölçüsü/entropy (s. 269),
  6.1.2 Bileşik & koşullu entropy (s. 271).
- **6.2 Source-Coding Theorem** (s. 273) — `H(X) ≤ \bar{L} < H(X)+1`.
- **6.3 Source-Coding Algorithms** (s. 276) — 6.3.1 **Huffman** (s. 276), 6.3.2 Lempel-Ziv (s. 280).
- İlgili DSP: `src/lib/dsp/entropy.ts` (yeni).

### End-to-End Link (`src/modules/end-to-end` — planlı)
- Zincir: kaynak kodlama (Ch 6) → modülasyon/sezim (Ch 7) → bantsınırlı kanal (Ch 8).
- **7.7 Performance Analysis / Link Budget** (s. 436) — 7.7.2 Radyo kanalları link bütçesi (s. 438).
- (İleri/opsiyonel) **Ch 9 Channel Capacity** (s. 576) — Shannon sınırı karşılaştırması.

---

## Kullanım
Yeni simülasyon veya formül eklerken: yukarıdaki tablodan bölümü bul →
`pdftotext -f <pdf_sayfa> -l <pdf_sayfa> slides/Book.pdf -` ile ilgili sayfayı oku →
formülü/aralığı doğrula → koda bölüm referansı yorum olarak ekle (ör. `// Proakis §7.6.3`).
