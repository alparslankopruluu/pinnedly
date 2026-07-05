import crashlytics from '@react-native-firebase/crashlytics';

export async function initializeCrashlytics(): Promise<void> {
  try {
    await crashlytics().setCrashlyticsCollectionEnabled(true);
    crashlytics().log('Crashlytics initialized');
  } catch (error) {
    console.warn('Crashlytics init failed:', error);
  }
}

export async function setCrashlyticsUser(userId: string | null): Promise<void> {
  try {
    await crashlytics().setUserId(userId ?? '');
  } catch (error) {
    console.warn('Crashlytics setUserId failed:', error);
  }
}

export function setCrashlyticsAttributes(attrs: Record<string, string>): void {
  try {
    Object.entries(attrs).forEach(([key, value]) => {
      crashlytics().setAttribute(key, value);
    });
  } catch (error) {
    console.warn('Crashlytics setAttribute failed:', error);
  }
}

export function logCrashlytics(message: string): void {
  try {
    crashlytics().log(message);
  } catch (error) {
    console.warn('Crashlytics log failed:', error);
  }
}

export function recordError(error: Error, context?: string): void {
  try {
    if (context) crashlytics().log(context);
    crashlytics().recordError(error);
  } catch (e) {
    console.warn('Crashlytics recordError failed:', e);
  }
}

/** Forces a native crash to verify Crashlytics setup (dev/testing only). */
export function forceTestCrash(): void {
  crashlytics().log('Test crash triggered from settings');
  crashlytics().crash();
}