import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { FourierModule } from '@/modules/fourier/FourierModule';

function renderModule() {
  return render(
    <MemoryRouter initialEntries={['/signals']}>
      <Routes>
        <Route path="/signals" element={<FourierModule />} />
        <Route path="/signals/:tab" element={<FourierModule />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('FourierModule tabs', () => {
  it('renders 6 tabs and defaults to Basic Signals', () => {
    renderModule();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(6);
    expect(screen.getByRole('tab', { name: /Basic Signals/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('switches to the Bandpass Signals tab', () => {
    renderModule();
    fireEvent.click(screen.getByRole('tab', { name: /Bandpass Signals/i }));
    expect(screen.getByRole('tab', { name: /Bandpass Signals/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
