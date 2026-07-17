import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { router } from 'expo-router';
import type { CustomerInfo } from 'react-native-purchases';
import { PremiumModal } from '@/components/PremiumModal';
import { useAuth } from '@/store/useAuthStore';
import {
  addRevenueCatCustomerInfoListener,
  hasPremiumEntitlement,
  initializeRevenueCat,
  REVENUECAT_ENTITLEMENT_ID,
  warmRevenueCatPaywall,
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
  const refreshSequence = useRef(0);

  const applyCustomerInfo = useCallback((customerInfo: CustomerInfo) => {
    const clientSnapshot = snapshotFromCustomerInfo(customerInfo);
    setSnapshot((previous) => ({ ...clientSnapshot, aiUsed: previous.aiUsed }));
    return clientSnapshot;
  }, []);

  const mergeVerifiedSnapshot = useCallback((
    serverSnapshot: EntitlementSnapshot,
    clientSnapshot: EntitlementSnapshot | null
  ): EntitlementSnapshot => {
    // A completed store purchase is reflected by the native RevenueCat SDK
    // before it can appear in the REST API. Never let that short propagation
    // window downgrade an active local entitlement back to Free.
    if (clientSnapshot?.plan === 'premium' && serverSnapshot.plan === 'free') {
      return {
        ...clientSnapshot,
        aiUsed: serverSnapshot.aiUsed,
        aiLimit: 100,
      };
    }
    return serverSnapshot;
  }, []);

  const refresh = useCallback(async (): Promise<EntitlementSnapshot> => {
    const requestSequence = ++refreshSequence.current;
    if (!user?.id) {
      if (requestSequence === refreshSequence.current) {
        setSnapshot({ ...INITIAL_SNAPSHOT, status: 'free' });
      }
      return { ...INITIAL_SNAPSHOT, status: 'free' };
    }

    let clientSnapshot: EntitlementSnapshot | null = null;
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        const customerInfo = await initializeRevenueCat(user.id);
        if (customerInfo) {
          clientSnapshot = snapshotFromCustomerInfo(customerInfo);
          if (requestSequence === refreshSequence.current) {
            setSnapshot((previous) => ({ ...clientSnapshot!, aiUsed: previous.aiUsed }));
          }
          // Do this in the background while the app is already loading. It
          // makes the later Upgrade action feel immediate without blocking
          // access to the rest of the app if RevenueCat is temporarily slow.
          void warmRevenueCatPaywall().catch((error) => {
            recordError(error instanceof Error ? error : new Error(String(error)), 'revenuecat:prewarm-paywall');
          });
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
      const merged = mergeVerifiedSnapshot(next, clientSnapshot);
      if (requestSequence === refreshSequence.current) setSnapshot(merged);
      return merged;
    } catch (error) {
      if (clientSnapshot) return clientSnapshot;
      if (requestSequence === refreshSequence.current) {
        setSnapshot((previous) => ({ ...previous, status: previous.verifiedAt ? previous.status : 'error' }));
      }
      throw error;
    }
  }, [mergeVerifiedSnapshot, user?.id]);

  const handleEntitlementChanged = useCallback((customerInfo?: CustomerInfo) => {
    // Invalidate entitlement checks that started before this store event.
    refreshSequence.current += 1;
    if (customerInfo) applyCustomerInfo(customerInfo);

    // UI unlock is intentionally not blocked by the REST verification call.
    // RevenueCat webhooks/REST can trail the device purchase by a few seconds.
    void refresh().catch(() => undefined);
  }, [applyCustomerInfo, refresh]);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setSnapshot({ ...INITIAL_SNAPSHOT, status: 'free' });
      return;
    }
    void refresh().catch(() => undefined);
  }, [authLoading, refresh, user?.id]);

  useEffect(() => {
    if (!user?.id || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return;
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
      showPaywall: () => {
        if (!user?.id) {
          router.push('/(auth)/sign-in');
          return;
        }
        setPaywallVisible(true);
      },
      presentCustomerCenter: async () => {
        if (!user?.id) {
          router.push('/(auth)/sign-in');
          return;
        }
        if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
        const { default: RevenueCatUI } = await import('react-native-purchases-ui');
        await RevenueCatUI.presentCustomerCenter();
      },
    }),
    [can, refresh, snapshot, user?.id]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
      <PremiumModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        onEntitlementChanged={handleEntitlementChanged}
      />
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionAccess(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error('useSubscriptionAccess must be used inside SubscriptionProvider');
  return context;
}
