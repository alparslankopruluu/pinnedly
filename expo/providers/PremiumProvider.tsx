import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import Purchases, { LOG_LEVEL, PurchasesOffering, CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import { useAuth } from '@/store/useAuthStore';
import { getApiKey, ENTITLEMENT_ID } from '@/lib/purchases';
import { recordError } from '@/lib/crashlytics';
import { trackSubscriptionEvent } from '@/lib/analytics';

interface PremiumContextType {
  isPremium: boolean;
  isLoading: boolean;
  currentOffering: PurchasesOffering | null;
  customerInfo: CustomerInfo | null;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  presentPaywall: () => Promise<boolean>;
  presentCustomerCenter: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const checkPremiumStatus = useCallback((info: CustomerInfo) => {
    setCustomerInfo(info);
    const hasEntitlement = typeof info.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
    setIsPremium(hasEntitlement);
  }, []);

  useEffect(() => {
    const initPurchases = async () => {
      try {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        Purchases.configure({ apiKey: getApiKey() });

        // Identify user if logged in
        if (isAuthenticated && user) {
          const { customerInfo: loggedInInfo } = await Purchases.logIn(user.id);
          checkPremiumStatus(loggedInInfo);
        } else {
          const info = await Purchases.getCustomerInfo();
          checkPremiumStatus(info);
        }

        // Fetch offerings
        const offerings = await Purchases.getOfferings();
        if (offerings.current) {
          setCurrentOffering(offerings.current);
        }

        // Setup listener for customer info changes (e.g. background renewals)
        Purchases.addCustomerInfoUpdateListener((info) => {
          checkPremiumStatus(info);
        });

      } catch (error) {
        console.error('RevenueCat initialization failed:', error);
        recordError(error instanceof Error ? error : new Error('RevenueCat init failed'), 'premium:init');
      } finally {
        setIsLoading(false);
      }
    };

    initPurchases();
  }, [isAuthenticated, user?.id, checkPremiumStatus]);

  const purchasePackage = async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      trackSubscriptionEvent('subscribe_started', { package_type: pkg.packageType });
      const { customerInfo: newInfo } = await Purchases.purchasePackage(pkg);
      checkPremiumStatus(newInfo);

      const isNowPremium = typeof newInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
      if (isNowPremium) {
        trackSubscriptionEvent('subscribe_completed', { package_type: pkg.packageType });
      }
      return isNowPremium;
    } catch (e: any) {
      if (!e.userCancelled) {
        trackSubscriptionEvent('subscribe_failed', { error: e.message });
        Alert.alert('Purchase Error', e.message);
        recordError(e, 'premium:purchase');
      } else {
        trackSubscriptionEvent('subscribe_cancelled');
      }
      return false;
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    try {
      const restoredInfo = await Purchases.restorePurchases();
      checkPremiumStatus(restoredInfo);
      return typeof restoredInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
    } catch (e: any) {
      Alert.alert('Restore Error', e.message);
      recordError(e, 'premium:restore');
      return false;
    }
  };

  const presentPaywall = async (): Promise<boolean> => {
    try {
      trackSubscriptionEvent('modal_viewed');
      const result: PAYWALL_RESULT = await RevenueCatUI.presentPaywall();

      switch (result) {
        case PAYWALL_RESULT.PURCHASED:
          trackSubscriptionEvent('subscribe_completed');
          // Re-fetch info to be sure
          const info = await Purchases.getCustomerInfo();
          checkPremiumStatus(info);
          return true;
        case PAYWALL_RESULT.RESTORED:
          const restoredInfo = await Purchases.getCustomerInfo();
          checkPremiumStatus(restoredInfo);
          return true;
        case PAYWALL_RESULT.CANCELLED:
          trackSubscriptionEvent('subscribe_cancelled');
          return false;
        default:
          return false;
      }
    } catch (e: any) {
      trackSubscriptionEvent('subscribe_failed', { error: e.message });
      recordError(e, 'premium:paywall');
      return false;
    }
  };

  const presentCustomerCenter = async () => {
    if (Platform.OS === 'ios') {
      try {
        await RevenueCatUI.presentCustomerCenter();
      } catch (e: any) {
        recordError(e, 'premium:customer_center');
        Alert.alert('Error', 'Could not open customer center');
      }
    } else {
      // Customer Center is primarily for iOS in some SDK versions or handled via Play Store
      // Check current SDK capabilities or fallback to a custom UI or restore
      Alert.alert('Manage Subscription', 'Please manage your subscription in the Google Play Store.');
    }
  };

  return (
    <PremiumContext.Provider
      value={{
        isPremium,
        isLoading,
        currentOffering,
        customerInfo,
        purchasePackage,
        restorePurchases,
        presentPaywall,
        presentCustomerCenter,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

export const usePremium = () => {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
}
