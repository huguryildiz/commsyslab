export const analognoise: Record<string, string> = {
  'nav.analogNoise': 'Noise in Analog Systems',
  'an.title': 'Analog Sistemlerde Gürültü',
  'an.subtitle':
    'Gürültünün AM/FM üzerine etkisi, eşik, pre/de-emphasis, link bütçesi — Proakis Bölüm 6',

  // Top-level tabs
  'an.tab.ariaLabel': 'Bölüm 6 sekmeleri',
  'an.tab.am': "AM'de Gürültü",
  'an.tab.angle': 'Açı Mod.',
  'an.tab.compare': 'Karşılaştırma',
  'an.tab.link': 'İletim & Link',

  // Generic
  'an.gen.reset': 'Sıfırla',
  'an.gen.gamma': 'Baseband SNR $\\gamma=P_R/(N_0 W)$',
  'an.gen.fm': 'Mesaj frekansı $f_m$',

  // §6.1 AM noise tab
  'an.am.sub.ariaLabel': 'AM gürültü alt sekmeleri',
  'an.am.sub.baseband': 'Baseband',
  'an.am.sub.dsb': 'DSB-SC',
  'an.am.sub.ssb': 'SSB',
  'an.am.sub.am': 'Conventional AM',
  'an.am.channel': 'Kanal senaryosu',

  // §6.1.1 Baseband
  'an.bb.title': 'Baseband referans',
  'an.bb.note':
    'Tüm AM şemaları bu sisteme göre kıyaslanır: ideal LPF, gürültü gücü $N_0 W$.',
  'an.bb.signal': 'Mesaj ve gürültülü çıkış',
  'an.bb.trace.msg': 'Mesaj $m(t)$',
  'an.bb.trace.noisy': 'Gürültülü çıkış',
  'an.bb.theory':
    'Baseband sistemde çıkış SNR’si doğrudan $\\gamma=P_R/(N_0 W)$’dir. DSB-SC ve SSB tam olarak bunu verir; conventional AM bunun altında ($\\eta<1$), FM ise eşik üstünde bunun $3\\beta^2 P_{M_n}$ katıdır.',

  // §6.1.2 DSB-SC
  'an.dsb.title': 'DSB-SC demodülasyonu',
  'an.dsb.note':
    'Koherent demod: $r(t)$ ile $\\cos\\omega_c t$ çarpılıp LPF uygulanır; karesel gürültü $n_s$ atılır.',
  'an.dsb.passband': 'Alınan işaret $r(t)=u(t)+n(t)$',
  'an.dsb.output': 'Demodüle çıkış $y(t)$ ve mesaj $m(t)$',
  'an.dsb.gain': 'Demod kazancı',
  'an.dsb.bw': 'Bant genişliği',
  'an.dsb.trace.r': 'Alınan $r(t)$',
  'an.dsb.trace.u': 'Modüleli $u(t)$',
  'an.dsb.trace.y': 'Çıkış $y(t)$',
  'an.dsb.trace.m': 'Mesaj $m(t)$',
  'an.dsb.theory':
    'DSB-SC’de koherent demod sonrası çıkış SNR’si baseband ile aynıdır: $(S/N)_o=(S/N)_b$ (kazanç 0 dB). Karesel gürültü bileşeni $n_s$ atılır; bedeli $2W$ bant genişliğidir.',
};
