import type { BookmarkList } from '@/types';

export function isPublicBookmarkList(list: BookmarkList): boolean {
  return list.visibility === 'public' || list.isPublic;
}

export function upsertBookmarkList(
  lists: BookmarkList[] | undefined,
  list: BookmarkList
): BookmarkList[] {
  return [list, ...(lists ?? []).filter((item) => item.id !== list.id)];
}

export function matchesBookmarkListSearch(list: BookmarkList, query: string): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return false;
  return list.name.toLocaleLowerCase().includes(normalizedQuery) ||
    Boolean(list.description?.toLocaleLowerCase().includes(normalizedQuery));
}
