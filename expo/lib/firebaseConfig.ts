import Constants from 'expo-constants';

export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId?: string;
};

const fallbackWebConfig: FirebaseWebConfig = {
  apiKey: 'AIzaSyAMRSrAaduMS643iVZ2OAxEc_pgD1MXyZg',
  authDomain: 'pinnedly-48c49.firebaseapp.com',
  projectId: 'pinnedly-48c49',
  storageBucket: 'pinnedly-48c49.firebasestorage.app',
  messagingSenderId: '36179904713',
};

export function getFirebaseWebConfig(): FirebaseWebConfig {
  const extra = Constants.expoConfig?.extra as
    | { firebaseWeb?: Partial<FirebaseWebConfig> }
    | undefined;

  return {
    ...fallbackWebConfig,
    ...extra?.firebaseWeb,
  };
}

