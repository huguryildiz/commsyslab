import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ModuleMenu } from '@/components/ModuleMenu';

function renderMenu(route = '/modulation') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ModuleMenu variant="page" />
    </MemoryRouter>,
  );
}

describe('ModuleMenu', () => {
  it('renders eleven items, live ones as links to their routes', () => {
    renderMenu();
    expect(screen.getAllByRole('listitem')).toHaveLength(11);
    expect(screen.getByRole('link', { name: /Fourier & Spectrum/i })).toHaveAttribute('href', '/fourier');
    expect(screen.getByRole('link', { name: /Analog Noise & SNR/i })).toHaveAttribute('href', '/analog-noise');
    expect(screen.getByRole('link', { name: /Modulation & Detection/i })).toHaveAttribute('href', '/modulation');
    expect(screen.getByRole('link', { name: /End-to-End Link/i })).toHaveAttribute('href', '/end-to-end');
  });

  it('marks the active route with aria-current', () => {
    renderMenu('/modulation');
    expect(screen.getByRole('link', { name: /Modulation & Detection/i })).toHaveAttribute('aria-current', 'page');
  });

  it('renders soon modules as non-interactive (not links)', () => {
    renderMenu();
    expect(screen.getByText('Baseband & Eye')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Baseband & Eye/i })).toBeNull();
  });
});
