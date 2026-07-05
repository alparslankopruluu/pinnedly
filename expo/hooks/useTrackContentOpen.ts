import { useEffect } from 'react';
import { trackContentOpen, type ContentType } from '@/lib/analytics';

export function useTrackContentOpen(
  contentType: ContentType,
  contentId: string | undefined,
  source?: string
): void {
  useEffect(() => {
    if (!contentId) return;
    trackContentOpen(contentType, contentId, source);
  }, [contentType, contentId, source]);
}