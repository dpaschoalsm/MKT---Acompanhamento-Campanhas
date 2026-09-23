/**
 * Utilities for splitting and joining multi-selected names and sectors.
 * Preserves compound names with 'e' such as "Digital e Social" and "Branding e Comunicação".
 */

export function splitMulti(val?: string | null): string[] {
  if (!val) return [];
  // Split on plus (+), comma (,), or forward slash (/), but NOT on 'e'
  return val
    .split(/\s*(?:\+|,|\/)\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinMulti(items: string[]): string {
  if (!items || items.length === 0) return '';
  return items.filter(Boolean).join(' + ');
}
