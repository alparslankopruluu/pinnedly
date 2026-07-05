import { useEffect } from 'react';
import { useBookmarkStore } from '@/providers/OfflineProvider';
import { useAuth } from '@/store/useAuthStore';
import { getDigestFrequency, scheduleBookmarkDigest } from '@/services/bookmarkDigest';

export function BookmarkDigestSync() {
  const { bookmarks } = useBookmarkStore();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    const syncDigest = async () => {
      const frequency = await getDigestFrequency();
      if (cancelled) return;
      await scheduleBookmarkDigest(bookmarks, frequency);
    };

    syncDigest();

    return () => {
      cancelled = true;
    };
  }, [bookmarks, isAuthenticated]);

  return null;
}