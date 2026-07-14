import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';
import type { CustomerInfo } from 'react-native-purchases';
import { PremiumModal } from '@/components/PremiumModal';
import { useAuth } from '@/store/useAuthStore';
import {
  addRevenueCatCustomerInfoListener,
  hasPremiumEntitlement,
  initializeRevenueCat,
  REVENUECAT_ENTITLEMENT_ID,
} from '@/lib/revenuecat';
import { recordError } from '@/lib/crashlytics';
import { callAuthenticatedFunction } from '@/services/functionsApi';
import {
  AccessContext,
  AccessDecision,
  EntitlementSnapshot,
  FeatureKey,
  getAccessDecision,
} from '@/types/subscription';

const INITIAL_SNAPSHOT: EntitlementSnapshot = {
  plan: 'free',
  status: 'loading',
  aiUsed: 0,
  aiLimit: 3,
};

type ServerEntitlement = Partial<EntitlementSnapshot> & {
  active?: boolean;
};

interface SubscriptionContextValue {
  snapshot: EntitlementSnapshot;
  isPremium: boolean;
  refresh: () => Promise<EntitlementSnapshot>;
  can: (feature: FeatureKey | 'create', context?: AccessContext) => AccessDecision;
  requireFeature: (feature: FeatureKey | 'create', context?: AccessContext) => AccessDecision;
  showPaywall: () => void;
  presentCustomerCenter: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

function snapshotFromCustomerInfo(customerInfo: CustomerInfo): EntitlementSnapshot {
  const entitlement = customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT_ID];
  const active = Boolean(entitlement);
  return {
    plan: active ? 'premium' : 'free',
    status: active ? 'active' : 'free',
    entitlementId: active ? REVENUECAT_ENTITLEMENT_ID : undefined,
    productId: entitlement?.productIdentifier,
    expiresAt: entitlement?.expirationDate ? Date.parse(entitlement.expirationDate) : undefined,
    verifiedAt: Date.now(),
    aiUsed: 0,
    aiLimit: active ? 100 : 3,
  };
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [snapshot, setSnapshot] = useState<EntitlementSnapshot>(INITIAL_SNAPSHOT);
  const [paywallVisible, setPaywallVisible] = useState(false);

  const applyCustomerInfo = useCallback((customerInfo: CustomerInfo) => {
    setSnapshot((previous) => ({
      ...snapshotFromCustomerInfo(customerInfo),
      aiUsed: previous.aiUsed,
    }));
  }, []);

  const refresh = useCallback(async (): Promise<EntitlementSnapshot> => {
    if (!user?.id) {
      setSnapshot({ ...INITIAL_SNAPSHOT, status: 'free' });
      return { ...INITIAL_SNAPSHOT, status: 'free' };
    }

    let clientSnapshot: EntitlementSnapshot | null = null;
    if (Platform.OS === 'ios') {
      try {
        const customerInfo = await initializeRevenueCat(user.id);
        if (customerInfo) {
          clientSnapshot = snapshotFromCustomerInfo(customerInfo);
          setSnapshot((previous) => ({ ...clientSnapshot!, aiUsed: previous.aiUsed }));
        }
      } catch (error) {
        recordError(error instanceof Error ? error : new Error(String(error)), 'revenuecat:refresh');
      }
    }

    try {
      const server = await callAuthenticatedFunction<ServerEntitlement>('syncEntitlement');
      const next: EntitlementSnapshot = {
        plan: server.active || server.plan === 'premium' ? 'premium' : 'free',
        status: server.status ?? (server.active ? 'active' : 'free'),
        entitlementId: server.entitlementId,
        productId: server.productId,
        expiresAt: server.expiresAt,
        verifiedAt: server.verifiedAt ?? Date.now(),
        aiUsed: server.aiUsed ?? 0,
        aiLimit: server.aiLimit ?? (server.active ? 100 : 3),
      };
      setSnapshot(next);
      return next;
    } catch (error) {
      if (clientSnapshot) return clientSnapshot;
      setSnapshot((previous) => ({ ...previous, status: previous.verifiedAt ? previous.status : 'error' }));
      throw error;
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setSnapshot({ ...INITIAL_SNAPSHOT, status: 'free' });
      return;
    }
    void refresh().catch(() => undefined);
  }, [authLoading, refresh, user?.id]);

  useEffect(() => {
    if (!user?.id || Platform.OS !== 'ios') return;
    let unsubscribe: (() => void) | undefined;
    void addRevenueCatCustomerInfoListener((customerInfo) => {
      applyCustomerInfo(customerInfo);
      void refresh().catch(() => undefined);
    }).then((remove) => {
      unsubscribe = remove;
    });
    return () => unsubscribe?.();
  }, [applyCustomerInfo, refresh, user?.id]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && user?.id) void refresh().catch(() => undefined);
    });
    return () => subscription.remove();
  }, [refresh, user?.id]);

  const can = useCallback(
    (feature: FeatureKey | 'create', context?: AccessContext) =>
      getAccessDecision(snapshot, feature, context),
    [snapshot]
  );

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      snapshot,
      isPremium: snapshot.plan === 'premium',
      refresh,
      can,
      requireFeature: can,
      showPaywall: () => setPaywallVisible(true),
      presentCustomerCenter: async () => {
        if (Platform.OS !== 'ios') return;
        const { default: RevenueCatUI } = await import('react-native-purchases-ui');
        await RevenueCatUI.presentCustomerCenter();
      },
    }),
    [can, refresh, snapshot]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
      <PremiumModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        onEntitlementChanged={refresh}
      />
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionAccess(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error('useSubscriptionAccess must be used inside SubscriptionProvider');
  return context;
}
