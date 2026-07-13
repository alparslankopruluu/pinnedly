import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { showAppAlert } from '@/providers/DialogProvider';
import { useSubscriptionAccess } from '@/providers/SubscriptionProvider';
import type { AccessContext, FeatureKey, LimitedResource } from '@/types/subscription';
import { trackSubscriptionEvent } from '@/lib/analytics';

export function useSubscriptionGate() {
  const { t } = useTranslation();
  const { can, showPaywall } = useSubscriptionAccess();

  const ensure = useCallback(
    (feature: FeatureKey | 'create', context?: AccessContext): boolean => {
      const decision = can(feature, context);
      if (decision.allowed) return true;
      void trackSubscriptionEvent('feature_blocked', {
        feature,
        reason: decision.reason ?? 'unknown',
      });

      const message = decision.reason === 'limit_reached'
        ? t('subscription.errors.limitReached', {
            current: decision.current ?? 0,
            limit: decision.limit ?? 0,
          })
        : decision.reason === 'ai_quota_exhausted'
          ? t('subscription.errors.aiQuotaExhausted')
          : decision.reason === 'entitlement_unavailable'
            ? t('subscription.errors.unavailable')
            : t('subscription.errors.premiumRequired');

      showAppAlert(
        t('subscription.title'),
        message,
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('subscription.upgrade'), onPress: showPaywall },
        ],
        { variant: 'info' }
      );
      return false;
    },
    [can, showPaywall, t]
  );

  const ensureCreate = useCallback(
    (resource: LimitedResource, usage: number) => ensure('create', { resource, usage }),
    [ensure]
  );

  const handleAccessError = useCallback(
    (error: unknown): boolean => {
      const value = error && typeof error === 'object'
        ? (error as { code?: string; details?: Record<string, unknown> })
        : undefined;
      if (!value?.code || !['LIMIT_REACHED', 'PREMIUM_REQUIRED', 'ENTITLEMENT_UNAVAILABLE'].includes(value.code)) {
        return false;
      }
      const current = Number(value.details?.current ?? 0);
      const limit = Number(value.details?.limit ?? 0);
      const message = value.code === 'LIMIT_REACHED'
        ? t('subscription.errors.limitReached', { current, limit })
        : value.code === 'ENTITLEMENT_UNAVAILABLE'
          ? t('subscription.errors.unavailable')
          : t('subscription.errors.premiumRequired');
      showAppAlert(
        t('subscription.title'),
        message,
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('subscription.upgrade'), onPress: showPaywall },
        ],
        { variant: 'info' }
      );
      return true;
    },
    [showPaywall, t]
  );

  return { ensure, ensureCreate, handleAccessError };
}
