import { useCallback } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { showAppAlert } from '@/providers/DialogProvider';
import { useAuth } from '@/store/useAuthStore';

export function useAuthGate() {
  const { t } = useTranslation();
  const { isAuthenticated, isGuest } = useAuth();

  const requireAccount = useCallback(
    (message?: string): boolean => {
      if (isAuthenticated && !isGuest) return true;

      showAppAlert(
        t('auth.guest.signInRequired'),
        message ?? t('auth.guest.featureRequiresAccount'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('auth.signIn'), onPress: () => router.push('/(auth)/sign-in') },
        ],
        { variant: 'info' }
      );
      return false;
    },
    [isAuthenticated, isGuest, t]
  );

  return { requireAccount, isAuthenticated: isAuthenticated && !isGuest };
}
