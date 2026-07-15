import { Platform } from 'react-native';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

export const REVENUECAT_ENTITLEMENT_ID = 'draft Pro';
const IOS_API_KEY = 'appl_mufLmalexVaMTSzKtrZgxIfRLtf';
const ANDROID_API_KEY = 'goog_ilBpMexUSBwpdqwnVDxoJYjOqth';

function platformApiKey(): string | null {
  if (Platform.OS === 'ios') return IOS_API_KEY;
  if (Platform.OS === 'android') return ANDROID_API_KEY;
  return null;
}

async function sdk() {
  return (await import('react-native-purchases')).default;
}

export function hasPremiumEntitlement(customerInfo: CustomerInfo): boolean {
  return Boolean(customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT_ID]);
}

export async function initializeRevenueCat(appUserId?: string | null): Promise<CustomerInfo | null> {
  const apiKey = platformApiKey();
  if (!apiKey || !appUserId) return null;

  const Purchases = await sdk();
  const isConfigured = await Purchases.isConfigured();
  if (!isConfigured) {
    // Configure once with the final Firebase ID. Configuring anonymously and
    // immediately calling logIn causes an unnecessary attribute sync on launch.
    Purchases.configure({ apiKey, appUserID: appUserId });
  } else if ((await Purchases.getAppUserID()) !== appUserId) {
    await Purchases.logIn(appUserId);
  }

  return Purchases.getCustomerInfo();
}

export async function getPremiumPackages(): Promise<PurchasesPackage[]> {
  if (!platformApiKey()) return [];
  const Purchases = await sdk();
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

export async function purchasePremiumPackage(aPackage: PurchasesPackage): Promise<CustomerInfo> {
  const Purchases = await sdk();
  const { customerInfo } = await Purchases.purchasePackage(aPackage);
  return customerInfo;
}

export async function restorePremiumPurchases(): Promise<CustomerInfo> {
  const Purchases = await sdk();
  return Purchases.restorePurchases();
}

export async function addRevenueCatCustomerInfoListener(
  listener: (customerInfo: CustomerInfo) => void
): Promise<() => void> {
  if (!platformApiKey()) return () => undefined;
  const Purchases = await sdk();
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}

export async function logOutRevenueCat(): Promise<void> {
  if (!platformApiKey()) return;
  const Purchases = await sdk();
  if (await Purchases.isConfigured()) await Purchases.logOut();
}

export function isPurchaseCancelled(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'userCancelled' in error && error.userCancelled);
}
