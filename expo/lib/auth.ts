import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getFirebaseWebApp } from '@/lib/firebaseApp';

declare const require: <T = unknown>(moduleName: string) => T;

export type FirebaseUserLike = {
  uid: string;
  isAnonymous?: boolean;
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

function getRawCurrentUser(): unknown {
  return (getAuthInstance() as { currentUser?: unknown }).currentUser ?? null;
}

function isCredentialConflict(error: unknown): boolean {
  const code = (error as { code?: string } | undefined)?.code;
  return code === 'auth/credential-already-in-use'
    || code === 'auth/email-already-in-use'
    || code === 'auth/account-exists-with-different-credential';
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
  const wasAnonymous = getCurrentFirebaseUser()?.isAnonymous === true;

  if (Platform.OS === 'web') {
    const auth = webAuth();
    if (wasAnonymous) {
      try {
        return await auth.linkWithCredential(
          getRawCurrentUser() as never,
          auth.EmailAuthProvider.credential(email, password)
        ) as AuthResultLike;
      } catch (error) {
        if (!isCredentialConflict(error)) throw error;
      }
    }
    return auth.createUserWithEmailAndPassword(
      getAuthInstance() as never,
      email,
      password
    ) as Promise<AuthResultLike>;
  }

  const auth = nativeAuth();
  if (wasAnonymous) {
    try {
      return await auth.linkWithCredential(
        getRawCurrentUser() as never,
        auth.EmailAuthProvider.credential(email, password)
      ) as AuthResultLike;
    } catch (error) {
      if (!isCredentialConflict(error)) throw error;
    }
  }
  return auth.createUserWithEmailAndPassword(
    getAuthInstance() as never,
    email,
    password
  ) as Promise<AuthResultLike>;
}

export async function signInAnonymouslyProvider(): Promise<AuthResultLike> {
  if (Platform.OS === 'web') {
    return webAuth().signInAnonymously(getAuthInstance() as never) as Promise<AuthResultLike>;
  }

  return nativeAuth().signInAnonymously(getAuthInstance() as never) as Promise<AuthResultLike>;
}

export async function signInWithGoogleProvider(): Promise<AuthResultLike> {
  const wasAnonymous = getCurrentFirebaseUser()?.isAnonymous === true;

  if (Platform.OS === 'web') {
    const auth = webAuth();
    const provider = new auth.GoogleAuthProvider();
    if (wasAnonymous) {
      try {
        const result = await auth.linkWithPopup(getRawCurrentUser() as never, provider);
        return {
          user: result.user as FirebaseUserLike,
          additionalUserInfo: auth.getAdditionalUserInfo(result) ?? null,
        };
      } catch (error) {
        if (!isCredentialConflict(error)) throw error;
      }
    }
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
  if (wasAnonymous) {
    try {
      return await auth.linkWithCredential(getRawCurrentUser() as never, credential) as AuthResultLike;
    } catch (error) {
      if (!isCredentialConflict(error)) throw error;
    }
  }
  return auth.signInWithCredential(getAuthInstance() as never, credential) as Promise<AuthResultLike>;
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
  const wasAnonymous = getCurrentFirebaseUser()?.isAnonymous === true;
  let result: AuthResultLike;
  if (wasAnonymous) {
    try {
      result = await auth.linkWithCredential(getRawCurrentUser() as never, appleCredential) as AuthResultLike;
    } catch (error) {
      if (!isCredentialConflict(error)) throw error;
      result = await auth.signInWithCredential(getAuthInstance() as never, appleCredential);
    }
  } else {
    result = await auth.signInWithCredential(getAuthInstance() as never, appleCredential);
  }
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
