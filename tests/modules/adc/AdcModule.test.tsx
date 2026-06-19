import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AdcModule } from '@/modules/sampling-quantization/AdcModule';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/sampling" element={<AdcModule />} />
        <Route path="/sampling/:tab" element={<AdcModule />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdcModule (4-tab shell)', () => {
  it('shows all four top tabs and defaults to Sampling', () => {
    renderAt('/sampling');
    expect(screen.getByRole('tab', { name: 'Sampling' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Quantization' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Waveform Coding' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Source & Media Coding' })).toBeInTheDocument();
    expect(screen.getByText('Bandwidth W')).toBeInTheDocument(); // SamplingSection mounted
  });
  it('mounts the Waveform tab from the URL slug', () => {
    renderAt('/sampling/waveform');
    expect(screen.getByText('PCM bitstream')).toBeInTheDocument();
  });
});
