// Channel Capacity & Coding module strings (Proakis Ch. 9). UI content — user-facing.
export const channelcoding: Record<string, string> = {
  'cc.title': 'Channel Capacity & Coding',
  'cc.subtitle':
    'Channel models, mutual information, capacity, and the Shannon limit — Proakis Ch 9',
  'cc.tab.channels': 'Channels & Capacity',
  'cc.tab.shannon': 'Shannon Limit',
  'cc.theory': 'Theory',

  // Tab 1 — Channels & Capacity
  'cc.ch.title': 'Channel model',
  'cc.ch.kind': 'Channel type',
  'cc.ch.bsc': 'BSC',
  'cc.ch.bec': 'Erasure (BEC)',
  'cc.ch.awgn': 'AWGN (hard)',
  'cc.ch.eps': 'Crossover ε',
  'cc.ch.perase': 'Erasure prob p',
  'cc.ch.ebn0': 'Eb/N₀',
  'cc.ch.epsInduced': 'Induced ε = Q(√(2Eb/N₀))',
  'cc.ch.px0': 'Input P(X=0)',
  'cc.ch.readouts': 'Information measures',
  'cc.ch.capacity': 'Capacity C',
  'cc.ch.diagram': 'Transition diagram p(y|x)',
  'cc.ch.micurve': 'I(X;Y) vs input distribution',
  'cc.ch.softhard': 'Soft vs hard-decision capacity',

  // Tab 2 — Shannon Limit
  'cc.sh.title': 'Bandwidth & power',
  'cc.sh.ebn0': 'Eb/N₀',
  'cc.sh.r': 'Spectral eff. log₁₀ r',
  'cc.sh.targetBer': 'Overlay target BER',
  'cc.sh.overlay': 'Show modulation overlay',
  'cc.sh.gap': 'Gap to bound',
  'cc.sh.cvw': 'Capacity vs bandwidth (Fig. 9.10)',
  'cc.sh.plane': 'Spectral efficiency vs Eb/N₀ (Fig. 9.11)',
};
