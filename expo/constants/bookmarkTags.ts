export const BOOKMARK_TAG_SUGGESTIONS = [
  { value: 'ai', translationKey: 'ai' },
  { value: 'work', translationKey: 'work' },
  { value: 'technology', translationKey: 'technology' },
  { value: 'mobile', translationKey: 'mobile' },
  { value: 'games', translationKey: 'games' },
  { value: 'art', translationKey: 'art' },
  { value: 'social-media', translationKey: 'socialMedia' },
  { value: 'home', translationKey: 'home' },
  { value: 'school', translationKey: 'school' },
  { value: 'study', translationKey: 'study' },
  { value: 'music', translationKey: 'music' },
  { value: 'video', translationKey: 'video' },
  { value: 'personal', translationKey: 'personal' },
  { value: 'research', translationKey: 'research' },
  { value: 'travel', translationKey: 'travel' },
] as const;

export type SuggestedBookmarkTag = (typeof BOOKMARK_TAG_SUGGESTIONS)[number];

const SUGGESTION_BY_VALUE = new Map<string, SuggestedBookmarkTag>(
  BOOKMARK_TAG_SUGGESTIONS.map((suggestion) => [suggestion.value, suggestion])
);

export function normalizeBookmarkTag(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

export function getBookmarkTagTranslationKey(value: string): string | null {
  const suggestion = SUGGESTION_BY_VALUE.get(normalizeBookmarkTag(value).replace(/\s+/g, '-'));
  return suggestion ? `tagSuggestions.${suggestion.translationKey}` : null;
}
