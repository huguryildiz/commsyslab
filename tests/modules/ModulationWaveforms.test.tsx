import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ModulationModule } from '@/modules/modulation/ModulationModule';

// Mount directly on the Waveforms tab via the URL the module reads from.
function renderWaveforms() {
  return render(
    <MemoryRouter initialEntries={['/modulation/waveforms']}>
      <Routes>
        <Route path="/modulation/:tab" element={<ModulationModule />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Waveforms tab', () => {
  it('renders the bit-stream controls and baseband title', () => {
    renderWaveforms();
    expect(screen.getByText(/BPSK Baseband/)).toBeInTheDocument();
    expect(screen.getByText('1010…')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/type 1s and 0s/i)).toBeInTheDocument();
  });

  it('switching modulation updates the baseband panel title', () => {
    renderWaveforms();
    expect(screen.getByText(/BPSK Baseband/)).toBeInTheDocument();
    const select = screen.getByLabelText('Modulation') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '16qam' } });
    expect(screen.getByText(/16-QAM Baseband/)).toBeInTheDocument();
  });

  it('typing a custom bit pattern is reflected in the bit field', () => {
    renderWaveforms();
    const field = screen.getByPlaceholderText(/type 1s and 0s/i) as HTMLInputElement;
    fireEvent.change(field, { target: { value: '110010' } });
    expect(field.value).toBe('110010');
  });
});
