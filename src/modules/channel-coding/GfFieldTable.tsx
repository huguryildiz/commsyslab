import { type GF, gfAdd, gfMul, elemToBits } from '@/lib/dsp/gf2m';
import { polyToString } from '@/lib/dsp/cyclic';
import { t } from '@/i18n';

const SUP = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
const sup = (n: number): string =>
  String(n)
    .split('')
    .map((d) => SUP[+d])
    .join('');

/** Render a field element int as "αⁱ" using the log table (0 → "0", 1 → "1"). */
const alphaLabel = (f: GF, x: number): string =>
  x === 0 ? '0' : x === 1 ? '1' : `α${sup(f.log[x])}`;

export function GfFieldTable({ field, a, b }: { field: GF; a: number; b: number }) {
  const sum = gfAdd(a, b);
  const prod = gfMul(field, a, b);
  const rowCls = (x: number): string =>
    x === sum || x === prod ? 'cc-gf-res' : x === a ? 'cc-gf-a' : x === b ? 'cc-gf-b' : '';

  return (
    <div>
      <table className="cc-gf-table">
        <thead>
          <tr>
            <th>i</th>
            <th>αⁱ (int)</th>
            <th>binary</th>
            <th>polynomial</th>
          </tr>
        </thead>
        <tbody>
          {field.exp.map((x, i) => (
            <tr key={i} className={rowCls(x)}>
              <td>{i}</td>
              <td>{x}</td>
              <td>{elemToBits(x, field.m).slice().reverse().join('')}</td>
              <td>{polyToString(elemToBits(x, field.m))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="cc-gf-ops">
        <span>
          {t('cc.gf.sum')} = <b>{alphaLabel(field, sum)}</b> ({sum})
        </span>
        <span>
          {t('cc.gf.prod')} = <b>{alphaLabel(field, prod)}</b> ({prod})
        </span>
      </div>
    </div>
  );
}
