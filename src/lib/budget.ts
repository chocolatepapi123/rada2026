export type Budget = 'Low' | 'Mid' | 'High';
export const BUDGET_OPTIONS: Budget[] = ['Low', 'Mid', 'High'];

/**
 * Maps any stored price value to a Budget level. Understands the current values
 * (Low/Mid/High) and every older format ("$", "$$$", "KES KES", "KES < 1,000", ...).
 * Returns null when the value cannot be interpreted.
 */
export function toBudget(raw?: string | null): Budget | null {
  if (!raw) return null;
  const v = String(raw).trim();
  if (/^low$/i.test(v)) return 'Low';
  if (/^(mid|medium)$/i.test(v)) return 'Mid';
  if (/^high$/i.test(v)) return 'High';

  const dollars = (v.match(/\$/g) || []).length;
  if (dollars > 0) return BUDGET_OPTIONS[Math.min(dollars, 3) - 1];

  if (/\d/.test(v)) {
    if (/<\s*1,?000/.test(v)) return 'Low';
    if (/1,?000\s*-\s*2,?500/.test(v)) return 'Mid';
    if (/2,?500\s*-\s*5,?000|5,?000\+/.test(v)) return 'High';
    return null;
  }
  const kes = (v.match(/KES/gi) || []).length;
  if (kes >= 1 && kes <= 3) return BUDGET_OPTIONS[kes - 1];
  return null;
}
