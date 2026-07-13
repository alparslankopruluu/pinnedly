import { useEffect, useRef } from 'react';
import { useBookmarkStore } from '@/store/useOfflineStore';
import { useAuth } from '@/store/useAuthStore';
import { getDigestFrequency, setDigestFrequency, scheduleBookmarkDigest, DigestFrequency } from '@/services/bookmarkDigest';
import { useSubscriptionAccess } from '@/providers/SubscriptionProvider';

export function BookmarkDigestSync() {
  const { bookmarks } = useBookmarkStore();
  const { isAuthenticated } = useAuth();
  const { isPremium, snapshot } = useSubscriptionAccess();
  const frequencyRef = useRef<DigestFrequency>('off');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    const syncDigest = async () => {
      const frequency = await getDigestFrequency();
      if (!isPremium) {
        if (frequency !== 'off') await setDigestFrequency('off');
        await scheduleBookmarkDigest(bookmarks, 'off');
        frequencyRef.current = 'off';
        return;
      }
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
  }, [bookmarks, isAuthenticated, isPremium, snapshot.status]);

  return null;
}
