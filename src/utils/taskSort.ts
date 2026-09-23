import { Task } from '../types';

/**
 * Extracts numeric sequence from taskNumber, e.g.:
 * "1"      -> [1]
 * "2"      -> [2]
 * "2.1"    -> [2, 1]
 * "2.2"    -> [2, 2]
 * "2.10"   -> [2, 10]
 * "3.3.1"  -> [3, 3, 1]
 * "16"     -> [16]
 */
export function parseTaskNumberParts(numStr?: string): number[] {
  if (!numStr) return [];
  const clean = String(numStr).trim().replace(/[^\d.]/g, '');
  if (!clean) return [];

  const parts = clean.split('.');
  const numbers: number[] = [];
  for (const part of parts) {
    if (part === '') continue;
    const n = parseInt(part, 10);
    if (!isNaN(n)) {
      numbers.push(n);
    }
  }
  return numbers;
}

/**
 * Compares two task numbers naturally (e.g. 1, 2, 2.1, 2.2, 3 ... 9, 10, 16).
 * Handles numbers naturally instead of standard lexicographical order.
 */
export function compareTaskNumbers(aStr?: string, bStr?: string): number {
  const partsA = parseTaskNumberParts(aStr);
  const partsB = parseTaskNumberParts(bStr);

  // If both have numeric parts, compare part by part
  if (partsA.length > 0 && partsB.length > 0) {
    const maxLen = Math.max(partsA.length, partsB.length);
    for (let i = 0; i < maxLen; i++) {
      const valA = partsA[i];
      const valB = partsB[i];

      // E.g. "2" vs "2.1": parent "2" must come before subtask "2.1"
      if (valA === undefined && valB !== undefined) return -1;
      if (valA !== undefined && valB === undefined) return 1;

      if (valA !== undefined && valB !== undefined && valA !== valB) {
        return valA - valB;
      }
    }
    return 0;
  }

  // If only one has numeric parts, numeric comes first
  if (partsA.length > 0 && partsB.length === 0) return -1;
  if (partsA.length === 0 && partsB.length > 0) return 1;

  // Fallback to natural string comparison
  return String(aStr || '').localeCompare(String(bStr || ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

/**
 * Extracts numeric ID suffix, e.g. "dp-25" -> 25
 */
export function extractIdNumber(id?: string): number {
  if (!id) return 0;
  const match = String(id).match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Sorts tasks in canonical order:
 * 1. Company (DPaschoal, DPK, AutoZ)
 * 2. Campaign (respecting campaign order if provided)
 * 3. Natural Task Number (1, 2, 2.1, 2.2, 3, ..., 9, 10, 16)
 * 4. Start Date
 * 5. ID Number (e.g. dp-1 < dp-2 < dp-10)
 */
export function sortTasks(tasks: Task[], campaignsOrder?: string[]): Task[] {
  return [...tasks].sort((a, b) => {
    // 1. Company
    if (a.company !== b.company) {
      return String(a.company).localeCompare(String(b.company));
    }

    // 2. Campaign
    if (a.campaign !== b.campaign) {
      if (campaignsOrder && campaignsOrder.length > 0) {
        const idxA = campaignsOrder.indexOf(a.campaign);
        const idxB = campaignsOrder.indexOf(b.campaign);
        if (idxA !== -1 && idxB !== -1) {
          if (idxA !== idxB) return idxA - idxB;
        } else if (idxA !== -1) {
          return -1;
        } else if (idxB !== -1) {
          return 1;
        }
      }
      const campComp = String(a.campaign).localeCompare(String(b.campaign));
      if (campComp !== 0) return campComp;
    }

    // 3. Task Number (natural hierarchical order)
    const numComp = compareTaskNumbers(a.taskNumber, b.taskNumber);
    if (numComp !== 0) return numComp;

    // 4. Start Date (chronological)
    if (a.startDate && b.startDate && a.startDate !== b.startDate) {
      return a.startDate.localeCompare(b.startDate);
    }

    // 5. ID Number (e.g. dp-1 < dp-2 < dp-10)
    const idA = extractIdNumber(a.id);
    const idB = extractIdNumber(b.id);
    if (idA !== idB) return idA - idB;

    return String(a.id).localeCompare(String(b.id));
  });
}
