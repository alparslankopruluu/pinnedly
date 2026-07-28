import { Platform } from 'react-native';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

export const REVENUECAT_ENTITLEMENT_ID = 'draft Pro';
const IOS_API_KEY = 'appl_mufLmalexVaMTSzKtrZgxIfRLtf';
const ANDROID_API_KEY = 'goog_ilBpMexUSBwpdqwnVDxoJYjOqth';

let offeringsPromise: Promise<PurchasesPackage[]> | null = null;
let paywallUiPromise: Promise<typeof import('react-native-purchases-ui')> | null = null;

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
  if (!offeringsPromise) {
    offeringsPromise = (async () => {
      const Purchases = await sdk();
      const offerings = await Purchases.getOfferings();
      return offerings.current?.availablePackages ?? [];
    })().catch((error) => {
      offeringsPromise = null;
      throw error;
    });
  }
  return offeringsPromise;
}

export async function getRevenueCatCustomerInfo(): Promise<CustomerInfo> {
  const Purchases = await sdk();
  return Purchases.getCustomerInfo();
}

function revenueCatPaywallUi() {
  if (!paywallUiPromise) {
    paywallUiPromise = import('react-native-purchases-ui').catch((error) => {
      paywallUiPromise = null;
      throw error;
    });
  }
  return paywallUiPromise;
}

/**
 * Only presents the paywall when the user does not already hold Premium.
 * Returns `NOT_PRESENTED` when entitlement is already active (no buy sheet).
 */
export async function presentRevenueCatPaywall() {
  const { default: RevenueCatUI } = await revenueCatPaywallUi();
  return RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier: REVENUECAT_ENTITLEMENT_ID,
  });
}

/**
 * Fetch native paywall code and the current offering before the user taps
 * Upgrade. RevenueCat caches both calls, so the actual paywall presentation
 * does not have to wait for a cold module load and catalog request.
 */
export async function warmRevenueCatPaywall(): Promise<void> {
  if (!platformApiKey()) return;

  await Promise.all([
    getPremiumPackages(),
    revenueCatPaywallUi(),
  ]);
}

export async function purchasePremiumPackage(aPackage: PurchasesPackage): Promise<CustomerInfo> {
  const Purchases = await sdk();

  // Avoid StoreKit / Play Billing "already owned" if we already know Premium.
  const current = await Purchases.getCustomerInfo();
  if (hasPremiumEntitlement(current)) return current;

  try {
    const { customerInfo } = await Purchases.purchasePackage(aPackage);
    return customerInfo;
  } catch (error) {
    // Item is already owned on the store account — sync as a successful restore.
    if (isProductAlreadyPurchasedError(error)) {
      const restored = await Purchases.restorePurchases();
      if (hasPremiumEntitlement(restored)) return restored;
      const refreshed = await Purchases.getCustomerInfo();
      if (hasPremiumEntitlement(refreshed)) return refreshed;
    }
    throw error;
  }
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

/** Store reports the subscription is already owned by this Apple/Google account. */
export function isProductAlreadyPurchasedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = String((error as { code?: string | number }).code ?? '');
  // PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR === "6"
  if (code === '6' || code === 'PRODUCT_ALREADY_PURCHASED_ERROR') return true;
  const message = String(
    (error as { message?: string; underlyingErrorMessage?: string }).message
      ?? (error as { underlyingErrorMessage?: string }).underlyingErrorMessage
      ?? error
  ).toLowerCase();
  return (
    message.includes('productalreadypurchased')
    || message.includes('already purchased')
    || message.includes('already owned')
    || message.includes('item already owned')
  );
}
