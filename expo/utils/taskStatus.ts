import { Task } from '@/types';

export const TASK_STATUS_ORDER: Task['status'][] = ['todo', 'in-progress', 'done'];

export function getNextTaskStatus(current: Task['status']): Task['status'] {
  const index = TASK_STATUS_ORDER.indexOf(current);
  if (index === -1 || index === TASK_STATUS_ORDER.length - 1) {
    return TASK_STATUS_ORDER[0];
  }
  return TASK_STATUS_ORDER[index + 1];
}

export function getPreviousTaskStatus(current: Task['status']): Task['status'] {
  const index = TASK_STATUS_ORDER.indexOf(current);
  if (index <= 0) {
    return TASK_STATUS_ORDER[TASK_STATUS_ORDER.length - 1];
  }
  return TASK_STATUS_ORDER[index - 1];
}

export function getTaskStatusIndex(status: Task['status']): number {
  const index = TASK_STATUS_ORDER.indexOf(status);
  return index === -1 ? 0 : index;
}