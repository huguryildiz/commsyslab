# DigiCommLab — Project Rules

EE413 Interactive Digital Communications Lab. React 18 + TypeScript + Vite. Modules
under `src/modules/*` (sampling, modulation, …), shared UI in `src/components`, DSP in
`src/lib/dsp`, design tokens in `src/theme`.

## Referans Doküman — slides/Book.pdf (ZORUNLU KURAL)

Platform kapsamında geliştirilecek **her simülasyon** için **her zaman** `slides/Book.pdf`
dokümanı referans alınır. Bir modülün/simülasyonun DSP mantığı, formülleri, parametre
aralıkları, terminoloji ve teorik açıklamaları (TheoryBox, Formula vb.) bu kaynaktaki
tanım ve gösterimle tutarlı olmalı; kendi kafandan formül/varsayım uydurma.

- Yeni simülasyon veya formül eklerken/değiştirirken önce `slides/Book.pdf`'teki ilgili
  bölümü oku ve onunla doğrula (gerekirse bölüm/sayfa numarasını koda yorum olarak yaz).
- Bölüm-özel slaytlar da destekleyici kaynaktır: `slides/EE413-CH7..CH10.pdf`.
  Çelişki olursa `Book.pdf` esas alınır.
- Notasyon (sembol, birim, eksen etiketi) ve değişken adları kitabın gösterimini izlesin.
- **Hangi bölüme bakılacağı** için `docs/book-reference.md` haritasını kullan (modül ↔
  bölüm/sayfa eşlemesi). Kitap = Proakis & Salehi, *Communication Systems Engineering*.
  Sayfayı oku: `pdftotext -f <s> -l <s> slides/Book.pdf -`.

## UI / Design System — signal_sim görsel dili (ZORUNLU KURAL)

Bu platformun tüm arayüzü **spmi-lab/signal_sim** reposunun görsel diliyle yapılır.
Referans kopya repoda: `../signal_sim_ref/` (özellikle `style.css` ve `theme.js`).
Yeni ekran/bileşen/modül eklerken bu stile uy; kendi rastgele renk/font uydurma.

**Tasarım dili:** koyu **glassmorphism** + **neon glow** vurgular.

### Kaynak — her zaman tokenlardan tüket
- Renk/font/boşluk/yarıçap için `src/theme/tokens.css` değişkenlerini kullan.
  Hex/px değerleri bileşenlere gömme. Yeni bir ihtiyaç varsa önce token ekle.
- Tipografi — **premium SaaS üçlüsü** (signal_sim'in Saira'sı yerine bilinçli seçim):
  gövde/UI `var(--font)` = **Inter**, başlık/marka `var(--font-head)` =
  **Space Grotesk**, sayısal değer/formül/kod `var(--mono)` = **JetBrains Mono**.
  Fontlar `index.html`'de Google Fonts ile yüklü. Bileşende ham font-family yazma,
  her zaman bu üç tokendan birini kullan. Yeni font ekleme — bu üçlü standarttır.

### Palet (token isimleri)
- Zemin: `--bg` (derin lacivert), cam panel `--bg-panel` / `--surface`, input `--surface-2`.
- Metin: `--text`, `--text-dim`, `--text-faint`.
- Çerçeve/glow: `--border`, `--border-strong`, `--slider-track`.
- Neon vurgu: `--accent` (yeşil, birincil), `--accent-2` (turuncu), `--accent-blue` (mavi-mor).
- Sinyal grafikleri: `--color-x` yeşil (giriş), `--color-h` turuncu (sistem),
  `--color-y` mavi-mor (çıkış), `--color-marker` pembe (imleç).
- Durum: `--ok`, `--err`, `--warn`.

### Görsel kurallar
- **Paneller** cam: `--bg-panel` zemin + `backdrop-filter: blur(var(--glass-blur))` +
  `1px solid var(--border)` + `var(--radius)`; hover'da `--border-strong` + hafif glow.
  `.panel` / `.glass-panel` sınıfları bunu otomatik alır (`src/theme/global.css`).
- **Köşe yarıçapı**: büyük yüzeyler `--radius` (14px), küçükler `--radius-sm` (8px).
- **Geçişler**: `var(--transition)` (0.25s cubic-bezier).
- **Neon vurgu**: aktif/hover durumlarında renkli kenarlık + `box-shadow` glow
  (ör. `0 0 12px rgba(57,255,133,0.18)`). Abartma — ince ve amaca yönelik.
- **Slider/select/button/input** stilleri `global.css`'te neon olarak tanımlı; mümkünse
  ham HTML öğelerini kullan, yeni stil yazma.
- **Canvas** grafikleri `--canvas-bg` zeminli, çizgi renkleri `--color-*` tokenlarından.
- **Başlıklar/markalar** gradyan metin: `linear-gradient(135deg, var(--accent),
  var(--accent-blue), var(--accent-2))` + `background-clip: text`.

### Tema
- Koyu tema varsayılan. Açık tema `:root[data-theme='light']` ile (App.tsx toggle eder).
- Her iki temada da renkler tokenlardan gelir; bileşende temaya özel dal yazma.

### CSS organizasyonu
- Global/temel stil: `src/theme/global.css` + `src/theme/tokens.css`.
- Paylaşılan bileşenler: `src/components/components.css`.
- Modül-özel stil: `src/modules/<modül>/<modül>.css` (token kullan).

## Komutlar
- Geliştirme: `npm run dev` · Build: `npm run build` (tsc --noEmit + vite)
- Test: `npm test` (vitest) · Lint: `npm run lint` · Format: `npm run format`

## Genel kurallar
- TypeScript strict; `any` kullanma. Import alias `@/` → `src/`.
- DSP mantığı saf fonksiyonlar olarak `src/lib/dsp`'de, UI'dan ayrık ve testli kalsın.
