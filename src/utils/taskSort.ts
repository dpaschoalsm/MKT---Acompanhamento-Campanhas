import { Task } from '../types';
import { parseMonthToNumber } from './monthUtils';

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
 * Computes the next suggested task number for a given company and campaign.
 * Finds the maximum root number among existing tasks in that campaign and returns max + 1.
 * Example: if Revisão DPaschoal has tasks up to 16, returns '17'.
 */
export function getNextTaskNumberForCampaign(tasks: Task[], company: string, campaign: string): string {
  const matching = tasks.filter(
    (t) => (!company || t.company === company) && t.campaign === campaign
  );
  if (matching.length === 0) return '1';

  let maxRoot = 0;
  for (const t of matching) {
    const m = String(t.taskNumber || '').trim().match(/^(\d+)/);
    if (m) {
      const val = parseInt(m[1], 10);
      if (!isNaN(val) && val > maxRoot) {
        maxRoot = val;
      }
    }
  }

  return String(maxRoot + 1);
}

/**
 * Gets the predominant month for a company's campaign (e.g. 'Outubro/26' for Revisão DPaschoal).
 */
export function getCampaignDefaultMonth(tasks: Task[], company: string, campaign: string): string {
  const matching = tasks.filter(
    (t) => (!company || t.company === company) && t.campaign === campaign
  );
  if (matching.length === 0) return 'Outubro/26';

  const counts = new Map<string, number>();
  for (const t of matching) {
    if (t.month) {
      counts.set(t.month, (counts.get(t.month) || 0) + 1);
    }
  }

  let topMonth = 'Outubro/26';
  let maxCount = 0;
  for (const [m, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      topMonth = m;
    }
  }

  return topMonth;
}

/**
 * Gets a suggested start date for a newly created task in a company and campaign.
 */
export function getCampaignDefaultDate(tasks: Task[], company: string, campaign: string): string {
  const matching = tasks.filter(
    (t) => (!company || t.company === company) && t.campaign === campaign
  );
  if (matching.length > 0) {
    const validDates = matching
      .map((t) => t.startDate)
      .filter((d) => Boolean(d) && /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort();
    if (validDates.length > 0) {
      return validDates[validDates.length - 1];
    }
  }

  // Derive from month if possible
  const monthStr = getCampaignDefaultMonth(tasks, company, campaign);
  const mNum = parseMonthToNumber(monthStr);
  if (mNum > 200000) {
    const year = Math.floor(mNum / 100);
    const month = mNum % 100;
    return `${year}-${String(month).padStart(2, '0')}-01`;
  }

  return '2026-10-01';
}

/**
 * Sorts tasks in canonical order:
 * 1. Company (DPaschoal, DPK, AutoZ)
 * 2. Campaign (Chronological order of campaign timeline: e.g. Outubro/26 < Novembro/26 < Dezembro/26)
 * 3. Natural Task Number (1, 2, 2.1, 2.2, 3, ..., 9, 10, 15.6, 16, 17)
 * 4. Start Date (chronological)
 * 5. ID Number (e.g. dp-1 < dp-2 < dp-10)
 */
export function sortTasks(tasks: Task[], campaignsOrder?: string[]): Task[] {
  // Precompute earliest chronological month number per company + campaign
  const compCampMonthMap = new Map<string, number>();
  for (const t of tasks) {
    const key = `${t.company}:::${t.campaign}`;
    const mNum = parseMonthToNumber(t.month, t.startDate);
    const existing = compCampMonthMap.get(key);
    if (existing === undefined || mNum < existing) {
      compCampMonthMap.set(key, mNum);
    }
  }

  return [...tasks].sort((a, b) => {
    // 1. Company
    if (a.company !== b.company) {
      return String(a.company).localeCompare(String(b.company));
    }

    // 2. Campaign (Chronological order of campaign timeline)
    if (a.campaign !== b.campaign) {
      const keyA = `${a.company}:::${a.campaign}`;
      const keyB = `${b.company}:::${b.campaign}`;
      const monthA = compCampMonthMap.get(keyA) || 0;
      const monthB = compCampMonthMap.get(keyB) || 0;

      if (monthA !== monthB) {
        return monthA - monthB;
      }

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

    // 3. Task Number (natural hierarchical order inside the campaign: 1, 2, 2.1 ... 16, 17)
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

