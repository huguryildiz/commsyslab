/**
 * signal_sim grafik paleti — canvas çizimleri için merkezî renkler.
 * CSS "chrome" tokenlardan (tokens.css) gelir; ancak canvas `fillStyle`/`strokeStyle`
 * CSS değişkeni okuyamadığından sinyal renkleri burada sabitlenir — değerler
 * tokens.css `--color-*` (koyu tema) ile aynıdır. Tüm modüller buradan tüketir.
 */
export const CHART = {
  green: '#39ff85', // --color-x : birincil / giriş / ML / kuantalama
  orange: '#ff8c42', // --color-h : örnek / simülasyon / imleç
  blue: '#7b8cff', // --color-y : analog / teori / takımyıldız noktası
  pink: '#ff4f9a', // --color-marker : vurgu
  red: '#ff5b6b', // --err : hata
  text: '#e2e6f0', // --text : etiket
  dim: '#7a82a6', // --text-dim : eksen / yardımcı çizgi
  bgDeep: '#0a0a16', // koyu canvas dolgu (etiket arka planı)
} as const;

/** "#rrggbb" rengini alfa ile yarı-saydam `rgba(...)` string'ine çevirir. */
export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
