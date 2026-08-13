import { fetchUrlMetadata, getSourceFromUrl } from '@/utils/metadata';
import { extractUrlFromText } from '@/utils/bookmark';
import { bookmarkRepository } from '@/repositories/BookmarkRepository';
import { sanitizeMetadataDescription, sanitizeSharedText } from '@/utils/sanitizeSharedText';
import { Bookmark, BookmarkSource } from '@/types';

export type SharedBookmarkDraft = {
  url: string;
  title?: string;
  description?: string;
  imagePreview?: string;
  source: BookmarkSource;
  personalNote?: string;
};

export async function prepareSharedBookmarkDraft(
  sharedText: string,
  sharedUrl?: string
): Promise<SharedBookmarkDraft> {
  const url = sharedUrl || extractUrlFromText(sharedText);
  if (!url) {
    throw new Error('No URL found in shared content');
  }

  let title: string | undefined;
  let description: string | undefined;
  let imagePreview: string | undefined;

  try {
    const metadata = await fetchUrlMetadata(url);
    title = metadata.title;
    description = sanitizeMetadataDescription(metadata.description, url);
    imagePreview = metadata.image;
  } catch {
    // Metadata is optional for share saves
  }

  const personalNote =
    sharedText.trim() !== url.trim() ? sanitizeSharedText(sharedText, url) : undefined;

  return {
    url,
    title,
    description,
    imagePreview,
    source: getSourceFromUrl(url),
    personalNote: personalNote || undefined,
  };
}

export async function createSharedBookmark(draft: SharedBookmarkDraft): Promise<Bookmark> {
  return bookmarkRepository.createBookmark({
    url: draft.url,
    title: draft.title,
    description: draft.description,
    imagePreview: draft.imagePreview,
    source: draft.source,
    visibility: 'private',
    status: 'inbox',
    tagNames: [],
    personalNote: draft.personalNote,
  });
}

// Combines prepare + create for callers that intentionally skip the confirm
// step (e.g. the clipboard banner's one-tap "Quick Save", whose slower path
// is already the "Review" button that opens the full add-bookmark form).
export async function saveSharedContent(sharedText: string, sharedUrl?: string): Promise<Bookmark> {
  const draft = await prepareSharedBookmarkDraft(sharedText, sharedUrl);
  return createSharedBookmark(draft);
}

// Holds the in-flight share draft between ShareIntentHandler (which prepares it)
// and the share-confirm screen (which is pushed synchronously right after, in the
// same JS runtime) — only one share can be in flight at a time.
let pendingDraft: SharedBookmarkDraft | null = null;

export function setPendingSharedBookmarkDraft(draft: SharedBookmarkDraft): void {
  pendingDraft = draft;
}

export function getPendingSharedBookmarkDraft(): SharedBookmarkDraft | null {
  return pendingDraft;
}

export function clearPendingSharedBookmarkDraft(): void {
  pendingDraft = null;
}
