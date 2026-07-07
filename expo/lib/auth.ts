import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getFirebaseWebApp } from '@/lib/firebaseApp';

declare const require: <T = unknown>(moduleName: string) => T;

export type FirebaseUserLike = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  getIdToken?: () => Promise<string>;
};

type AuthResultLike = {
  user: FirebaseUserLike;
  additionalUserInfo?: {
    isNewUser?: boolean;
  } | null;
};

type PhoneConfirmationLike = {
  confirm: (code: string) => Promise<AuthResultLike | null>;
};

function nativeAuth() {
  return require<typeof import('@react-native-firebase/auth')>('@react-native-firebase/auth');
}

function nativeGoogle() {
  return require<typeof import('@react-native-google-signin/google-signin')>(
    '@react-native-google-signin/google-signin'
  );
}

function webAuth() {
  return require<typeof import('firebase/auth')>('firebase/auth');
}

function appleAuth() {
  return require<typeof import('expo-apple-authentication')>('expo-apple-authentication');
}

export function configureAuthProviders(): void {
  const webClientId = Constants.expoConfig?.extra?.googleWebClientId as string | undefined;
  if (Platform.OS !== 'web' && webClientId) {
    nativeGoogle().GoogleSignin.configure({ webClientId });
  }
}

export function getAuthInstance(): unknown {
  if (Platform.OS === 'web') {
    return webAuth().getAuth(getFirebaseWebApp() as never);
  }
  return nativeAuth().getAuth();
}

export function getCurrentFirebaseUser(): FirebaseUserLike | null {
  return ((getAuthInstance() as { currentUser?: FirebaseUserLike | null }).currentUser ?? null);
}

export function getCurrentUserId(): string | null {
  return getCurrentFirebaseUser()?.uid ?? null;
}

export async function getCurrentUserToken(): Promise<string | null> {
  const user = getCurrentFirebaseUser();
  if (!user) return null;

  if (Platform.OS === 'web') {
    return webAuth().getIdToken(user as never);
  }

  return nativeAuth().getIdToken(user as never);
}

export function onFirebaseAuthStateChanged(
  listener: (user: FirebaseUserLike | null) => void
): () => void {
  if (Platform.OS === 'web') {
    return webAuth().onAuthStateChanged(getAuthInstance() as never, listener as never);
  }

  return nativeAuth().onAuthStateChanged(getAuthInstance() as never, listener as never);
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResultLike> {
  if (Platform.OS === 'web') {
    return webAuth().signInWithEmailAndPassword(
      getAuthInstance() as never,
      email,
      password
    ) as Promise<AuthResultLike>;
  }

  return nativeAuth().signInWithEmailAndPassword(
    getAuthInstance() as never,
    email,
    password
  ) as Promise<AuthResultLike>;
}

export async function createEmailUser(email: string, password: string): Promise<AuthResultLike> {
  if (Platform.OS === 'web') {
    return webAuth().createUserWithEmailAndPassword(
      getAuthInstance() as never,
      email,
      password
    ) as Promise<AuthResultLike>;
  }

  return nativeAuth().createUserWithEmailAndPassword(
    getAuthInstance() as never,
    email,
    password
  ) as Promise<AuthResultLike>;
}

export async function signInWithGoogleProvider(): Promise<AuthResultLike> {
  if (Platform.OS === 'web') {
    const auth = webAuth();
    const provider = new auth.GoogleAuthProvider();
    const result = await auth.signInWithPopup(getAuthInstance() as never, provider);
    return {
      user: result.user as FirebaseUserLike,
      additionalUserInfo: auth.getAdditionalUserInfo(result) ?? null,
    };
  }

  const { GoogleSignin } = nativeGoogle();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const signInResult = await GoogleSignin.signIn();
  const idToken = signInResult.data?.idToken;
  if (!idToken) throw new Error('No Google ID token received');

  const auth = nativeAuth();
  const credential = auth.GoogleAuthProvider.credential(idToken);
  return auth.signInWithCredential(getAuthInstance() as never, credential) as Promise<AuthResultLike>;
}

export async function sendPhoneVerificationCode(phoneNumber: string): Promise<PhoneConfirmationLike> {
  if (Platform.OS === 'web') {
    throw new Error('Phone sign-in is not available on web yet');
  }

  return nativeAuth().signInWithPhoneNumber(
    getAuthInstance() as never,
    phoneNumber
  ) as Promise<PhoneConfirmationLike>;
}

export async function signInWithAppleProvider(): Promise<AuthResultLike & { displayName?: string }> {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Sign-In is only available on iOS');
  }

  const apple = appleAuth();
  const credential = await apple.signInAsync({
    requestedScopes: [
      apple.AppleAuthenticationScope.FULL_NAME,
      apple.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('No identity token received from Apple');
  }

  const auth = nativeAuth();
  const appleCredential = auth.AppleAuthProvider.credential(credential.identityToken);
  const result = await auth.signInWithCredential(getAuthInstance() as never, appleCredential);
  const displayName = credential.fullName
    ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
    : undefined;

  return {
    ...(result as AuthResultLike),
    displayName,
  };
}

export async function signOutFromAuth(): Promise<void> {
  if (Platform.OS !== 'web') {
    try {
      await nativeGoogle().GoogleSignin.signOut();
    } catch {
      // User may not have signed in with Google.
    }
    await nativeAuth().signOut(getAuthInstance() as never);
    return;
  }

  await webAuth().signOut(getAuthInstance() as never);
}

export async function sendPasswordReset(email: string): Promise<void> {
  if (Platform.OS === 'web') {
    await webAuth().sendPasswordResetEmail(getAuthInstance() as never, email);
    return;
  }

  await nativeAuth().sendPasswordResetEmail(getAuthInstance() as never, email);
}
