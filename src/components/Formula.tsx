import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export interface FormulaProps {
  /** LaTeX source. */
  tex: string;
  block?: boolean;
}

export function Formula({ tex, block = false }: FormulaProps) {
  const html = useMemo(
    () => katex.renderToString(tex, { displayMode: block, throwOnError: false }),
    [tex, block],
  );
  return (
    <span
      className={block ? 'formula formula--block' : 'formula'}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
