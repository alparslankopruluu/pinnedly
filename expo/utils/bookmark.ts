import { BookmarkSource } from '@/types';
import i18n from '@/lib/i18n';

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

export function extractUrlFromText(text: string): string | undefined {
  const match = text.match(URL_REGEX);
  return match?.[0]?.replace(/[.,;:!?)]+$/, '');
}

export function tagsToTagNames(tags: { name: string }[]): string[] {
  return [...new Set(tags.map((t) => t.name.trim().toLowerCase()).filter(Boolean))];
}

export function tagNamesToTags(names: string[]): { id: string; name: string }[] {
  return names.map((name) => ({ id: name, name }));
}

export function isUnreadBookmark(bookmark: {
  status?: string;
  openCount: number;
}): boolean {
  return bookmark.status === 'inbox' || bookmark.openCount === 0;
}

export function getSourceLabel(source: BookmarkSource): string {
  return i18n.t(`sources.${source}`);
}