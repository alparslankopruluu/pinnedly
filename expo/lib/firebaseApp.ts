import { Platform } from 'react-native';
import { getFirebaseWebConfig } from '@/lib/firebaseConfig';

declare const require: <T = unknown>(moduleName: string) => T;

let webApp: unknown | null = null;

export function getFirebaseWebApp(): unknown {
  if (Platform.OS !== 'web') {
    throw new Error('Firebase Web app is only available on web');
  }

  if (webApp) return webApp;

  const { initializeApp, getApp, getApps } = require<typeof import('firebase/app')>('firebase/app');
  webApp = getApps().length > 0 ? getApp() : initializeApp(getFirebaseWebConfig());
  return webApp;
}
