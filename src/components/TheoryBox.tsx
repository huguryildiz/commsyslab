import type { ReactNode } from 'react';

export interface TheoryBoxProps {
  title?: string;
  children: ReactNode;
}

export function TheoryBox({ title = 'Theory', children }: TheoryBoxProps) {
  return (
    <details className="theory-box">
      <summary>{title}</summary>
      <div className="theory-box__body">{children}</div>
    </details>
  );
}
