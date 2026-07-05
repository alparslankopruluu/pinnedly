import { useEffect, useRef, useState } from 'react';
import { showAppAlert } from '@/providers/DialogProvider';
import { router } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/store/useAuthStore';
import { saveSharedContent } from '@/services/saveSharedBookmark';
import { ShareProcessingBanner } from '@/components/ShareProcessingBanner';

export function ShareIntentHandler() {
  const { t } = useTranslation();
  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntentContext();
  const { isAuthenticated } = useAuth();
  const isProcessing = useRef(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (error) {
      console.error('Share intent error:', error);
    }
  }, [error]);

  useEffect(() => {
    if (!hasShareIntent || !shareIntent || isProcessing.current) return;

    const processShare = async () => {
      isProcessing.current = true;
      setIsSaving(true);

      if (!isAuthenticated) {
        setIsSaving(false);
        showAppAlert(t('shareIntent.signInRequired'), t('shareIntent.signInToSaveLinks'));
        resetShareIntent();
        isProcessing.current = false;
        return;
      }

      const sharedUrl = shareIntent.webUrl || undefined;
      const sharedText = shareIntent.text || sharedUrl || '';

      try {
        const bookmark = await saveSharedContent(sharedText, sharedUrl);
        resetShareIntent();
        showAppAlert(t('shareIntent.savedToPinnedly'), bookmark.title || t('shareIntent.linkSavedToReadLater'), [
          { text: t('common.ok'), style: 'cancel' },
          { text: t('shareIntent.view'), onPress: () => router.push(`/bookmark/${bookmark.id}` as never) },
        ], { variant: 'success' });
      } catch (err) {
        showAppAlert(
          t('shareIntent.couldNotSave'),
          err instanceof Error ? err.message : t('shareIntent.unableToSave')
        );
        resetShareIntent();
      } finally {
        isProcessing.current = false;
        setIsSaving(false);
      }
    };

    processShare();
  }, [hasShareIntent, shareIntent, isAuthenticated, resetShareIntent, t]);

  return <ShareProcessingBanner visible={isSaving || (hasShareIntent && !!shareIntent)} />;
}