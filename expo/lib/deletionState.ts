export interface OptimisticDeletion<T> {
  item: T;
  index: number;
}

export function beginPendingDeletion<ID>(pendingIds: Set<ID>, id: ID): boolean {
  if (pendingIds.has(id)) return false;
  pendingIds.add(id);
  return true;
}

export function removeItemOptimistically<T, ID>(
  items: T[],
  id: ID,
  getId: (item: T) => ID
): { items: T[]; deletion: OptimisticDeletion<T> | null } {
  const index = items.findIndex((item) => getId(item) === id);
  if (index < 0) return { items, deletion: null };

  return {
    items: items.filter((_, itemIndex) => itemIndex !== index),
    deletion: { item: items[index], index },
  };
}

export function restoreOptimisticallyDeletedItem<T, ID>(
  items: T[],
  deletion: OptimisticDeletion<T>,
  getId: (item: T) => ID
): T[] {
  if (items.some((item) => getId(item) === getId(deletion.item))) return items;
  const restored = [...items];
  restored.splice(Math.min(deletion.index, restored.length), 0, deletion.item);
  return restored;
}

export function excludePendingDeletions<T, ID>(
  items: T[],
  pendingIds: ReadonlySet<ID>,
  getId: (item: T) => ID
): T[] {
  return items.filter((item) => !pendingIds.has(getId(item)));
}
