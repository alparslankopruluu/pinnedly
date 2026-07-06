import { fetchUrlMetadata, getSourceFromUrl } from '@/utils/metadata';
import { extractUrlFromText } from '@/utils/bookmark';
import { bookmarkRepository } from '@/repositories/BookmarkRepository';
import { sanitizeMetadataDescription, sanitizeSharedText } from '@/utils/sanitizeSharedText';

export async function saveSharedContent(sharedText: string, sharedUrl?: string) {
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

  return bookmarkRepository.createBookmark({
    url,
    title,
    description,
    imagePreview,
    source: getSourceFromUrl(url),
    visibility: 'private',
    status: 'inbox',
    tagNames: [],
    personalNote: personalNote || undefined,
  });
}