import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { showAppAlert } from '@/providers/DialogProvider';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/store/useAuthStore';
import { saveSharedContent } from '@/services/saveSharedBookmark';
import { ShareProcessingBanner } from '@/components/ShareProcessingBanner';
import { getShareSuccessMessage } from '@/utils/shareSuccessMessage';
import { platformCapabilities } from '@/utils/platform';

declare const require: <T = unknown>(moduleName: string) => T;

function getShareIntentModule() {
  try {
    return require<typeof import('expo-share-intent')>('expo-share-intent');
  } catch (error) {
    console.warn('Share intent module unavailable:', error);
    return null;
  }
}

export function ShareIntentProviderBoundary({ children }: { children: React.ReactNode }) {
  if (!platformCapabilities.supportsShareIntent) return <>{children}</>;

  const shareIntent = getShareIntentModule();
  if (!shareIntent) return <>{children}</>;

  const Provider = shareIntent.ShareIntentProvider;
  return <Provider>{children}</Provider>;
}

export function ShareIntentHandler() {
  if (!platformCapabilities.supportsShareIntent) return null;

  return <NativeShareIntentHandler />;
}

function NativeShareIntentHandler() {
  const shareIntentModule = getShareIntentModule();
  if (!shareIntentModule) return null;

  return <NativeShareIntentRuntime useShareIntentContext={shareIntentModule.useShareIntentContext} />;
}

function NativeShareIntentRuntime({
  useShareIntentContext,
}: {
  useShareIntentContext: typeof import('expo-share-intent').useShareIntentContext;
}) {
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
        showAppAlert(t('shareIntent.saved'), getShareSuccessMessage(bookmark.title, t), [
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
