import { Platform } from 'react-native';

export type AppBreakpoint = 'phone' | 'tablet' | 'desktop';

export const isWeb = Platform.OS === 'web';
export const isNative = !isWeb;

export const platformCapabilities = {
  supportsNativeFirebase: isNative,
  supportsFirebaseWeb: isWeb,
  supportsCrashlytics: isNative,
  supportsShareIntent: isNative,
  supportsPushNotifications: isNative,
  supportsLocalNotifications: isNative,
  supportsHaptics: isNative,
  supportsNativeGoogleSignIn: isNative,
  supportsGooglePopupSignIn: isWeb,
  supportsAppleSignIn: Platform.OS === 'ios',
  supportsPhoneSignIn: isNative,
  supportsLocalAuthentication: isNative,
  supportsImagePicker: true,
};

export function getBreakpoint(width: number): AppBreakpoint {
  if (width >= 1024) return 'desktop';
  if (width >= 768) return 'tablet';
  return 'phone';
}

export function getReadableContentWidth(width: number): number | '100%' {
  if (width >= 1200) return 1120;
  if (width >= 768) return Math.min(width - 48, 960);
  return '100%';
}
