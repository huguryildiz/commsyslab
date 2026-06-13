import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SamplingModule } from '@/modules/sampling/SamplingModule';

describe('SamplingModule', () => {
  it('renders controls, panels, and key readouts', () => {
    render(<SamplingModule />);
    // four Canvas panels (role=img via the Canvas wrapper)
    expect(screen.getAllByRole('img').length).toBeGreaterThanOrEqual(4);
    // unique plain-text readout labels (avoid KaTeX/duplicate "Nyquist"/"SQNR" matches)
    expect(screen.getByText('Bandwidth W')).toBeInTheDocument();
    expect(screen.getByText('SQNR (theory)')).toBeInTheDocument();
    // the regime value is reported; default fs=20 with W=2 is oversampling
    expect(screen.getByText('Oversampling')).toBeInTheDocument();
  });
});
