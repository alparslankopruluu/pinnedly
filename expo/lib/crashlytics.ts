import { Platform } from 'react-native';

declare const require: <T = unknown>(moduleName: string) => T;

function crashlyticsModule() {
  return require<typeof import('@react-native-firebase/crashlytics')>(
    '@react-native-firebase/crashlytics'
  );
}

function getNativeCrashlytics() {
  return crashlyticsModule().getCrashlytics();
}

function withNativeCrashlytics(action: (
  module: ReturnType<typeof crashlyticsModule>,
  crashlytics: unknown
) => void): void {
  if (Platform.OS === 'web') return;

  try {
    action(crashlyticsModule(), getNativeCrashlytics());
  } catch (error) {
    console.warn('Crashlytics event failed:', error);
  }
}

export async function initializeCrashlytics(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const module = crashlyticsModule();
    const crashlytics = getNativeCrashlytics();
    await module.setCrashlyticsCollectionEnabled(crashlytics as never, true);
    module.log(crashlytics as never, 'Crashlytics initialized');
  } catch (error) {
    console.warn('Crashlytics init failed:', error);
  }
}

export async function setCrashlyticsUser(userId: string | null): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    await crashlyticsModule().setUserId(getNativeCrashlytics() as never, userId ?? '');
  } catch (error) {
    console.warn('Crashlytics setUserId failed:', error);
  }
}

export function setCrashlyticsAttributes(attrs: Record<string, string>): void {
  withNativeCrashlytics((module, crashlytics) => {
    Object.entries(attrs).forEach(([key, value]) => {
      module.setAttribute(crashlytics as never, key, value);
    });
  });
}

export function logCrashlytics(message: string): void {
  withNativeCrashlytics((module, crashlytics) => {
    module.log(crashlytics as never, message);
  });
}

export function recordError(error: Error, context?: string): void {
  if (Platform.OS === 'web') {
    if (__DEV__) console.warn(context ? `${context}:` : 'Captured error:', error);
    return;
  }

  withNativeCrashlytics((module, crashlytics) => {
    if (context) module.log(crashlytics as never, context);
    module.recordError(crashlytics as never, error);
  });
}

/** Forces a native crash to verify Crashlytics setup (dev/testing only). */
export function forceTestCrash(): void {
  if (Platform.OS === 'web') {
    console.warn('Crashlytics test crash is only available on native builds.');
    return;
  }

  withNativeCrashlytics((module, crashlytics) => {
    module.log(crashlytics as never, 'Test crash triggered from settings');
    module.crash(crashlytics as never);
  });
}
