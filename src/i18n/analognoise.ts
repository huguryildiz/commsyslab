export const analognoise: Record<string, string> = {
  'nav.analogNoise': 'Noise in Analog Systems',
  'an.title': 'Noise in Analog Systems',

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

  // §6.2.1 Threshold
  'an.thr.title': 'FM threshold effect',
  'an.thr.betaSel': 'Highlight $\\beta$',
  'an.thr.gain': 'Above-threshold gain',
  'an.thr.plot': 'Output SNR vs baseband SNR',

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

  // §6.3 Comparison
  'an.cmp.title': 'Parameters',
  'an.cmp.plot': 'Output SNR vs baseband SNR',
  'an.cmp.tableTitle': 'Scheme comparison',

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

  // §6.4.2 Noise figure & Friis
  'an.figure.title': 'Amplifier cascade (3 stages)',
  'an.figure.stage': 'Stage',
  'an.figure.diagram': 'Friis cascade',

  // §6.4.3 Path loss
  'an.pathloss.title': 'Transmission loss',
  'an.pathloss.medium': 'Medium',
  'an.pathloss.free': 'Free space',
  'an.pathloss.cable': 'Cable',
  'an.pathloss.dist': 'Distance $d$',
  'an.pathloss.freq': 'Frequency $f$',
  'an.pathloss.dbkm': 'Loss rate',
  'an.pathloss.pt': 'Transmit power $P_T$',
  'an.pathloss.plot': 'Loss $L$ vs distance',

  // §6.4.4 Repeaters
  'an.rep.title': 'Repeater chain',
  'an.rep.loss': 'Loss per segment $L$',
  'an.rep.fa': 'Repeater NF $F_a$',
  'an.rep.diagram': 'K-segment cascade',

  // §6.1.1 Baseband
  'an.bb.title': 'Baseband reference',
  'an.bb.signal': 'Message and noisy output',
  'an.bb.trace.msg': 'Message $m(t)$',
  'an.bb.trace.noisy': 'Noisy output',

  // §6.1.2 DSB-SC
  'an.dsb.title': 'DSB-SC demodulation',
  'an.dsb.passband': 'Received signal $r(t)=u(t)+n(t)$',
  'an.dsb.output': 'Demodulated output $y(t)$ and message $m(t)$',
  'an.dsb.gain': 'Demod gain',
  'an.dsb.bw': 'Bandwidth',
  'an.dsb.trace.r': 'Received $r(t)$',
  'an.dsb.trace.u': 'Modulated $u(t)$',
  'an.dsb.trace.y': 'Output $y(t)$',
  'an.dsb.trace.m': 'Message $m(t)$',

  // §6.1.3 SSB
  'an.ssb.title': 'SSB demodulation',

  // §6.1.4 Conventional AM
  'an.cam.title': 'Conventional AM',
  'an.cam.aIndex': 'Modulation index $a$',
  'an.cam.envPanel': 'Received signal and envelope detector',
  'an.cam.msgPanel': 'Recovered message after DC block',
  'an.cam.trace.refEnv': 'True envelope $A_c[1+a m_n]$',
  'an.cam.trace.detEnv': 'Detector output',
  'an.cam.trace.r': 'Received $r(t)$',
  'an.cam.trace.refMsg': 'Message $a\\,m_n(t)$',
  'an.cam.trace.recovered': 'Recovered',

  // ─────────────────────────────────────────────────────────────────────────
  // Info cards (interactive-surface explainers; deep math stays in the book)
  // ─────────────────────────────────────────────────────────────────────────

  // §6.1.1 Baseband
  'an.bb.c1.t': 'Baseband reference',
  'an.bb.c1.b':
    'An ideal lowpass receiver of bandwidth $W$ passes the message and a noise power $N_0 W$. Its output SNR is the baseline every AM scheme is measured against.',
  'an.bb.c2.t': 'Reading the plot',
  'an.bb.c2.b':
    'The green trace is the clean message $m(t)$; the orange trace adds bandlimited noise. Lower the channel SNR $\\gamma$ and the message is buried.',

  // §6.1.2 DSB-SC
  'an.dsb.c1.t': 'Coherent demodulation',
  'an.dsb.c1.b':
    'Multiplying $r(t)$ by $\\cos\\omega_c t$ and lowpass filtering recovers $\\tfrac12 A_c m(t)$ and rejects the quadrature noise $n_s(t)$.',
  'an.dsb.c2.t': 'No SNR penalty',
  'an.dsb.c2.b':
    'DSB-SC delivers exactly the baseline SNR (0 dB demod gain), at the cost of $2W$ channel bandwidth.',

  // §6.1.3 SSB
  'an.ssb.c1.t': 'Single sideband',
  'an.ssb.c1.b':
    'SSB sends one sideband, $u(t)=A_c[m\\cos\\omega_c t\\mp\\hat m\\sin\\omega_c t]$. Coherent demodulation recovers $m(t)$.',
  'an.ssb.c2.t': 'Same SNR, half the band',
  'an.ssb.c2.b':
    'Output SNR equals the baseline just like DSB-SC, but SSB needs only $W$ — half the bandwidth. Preferred on bandwidth-critical links.',

  // §6.1.4 Conventional AM
  'an.cam.c1.t': 'Envelope detection',
  'an.cam.c1.b':
    'A diode-and-RC envelope detector recovers the message without a coherent carrier — the cheap receiver that made broadcast AM possible.',
  'an.cam.c2.t': 'Power efficiency $\\eta<1$',
  'an.cam.c2.b':
    'The transmitted carrier carries no message, so power is wasted and the output SNR is always below baseline by the efficiency $\\eta$.',
  'an.cam.c3.t': 'Threshold effect',
  'an.cam.c3.b':
    'At low $\\gamma$ the envelope detector mixes signal and noise non-linearly and the output collapses — it only works well above threshold.',

  // §6.2 Noise PSD & SNR
  'an.psd.c1.t': 'Why FM beats baseband',
  'an.psd.c1.b':
    'FM output-noise PSD is parabolic, $N_0 f^2/A_c^2$ — high audio frequencies suffer most; PM noise is flat. FM gains $3\\beta^2 P_{M_n}$, PM gains $\\beta^2 P_{M_n}$ (FM is 3×, ≈ +4.8 dB).',
  'an.psd.c2.t': 'Wideband trade',
  'an.psd.c2.b':
    'SNR climbs as $\\beta^2$ — about +6 dB per doubling of $\\beta$ — bought with the Carson bandwidth $2(\\beta+1)W$.',

  // §6.2.1 Threshold
  'an.thr.c1.t': 'The threshold knee',
  'an.thr.c1.b':
    'Above $\\gamma_{th}=20(\\beta+1)$ the FM SNR rides the straight high-SNR line; below it the discriminator produces clicks and the SNR collapses.',
  'an.thr.c2.t': 'Design rule',
  'an.thr.c2.b':
    'Larger $\\beta$ gives more gain but a higher threshold. Pick the largest $\\beta$ that still satisfies $\\gamma\\ge 20(\\beta+1)$.',

  // §6.2.2 Pre/De-emphasis
  'an.emph.c1.t': 'Pre/de-emphasis pair',
  'an.emph.c1.b':
    'Pre-emphasis boosts high frequencies at the transmitter; de-emphasis $H_d(f)=1/(1+jf/f_1)$ cuts them at the receiver, restoring the message while attenuating the parabolic FM noise.',
  'an.emph.c2.t': 'Roughly +13 dB',
  'an.emph.c2.b':
    'With $\\tau=75\\,\\mu s$ ($f_1\\approx2122$ Hz) and $W=15$ kHz the pair adds about +13 dB of SNR (Eq. 6.2.42).',

  // §6.3 Comparison
  'an.cmp.c1.t': 'Linear schemes',
  'an.cmp.c1.b':
    'SSB and DSB-SC match the baseline SNR; SSB does it in half the band. Conventional AM stays below baseline ($\\eta<1$) but uses the simplest receiver.',
  'an.cmp.c2.t': 'Angle schemes',
  'an.cmp.c2.b':
    'FM and PM climb as $\\beta^2$ above threshold, trading the wide Carson band $2(\\beta+1)W$ for noise immunity — FM is 3× PM at equal $\\beta$.',

  // §6.4.1 Thermal noise
  'an.thermal.c1.t': 'Thermal noise floor',
  'an.thermal.c1.b':
    'Every resistor at temperature $T$ emits white noise of one-sided PSD $N_0=kT$; in bandwidth $B$ the available power is $P_n=kTB$.',
  'an.thermal.c2.t': 'The −174 dBm/Hz floor',
  'an.thermal.c2.b':
    'At the reference $T_0=290$ K, $N_0\\approx4\\times10^{-21}$ W/Hz (−174 dBm/Hz) — the noise floor every receiver fights.',

  // §6.4.2 Noise figure & Friis
  'an.figure.c1.t': 'Noise figure $F$',
  'an.figure.c1.b':
    '$F=1+T_e/T_0$ measures how much a stage degrades SNR; an ideal noiseless amplifier has $F=1$ (0 dB).',
  'an.figure.c2.t': 'First stage dominates',
  'an.figure.c2.b':
    'In a cascade the total figure is set mostly by stage 1, so the front end should be a low-noise, high-gain amplifier.',

  // §6.4.3 Path loss
  'an.pathloss.c1.t': 'Free-space loss',
  'an.pathloss.c1.b':
    'Free-space loss grows as the square of distance and frequency — about +6 dB for every doubling of $d$.',
  'an.pathloss.c2.t': 'Cable vs radio',
  'an.pathloss.c2.b':
    'A wireline cable loses a fixed dB per km, so its loss is linear in length. Received power is $P_R=P_T-L$.',

  // §6.4.4 Repeaters
  'an.rep.c1.t': 'Repeaters fight loss',
  'an.rep.c1.b':
    'An amplifier on every segment offsets the path loss so long links stay feasible.',
  'an.rep.c2.t': 'Analog noise accumulates',
  'an.rep.c2.b':
    'Each analog hop adds its own noise: the end-to-end SNR degrades as $-10\\log_{10}K$ (about −3 dB per doubling of the segment count $K$).',
  'an.rep.c3.t': 'Digital regeneration',
  'an.rep.c3.b':
    'Digital regenerative repeaters detect and retransmit clean bits, so noise does not pile up across hops.',
};
