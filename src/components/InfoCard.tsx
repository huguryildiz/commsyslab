import type { ReactNode } from 'react';

export type InfoCardAccent = 'green' | 'orange' | 'blue';

export interface InfoCardProps {
  /** Card heading (concept name). */
  title: string;
  /** Neon accent for the title underline color. Defaults to green. */
  accent?: InfoCardAccent;
  children: ReactNode;
}

/**
 * Glanceable concept card for a module's interactive surface — a short,
 * plain-language explainer of what the student is seeing, distinct from the
 * deep `<TheoryBox>`. Glass panel + neon accent title, per the design system.
 *
 * Wrap a group of cards in `<div className="info-cards">` for the responsive
 * auto-fill grid.
 */
export function InfoCard({ title, accent = 'green', children }: InfoCardProps) {
  return (
    <div className="info-card">
      <h3 className={`info-card__title info-card__title--${accent}`}>{title}</h3>
      <div className="info-card__body">{children}</div>
    </div>
  );
}
