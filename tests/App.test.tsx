import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from '@/App';

describe('App shell', () => {
  it('shows the brand mark and a Modules button but no module links in the top bar', () => {
    render(<App />);
    const nav = screen.getByRole('navigation');
    expect(within(nav).getByRole('img', { name: 'CommSysLab' })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /Modules/i })).toBeInTheDocument();
    // Scope to the nav: landing cards below still link modules, but the BAR must not.
    expect(within(nav).queryByRole('link', { name: /Random Processes/i })).toBeNull();
  });

  it('opens the module menu overlay when the Modules button is clicked', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Modules/i }));
    const menu = screen.getByRole('menu');
    expect(within(menu).getByRole('link', { name: /Signals & Spectra/i })).toHaveAttribute(
      'href',
      '/signals',
    );
    expect(within(menu).getByRole('link', { name: /Noise in Analog Systems/i })).toHaveAttribute(
      'href',
      '/analog-noise',
    );
  });
});
