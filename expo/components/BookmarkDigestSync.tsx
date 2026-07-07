import { useEffect, useRef } from 'react';
import { useBookmarkStore } from '@/store/useOfflineStore';
import { useAuth } from '@/store/useAuthStore';
import { getDigestFrequency, scheduleBookmarkDigest, DigestFrequency } from '@/services/bookmarkDigest';

export function BookmarkDigestSync() {
  const { bookmarks } = useBookmarkStore();
  const { isAuthenticated } = useAuth();
  const frequencyRef = useRef<DigestFrequency>('off');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    const syncDigest = async () => {
      const frequency = await getDigestFrequency();
      frequencyRef.current = frequency;
      if (cancelled || frequency === 'off') return;
      await scheduleBookmarkDigest(bookmarks, frequency);
    };

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      void syncDigest();
    }, 1500);

    return () => {
      cancelled = true;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [bookmarks, isAuthenticated]);

  return null;
}
