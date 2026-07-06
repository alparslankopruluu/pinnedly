export type ContentCategoryId =
  | 'general'
  | 'ai'
  | 'food'
  | 'work'
  | 'personal'
  | 'ideas'
  | 'travel'
  | 'health';

export const DEFAULT_CONTENT_CATEGORY: ContentCategoryId = 'general';

export interface ContentCategoryDef {
  id: ContentCategoryId;
  color: string;
  bgColor: string;
}

export const CONTENT_CATEGORIES: ContentCategoryDef[] = [
  { id: 'general', color: '#6B7280', bgColor: '#F3F4F6' },
  { id: 'ai', color: '#7C3AED', bgColor: '#EDE9FE' },
  { id: 'food', color: '#EA580C', bgColor: '#FFEDD5' },
  { id: 'work', color: '#2563EB', bgColor: '#DBEAFE' },
  { id: 'personal', color: '#059669', bgColor: '#D1FAE5' },
  { id: 'ideas', color: '#D97706', bgColor: '#FEF3C7' },
  { id: 'travel', color: '#0891B2', bgColor: '#CFFAFE' },
  { id: 'health', color: '#E11D48', bgColor: '#FFE4E6' },
];

export function getCategoryDef(id?: ContentCategoryId | null): ContentCategoryDef {
  return CONTENT_CATEGORIES.find((c) => c.id === id) ?? CONTENT_CATEGORIES[0];
}

export function normalizeCategory(id?: string | null): ContentCategoryId {
  if (id && CONTENT_CATEGORIES.some((c) => c.id === id)) {
    return id as ContentCategoryId;
  }
  return DEFAULT_CONTENT_CATEGORY;
}