import { Task } from '../types';

export interface ParsedTaskNumber {
  root: string;
  isSubtask: boolean;
  subIndex?: string;
}

/**
 * Parses task number string to identify parent-child relationships.
 * E.g.:
 *  "2"     -> { root: "2", isSubtask: false }
 *  "2.0"   -> { root: "2", isSubtask: false }
 *  "2.1"   -> { root: "2", isSubtask: true, subIndex: "1" }
 *  "2.2"   -> { root: "2", isSubtask: true, subIndex: "2" }
 *  "6.1"   -> { root: "6", isSubtask: true, subIndex: "1" }
 *  "3.3.1" -> { root: "3", isSubtask: true, subIndex: "3.1" }
 */
export function parseTaskNumber(numStr?: string): ParsedTaskNumber {
  if (!numStr) return { root: '', isSubtask: false };
  const trimmed = String(numStr).trim();

  // Match e.g. "2.1", "2.2", "15.3", "3.3.1"
  const subMatch = trimmed.match(/^(\d+)\.([1-9].*)$/);
  if (subMatch) {
    return {
      root: subMatch[1],
      isSubtask: true,
      subIndex: subMatch[2],
    };
  }

  // Match e.g. "2", "2.0", "15.0"
  const rootMatch = trimmed.match(/^(\d+)(?:\.0+)?$/);
  if (rootMatch) {
    return {
      root: rootMatch[1],
      isSubtask: false,
    };
  }

  return { root: trimmed, isSubtask: false };
}

export type HierarchyRenderItem = 
  | {
      type: 'parent';
      task: Task;
      groupKey: string;
      subtasks: Task[];
      isExpanded: boolean;
    }
  | {
      type: 'subtask';
      task: Task;
      parentTask: Task;
      groupKey: string;
    }
  | {
      type: 'standalone';
      task: Task;
    };

/**
 * Builds the list of items to render in the table respecting expansion state.
 * When collapsed (default), subtasks are hidden under the parent.
 * When expanded, subtasks are rendered directly beneath the parent.
 */
export function getHierarchyRenderItems(
  tasks: Task[],
  expandedGroupKeys: Set<string>
): {
  renderItems: HierarchyRenderItem[];
  parentGroupKeys: string[];
  totalSubtasksCount: number;
} {
  const subtasksMap = new Map<string, Task[]>();
  const parentMap = new Map<string, Task>();

  // Pass 1: map parents and subtasks by campaign and root number
  tasks.forEach((task) => {
    const parsed = parseTaskNumber(task.taskNumber);
    const key = `${task.campaign}:::${parsed.root}`;

    if (parsed.isSubtask) {
      if (!subtasksMap.has(key)) {
        subtasksMap.set(key, []);
      }
      subtasksMap.get(key)!.push(task);
    } else {
      parentMap.set(key, task);
    }
  });

  const parentGroupKeys: string[] = [];
  let totalSubtasksCount = 0;

  subtasksMap.forEach((subtasks, key) => {
    if (parentMap.has(key) && subtasks.length > 0) {
      parentGroupKeys.push(key);
      totalSubtasksCount += subtasks.length;
    }
  });

  // Pass 2: assemble ordered render items
  const renderItems: HierarchyRenderItem[] = [];
  const renderedSubtaskIds = new Set<string>();

  tasks.forEach((task) => {
    const parsed = parseTaskNumber(task.taskNumber);
    const key = `${task.campaign}:::${parsed.root}`;
    const subtasks = subtasksMap.get(key) || [];

    // Is this a parent task with at least one subtask?
    if (!parsed.isSubtask && subtasks.length > 0) {
      const isExpanded = expandedGroupKeys.has(key);
      renderItems.push({
        type: 'parent',
        task,
        groupKey: key,
        subtasks,
        isExpanded,
      });

      // If expanded, insert subtasks right below parent
      if (isExpanded) {
        subtasks.forEach((st) => {
          renderItems.push({
            type: 'subtask',
            task: st,
            parentTask: task,
            groupKey: key,
          });
          renderedSubtaskIds.add(st.id);
        });
      }
    } else if (parsed.isSubtask) {
      // If this subtask belongs to a parent that exists in the list
      if (parentMap.has(key)) {
        // If parent was expanded, it was already inserted above
        // If parent is collapsed, it is hidden
        // Either way, do not render again here
      } else {
        // Orphan subtask (parent not in filtered list): render as standalone
        if (!renderedSubtaskIds.has(task.id)) {
          renderItems.push({
            type: 'standalone',
            task,
          });
        }
      }
    } else {
      // Normal standalone task without subtasks
      renderItems.push({
        type: 'standalone',
        task,
      });
    }
  });

  return {
    renderItems,
    parentGroupKeys,
    totalSubtasksCount,
  };
}
