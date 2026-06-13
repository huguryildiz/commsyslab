import type { ReactNode } from 'react';

export interface PanelProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, children, className }: PanelProps) {
  return (
    <section className={`panel${className ? ` ${className}` : ''}`}>
      {title ? <h3 className="panel__title">{title}</h3> : null}
      {children}
    </section>
  );
}
