export const analognoise: Record<string, string> = {
  'nav.analogNoise': 'Noise in Analog Systems',
  'an.title': 'Noise in Analog Systems',
  'an.subtitle':
    'Effect of noise on AM/FM, threshold, pre/de-emphasis, and link budget — Proakis Ch 6',

  // Top-level tabs
  'an.tab.ariaLabel': 'Chapter 6 tabs',
  'an.tab.am': 'Noise in AM',
  'an.tab.angle': 'Angle Mod.',
  'an.tab.compare': 'Comparison',
  'an.tab.link': 'Transmission & Link',

  // Generic
  'an.gen.reset': 'Reset',
  'an.gen.gamma': 'Baseband SNR $\\gamma=P_R/(N_0 W)$',
  'an.gen.fm': 'Message frequency $f_m$',

  // §6.1 AM noise tab
  'an.am.sub.ariaLabel': 'AM noise sub-tabs',
  'an.am.sub.baseband': 'Baseband',
  'an.am.sub.dsb': 'DSB-SC',
  'an.am.sub.ssb': 'SSB',
  'an.am.sub.am': 'Conventional AM',
  'an.am.channel': 'Channel scenario',

  // §6.2 Angle-modulation noise tab
  'an.angle.sub.ariaLabel': 'Angle-modulation noise sub-tabs',
  'an.angle.sub.psd': 'Noise PSD & SNR',
  'an.angle.sub.threshold': 'Threshold',
  'an.angle.sub.emphasis': 'Pre/De-emphasis',

  // §6.2 Noise PSD & SNR
  'an.psd.title': 'Noise spectrum & SNR',
  'an.psd.scheme': 'FM / PM',
  'an.psd.plot': 'Output noise PSD (normalized)',
  'an.psd.theory':
    'In FM the output-noise PSD is parabolic ($N_0 f^2/A_c^2$): high-frequency message components suffer far more noise — this motivates pre-emphasis. PM has a flat noise PSD. FM gains $3\\beta^2 P_{M_n}$ over baseband and PM gains $\\beta^2 P_{M_n}$ (FM is 3× better, ≈ +4.8 dB). SNR rises as $\\beta^2$ — about +6 dB per doubling of $\\beta$ — at the cost of bandwidth $2(\\beta+1)W$.',

  // §6.2.1 Threshold
  'an.thr.title': 'FM threshold effect',
  'an.thr.betaSel': 'Highlight $\\beta$',
  'an.thr.gain': 'Above-threshold gain',
  'an.thr.plot': 'Output SNR vs baseband SNR',
  'an.thr.theory':
    'Above threshold FM SNR follows the straight high-SNR line; below the threshold $\\gamma_{th}=20(\\beta+1)$ the demodulator produces clicks and the SNR collapses. Larger $\\beta$ gives more gain but a higher threshold — design rule: pick the largest $\\beta$ with $\\gamma\\ge 20(\\beta+1)$.',

  // §6.2.2 Pre/De-emphasis
  'an.emph.title': 'Pre/de-emphasis',
  'an.emph.W': 'Audio bandwidth $W$',
  'an.emph.tau': 'Time constant $\\tau$',
  'an.emph.gain': 'SNR improvement',
  'an.emph.filter': 'Pre/de-emphasis response',
  'an.emph.noise': 'Output noise PSD before/after de-emphasis',
  'an.emph.trace.pre': 'Pre-emphasis $|H_p|$',
  'an.emph.trace.de': 'De-emphasis $|H_d|$',
  'an.emph.trace.before': 'No de-emphasis',
  'an.emph.trace.after': 'With de-emphasis',
  'an.emph.theory':
    'Pre-emphasis boosts high frequencies at the transmitter; de-emphasis $H_d(f)=1/(1+jf/f_1)$ cuts them at the receiver, restoring the message while suppressing the parabolic FM noise. With $\\tau=75\\,\\mu s$ ($f_1\\approx2122$ Hz) and $W=15$ kHz the pair adds roughly +13 dB (Eq. 6.2.42).',

  // §6.3 Comparison
  'an.cmp.title': 'Parameters',
  'an.cmp.plot': 'Output SNR vs baseband SNR',
  'an.cmp.tableTitle': 'Scheme comparison',
  'an.cmp.theory':
    'SSB and DSB-SC match the baseline SNR; SSB does it in half the bandwidth. Conventional AM stays below the baseline ($\\eta<1$) but uses the simplest receiver. FM/PM climb as $\\beta^2$ above threshold, trading the wide Carson bandwidth $2(\\beta+1)W$ for noise immunity — FM is 3× PM at equal $\\beta$.',

  // §6.4 Transmission & link tab
  'an.link.sub.ariaLabel': 'Transmission & link sub-tabs',
  'an.link.sub.thermal': 'Thermal noise',
  'an.link.sub.figure': 'Noise figure',
  'an.link.sub.pathloss': 'Path loss',
  'an.link.sub.repeater': 'Repeaters',

  // §6.4.1 Thermal noise
  'an.thermal.title': 'Thermal noise source',
  'an.thermal.temp': 'Temperature $T$',
  'an.thermal.bw': 'Bandwidth $B$',
  'an.thermal.plot': 'Noise PSD $N_0=kT$ vs temperature',
  'an.thermal.theory':
    'Every resistor at temperature $T$ delivers white thermal noise with one-sided PSD $N_0=kT$, so the available noise power in bandwidth $B$ is $P_n=kTB$. At the standard $T_0=290$ K this gives the $N_0\\approx4\\times10^{-21}$ W/Hz (−174 dBm/Hz) noise floor (§6.4.1).',

  // §6.1.1 Baseband
  'an.bb.title': 'Baseband reference',
  'an.bb.note': 'Every AM scheme is compared to this system: ideal LPF, noise power $N_0 W$.',
  'an.bb.signal': 'Message and noisy output',
  'an.bb.trace.msg': 'Message $m(t)$',
  'an.bb.trace.noisy': 'Noisy output',
  'an.bb.theory':
    'In a baseband system the output SNR is simply $\\gamma=P_R/(N_0 W)$. DSB-SC and SSB deliver exactly this; conventional AM falls below it ($\\eta<1$), while FM above threshold is $3\\beta^2 P_{M_n}$ times it.',

  // §6.1.2 DSB-SC
  'an.dsb.title': 'DSB-SC demodulation',
  'an.dsb.note':
    'Coherent demod: multiply $r(t)$ by $\\cos\\omega_c t$ and lowpass-filter; the quadrature noise $n_s$ is rejected.',
  'an.dsb.passband': 'Received signal $r(t)=u(t)+n(t)$',
  'an.dsb.output': 'Demodulated output $y(t)$ and message $m(t)$',
  'an.dsb.gain': 'Demod gain',
  'an.dsb.bw': 'Bandwidth',
  'an.dsb.trace.r': 'Received $r(t)$',
  'an.dsb.trace.u': 'Modulated $u(t)$',
  'an.dsb.trace.y': 'Output $y(t)$',
  'an.dsb.trace.m': 'Message $m(t)$',
  'an.dsb.theory':
    'For DSB-SC, coherent demodulation gives an output SNR equal to baseband: $(S/N)_o=(S/N)_b$ (0 dB gain). The quadrature noise component $n_s$ is rejected; the cost is $2W$ bandwidth.',

  // §6.1.3 SSB
  'an.ssb.title': 'SSB demodulation',
  'an.ssb.note':
    'Single sideband: $u(t)=A_c[m\\cos\\omega_c t \\mp \\hat m\\sin\\omega_c t]$. Coherent demod recovers $m(t)$.',
  'an.ssb.theory':
    'SSB output SNR also equals baseband ($(S/N)_o=(S/N)_b$), but it uses only $W$ bandwidth — half of DSB-SC. Same SNR, half the band: preferred on bandwidth-critical links.',

  // §6.1.4 Conventional AM
  'an.cam.title': 'Conventional AM',
  'an.cam.aIndex': 'Modulation index $a$',
  'an.cam.note':
    'Envelope detector: diode + RC. At high SNR the output matches synchronous demod, $(S/N)_o=\\eta\\,(S/N)_b$.',
  'an.cam.envPanel': 'Received signal and envelope detector',
  'an.cam.msgPanel': 'Recovered message after DC block',
  'an.cam.threshold':
    '⚠ Threshold effect: when $\\gamma$ is low the envelope detector intermixes signal and noise, so the output breaks down.',
  'an.cam.trace.refEnv': 'True envelope $A_c[1+a m_n]$',
  'an.cam.trace.detEnv': 'Detector output',
  'an.cam.trace.r': 'Received $r(t)$',
  'an.cam.trace.refMsg': 'Message $a\\,m_n(t)$',
  'an.cam.trace.recovered': 'Recovered',
  'an.cam.theory':
    'Conventional-AM efficiency $\\eta=a^2 P_{M_n}/(1+a^2 P_{M_n})<1$, so the output SNR is always below baseband (carrier power is wasted). The simple envelope detector works only at high SNR; below threshold ($\\gamma$ small) the signal is buried in noise (§6.1.4).',
};
