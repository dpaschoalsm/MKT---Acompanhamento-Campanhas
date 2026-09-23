/**
 * Utility functions for date parsing, formatting and Excel-style task date math.
 */

// Month full names in Portuguese
export const PT_FULL_MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// Month abbreviations in Portuguese (kept for compatibility)
const PT_MONTHS = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez'
];

/**
 * Format a YYYY-MM-DD string to DD/MM/YYYY
 */
export function formatDateToBR(dateStr?: string | null): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  return dateStr;
}

/**
 * Parse DD/MM/YYYY or YYYY-MM-DD to a standard Date object (UTC safe)
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  if (dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/').map(Number);
    if (!day || !month || !year) return null;
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }

  if (dateStr.includes('-')) {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }

  return null;
}

/**
 * Format standard Date object to YYYY-MM-DD
 */
export function toISOFormat(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calculate month label in format "Setembro/26" based on a date (e.g. 2026-09-02 -> "Setembro/26")
 */
export function getMonthAbbr(dateStr: string): string {
  const date = parseDate(dateStr);
  if (!date) return '';
  const monthIdx = date.getUTCMonth();
  const yearShort = String(date.getUTCFullYear()).slice(-2);
  return `${PT_FULL_MONTHS[monthIdx]}/${yearShort}`;
}

export function getFullMonthLabel(dateStr: string): string {
  return getMonthAbbr(dateStr);
}

/**
 * Automatically calculate DT. FINAL given DT. INÍCIO and DURAÇÃO
 * As seen in spreadsheet:
 * 02/09/2026 with 15 days duration -> 16/09/2026 (day 1 is 02/09, day 15 is 16/09)
 * 02/09/2026 with 3 days duration -> 04/09/2026
 */
export function calculateEndDate(startDateStr: string, durationDays: number): string {
  if (!startDateStr) return startDateStr;
  const numDays = typeof durationDays === 'number' ? durationDays : parseInt(String(durationDays).replace(/[^0-9]/g, ''), 10) || 1;
  if (numDays <= 0) return startDateStr;
  const start = parseDate(startDateStr);
  if (!start) return startDateStr;

  const daysToAdd = Math.max(0, numDays - 1);
  const end = new Date(start.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  return toISOFormat(end);
}

/**
 * Calculate DIAS (+/-)
 * Difference between CONCLUSÃO and DT. FINAL
 * e.g. DT. FINAL = 16/09/2026, CONCLUSÃO = 14/09/2026 => -2 days
 * e.g. DT. FINAL = 16/09/2026, CONCLUSÃO = 18/09/2026 => +2 days
 */
export function calculateDiffDays(completionDateStr?: string | null, endDateStr?: string | null): number | null {
  if (!completionDateStr || !endDateStr) return null;
  const comp = parseDate(completionDateStr);
  const end = parseDate(endDateStr);
  if (!comp || !end) return null;

  const diffMs = comp.getTime() - end.getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  return diffDays;
}

/**
 * Format difference days for display:
 * -2 -> "-2"
 * +2 -> "+2"
 * 0  -> "0"
 */
export function formatDiffDays(diff?: number | null): string {
  if (diff === undefined || diff === null) return '';
  if (diff > 0) return `+${diff}`;
  return String(diff);
}

/**
 * Automatically determine if an in-progress task is overdue
 */
export function isTaskOverdue(endDateStr?: string | null, status?: string): boolean {
  if (status === 'Concluído' || status === 'Cancelado') return false;
  if (!endDateStr) return false;
  const end = parseDate(endDateStr);
  if (!end) return false;

  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0));
  return end.getTime() < todayUtc.getTime();
}

/**
 * Normalizes short month labels like "set/26", "out/26" to full format "Setembro/26", "Outubro/26"
 */
export function normalizeMonthLabel(monthStr?: string): string {
  if (!monthStr) return '';
  const lower = monthStr.trim().toLowerCase();
  
  // Mapping of common abbreviations to full names
  const abbrevMap: Record<string, string> = {
    'jan': 'Janeiro',
    'fev': 'Fevereiro',
    'mar': 'Março',
    'abr': 'Abril',
    'mai': 'Maio',
    'jun': 'Junho',
    'jul': 'Julho',
    'ago': 'Agosto',
    'set': 'Setembro',
    'out': 'Outubro',
    'nov': 'Novembro',
    'dez': 'Dezembro'
  };

  const parts = lower.split('/');
  if (parts.length === 2) {
    const [prefix, year] = parts;
    const fullName = abbrevMap[prefix];
    if (fullName) {
      return `${fullName}/${year}`;
    }
  }

  // If already full name or capitalized, format properly
  const matchedIndex = PT_FULL_MONTHS.findIndex((m) => lower.startsWith(m.toLowerCase()));
  if (matchedIndex >= 0) {
    const parts = monthStr.split('/');
    if (parts.length === 2) {
      return `${PT_FULL_MONTHS[matchedIndex]}/${parts[1]}`;
    }
  }

  return monthStr;
}
