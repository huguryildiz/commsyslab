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
  it('renders twelve items, live ones as links to their routes', () => {
    renderMenu();
    expect(screen.getAllByRole('listitem')).toHaveLength(12);
    expect(screen.getByRole('link', { name: /Signals & Spectra/i })).toHaveAttribute(
      'href',
      '/signals',
    );
    expect(screen.getByRole('link', { name: /Noise in Analog Systems/i })).toHaveAttribute(
      'href',
      '/analog-noise',
    );
    expect(screen.getByRole('link', { name: /Angle Modulation/i })).toHaveAttribute(
      'href',
      '/analog-fm',
    );
    expect(screen.getByRole('link', { name: /Digital Modulation & Detection/i })).toHaveAttribute(
      'href',
      '/modulation',
    );
    expect(screen.getByRole('link', { name: /Baseband Transmission & ISI/i })).toHaveAttribute(
      'href',
      '/baseband',
    );
    expect(screen.getByRole('link', { name: /End-to-End Link/i })).toHaveAttribute(
      'href',
      '/end-to-end',
    );
  });

  it('marks the active route with aria-current', () => {
    renderMenu('/modulation');
    expect(screen.getByRole('link', { name: /Digital Modulation & Detection/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
