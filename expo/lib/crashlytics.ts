import {
  crash,
  getCrashlytics,
  log,
  recordError as recordCrashlyticsError,
  setAttribute,
  setCrashlyticsCollectionEnabled,
  setUserId,
} from '@react-native-firebase/crashlytics';

const crashlytics = getCrashlytics();

export async function initializeCrashlytics(): Promise<void> {
  try {
    await setCrashlyticsCollectionEnabled(crashlytics, true);
    log(crashlytics, 'Crashlytics initialized');
  } catch (error) {
    console.warn('Crashlytics init failed:', error);
  }
}

export async function setCrashlyticsUser(userId: string | null): Promise<void> {
  try {
    await setUserId(crashlytics, userId ?? '');
  } catch (error) {
    console.warn('Crashlytics setUserId failed:', error);
  }
}

export function setCrashlyticsAttributes(attrs: Record<string, string>): void {
  try {
    Object.entries(attrs).forEach(([key, value]) => {
      setAttribute(crashlytics, key, value);
    });
  } catch (error) {
    console.warn('Crashlytics setAttribute failed:', error);
  }
}

export function logCrashlytics(message: string): void {
  try {
    log(crashlytics, message);
  } catch (error) {
    console.warn('Crashlytics log failed:', error);
  }
}

export function recordError(error: Error, context?: string): void {
  try {
    if (context) log(crashlytics, context);
    recordCrashlyticsError(crashlytics, error);
  } catch (e) {
    console.warn('Crashlytics recordError failed:', e);
  }
}

/** Forces a native crash to verify Crashlytics setup (dev/testing only). */
export function forceTestCrash(): void {
  log(crashlytics, 'Test crash triggered from settings');
  crash(crashlytics);
}
