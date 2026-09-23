/**
 * Portuguese month utilities for chronological parsing and sorting.
 */

export const PT_FULL_MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
] as const;

export const MONTH_NAMES_MAP: Record<string, number> = {
  jan: 1, janeiro: 1,
  fev: 2, fevereiro: 2,
  mar: 3, marco: 3, março: 3,
  abr: 4, abril: 4,
  mai: 5, maio: 5,
  jun: 6, junho: 6,
  jul: 7, julho: 7,
  ago: 8, agosto: 8,
  set: 9, setembro: 9,
  out: 10, outubro: 10,
  nov: 11, novembro: 11,
  dez: 12, dezembro: 12
};

/**
 * Parses a month string like "Outubro/26", "Setembro/26", "10/2026", "2026-10" into
 * a numeric YYYYMM integer (e.g. 202610, 202609) for chronological comparison.
 */
export function parseMonthToNumber(monthStr?: string, fallbackDate?: string): number {
  if (!monthStr && fallbackDate) {
    const parts = fallbackDate.split('-');
    if (parts.length >= 2) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(y) && !isNaN(m)) return y * 100 + m;
    }
  }
  if (!monthStr) return 0;

  const clean = String(monthStr).trim().toLowerCase();
  let month = 0;
  let year = 2026;

  if (clean.includes('/')) {
    const parts = clean.split('/').map((p) => p.trim());
    const mPart = parts[0];
    const yPart = parts[1];

    const numericM = parseInt(mPart, 10);
    if (!isNaN(numericM) && numericM >= 1 && numericM <= 12) {
      month = numericM;
    } else {
      for (const [key, val] of Object.entries(MONTH_NAMES_MAP)) {
        if (mPart.startsWith(key)) {
          month = val;
          break;
        }
      }
    }

    const yNum = parseInt(yPart, 10);
    if (!isNaN(yNum)) {
      year = yNum < 100 ? 2000 + yNum : yNum;
    }
  } else if (clean.includes('-')) {
    const parts = clean.split('-').map((p) => p.trim());
    if (parts.length >= 2) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      if (p0 > 1000) {
        year = p0;
        month = p1;
      }
    }
  } else {
    for (const [key, val] of Object.entries(MONTH_NAMES_MAP)) {
      if (clean.startsWith(key)) {
        month = val;
        break;
      }
    }
  }

  return year * 100 + month;
}

/**
 * Compares two month strings chronologically (e.g. Setembro/26 < Outubro/26 < Novembro/26 < Dezembro/26).
 */
export function compareMonthsChronological(
  monthA?: string,
  monthB?: string,
  fallbackDateA?: string,
  fallbackDateB?: string
): number {
  const numA = parseMonthToNumber(monthA, fallbackDateA);
  const numB = parseMonthToNumber(monthB, fallbackDateB);

  if (numA !== numB) {
    return numA - numB;
  }

  return String(monthA || '').localeCompare(String(monthB || ''), 'pt-BR');
}

/**
 * Sorts a list of month strings in chronological order.
 */
export function sortMonthsChronological(months: string[]): string[] {
  return [...months].sort((a, b) => compareMonthsChronological(a, b));
}
