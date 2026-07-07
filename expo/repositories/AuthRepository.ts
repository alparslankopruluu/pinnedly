import {
  AppleAuthProvider,
  createUserWithEmailAndPassword,
  FirebaseAuthTypes,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
} from '@react-native-firebase/auth';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { User, ID } from '@/types';
import {
  COLLECTIONS,
  collection,
  doc,
  getDb,
  getDoc,
  getDocs,
  limit,
  query as firestoreQuery,
  serverTimestamp,
  setDoc,
  timestampToMillis,
  where,
} from '@/lib/firestore';
import { shareApi } from '@/services/shareApi';

class AuthRepository {
  private currentUser: User | null = null;
  private phoneConfirmation: FirebaseAuthTypes.ConfirmationResult | null = null;

  async initialize(): Promise<void> {
    const webClientId = Constants.expoConfig?.extra?.googleWebClientId as string | undefined;
    if (webClientId) {
      GoogleSignin.configure({ webClientId });
    }

    const firebaseUser = getAuth().currentUser;
    if (firebaseUser) {
      this.currentUser = await this.loadOrCreateProfile(firebaseUser);
    }
  }

  onAuthStateChanged(listener: (user: User | null) => void): () => void {
    return onAuthStateChanged(getAuth(), async (firebaseUser) => {
      if (!firebaseUser) {
        this.currentUser = null;
        listener(null);
        return;
      }
      this.currentUser = await this.loadOrCreateProfile(firebaseUser);
      listener(this.currentUser);
    });
  }

  private async loadOrCreateProfile(firebaseUser: FirebaseAuthTypes.User): Promise<User> {
    const docRef = doc(getDb(), COLLECTIONS.users, firebaseUser.uid);
    const userDoc = await getDoc(docRef);

    if (userDoc.exists()) {
      return this.mapUserDoc(firebaseUser.uid, userDoc.data(), firebaseUser.email);
    }

    const handle = (firebaseUser.email?.split('@')[0] || 'user')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 20) + Math.random().toString(36).slice(2, 6);

    const profile = {
      handle,
      displayName: firebaseUser.displayName || handle,
      email: firebaseUser.email || '',
      avatar: firebaseUser.photoURL || null,
      bio: null,
      isVerified: false,
      followerCount: 0,
      followingCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, profile);
    const created = await getDoc(docRef);
    return this.mapUserDoc(firebaseUser.uid, created.data()!, firebaseUser.email);
  }

  private mapUserDoc(id: string, data: FirebaseFirestoreTypes.DocumentData, email?: string | null): User {
    return {
      id,
      handle: data.handle as string,
      email: (data.email as string) || email || '',
      displayName: data.displayName as string,
      avatar: data.avatar as string | undefined,
      bio: data.bio as string | undefined,
      isVerified: (data.isVerified as boolean) ?? false,
      followerCount: (data.followerCount as number) ?? 0,
      followingCount: (data.followingCount as number) ?? 0,
      createdAt: timestampToMillis(data.createdAt),
    };
  }

  async signIn(email: string, password: string): Promise<User> {
    const credential = await signInWithEmailAndPassword(getAuth(), email, password);
    this.currentUser = await this.loadOrCreateProfile(credential.user);
    return this.currentUser;
  }

  async signUp(email: string, password: string, displayName: string): Promise<User> {
    const credential = await createUserWithEmailAndPassword(getAuth(), email, password);
    const handle = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);

    await setDoc(doc(getDb(), COLLECTIONS.users, credential.user.uid), {
      handle,
      displayName,
      email,
      avatar: null,
      bio: null,
      isVerified: false,
      followerCount: 0,
      followingCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    this.currentUser = await this.loadOrCreateProfile(credential.user);
    return this.currentUser;
  }

  async signInWithGoogle(): Promise<User> {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const signInResult = await GoogleSignin.signIn();
    const idToken = signInResult.data?.idToken;
    if (!idToken) throw new Error('No Google ID token received');

    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(getAuth(), credential);
    this.currentUser = await this.loadOrCreateProfile(result.user);
    return this.currentUser;
  }

  async sendPhoneVerification(phoneNumber: string): Promise<void> {
    this.phoneConfirmation = await signInWithPhoneNumber(getAuth(), phoneNumber);
  }

  async confirmPhoneCode(code: string): Promise<User> {
    if (!this.phoneConfirmation) {
      throw new Error('No phone verification in progress. Send code first.');
    }
    const credential = await this.phoneConfirmation.confirm(code);
    if (!credential?.user) throw new Error('Phone verification failed');
    this.currentUser = await this.loadOrCreateProfile(credential.user);
    this.phoneConfirmation = null;
    return this.currentUser;
  }

  async signInWithApple(): Promise<User> {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign-In is only available on iOS');
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('No identity token received from Apple');
    }

    const appleCredential = AppleAuthProvider.credential(credential.identityToken);
    const result = await signInWithCredential(getAuth(), appleCredential);

    if (!result.additionalUserInfo?.isNewUser) {
      this.currentUser = await this.loadOrCreateProfile(result.user);
      return this.currentUser;
    }

    const displayName = credential.fullName
      ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
      : result.user.email?.split('@')[0] || 'User';

    await setDoc(doc(getDb(), COLLECTIONS.users, result.user.uid), {
      handle: (result.user.email?.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9]/g, '') + Math.random().toString(36).slice(2, 4),
      displayName,
      email: result.user.email || '',
      avatar: null,
      bio: null,
      isVerified: false,
      followerCount: 0,
      followingCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    this.currentUser = await this.loadOrCreateProfile(result.user);
    return this.currentUser;
  }

  async signOut(): Promise<void> {
    try {
      await GoogleSignin.signOut();
    } catch {
      // User may not have signed in with Google
    }
    await firebaseSignOut(getAuth());
    this.currentUser = null;
    this.phoneConfirmation = null;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    if (!this.currentUser) throw new Error('No user logged in');

    this.currentUser = await shareApi.updateProfile({
      displayName: updates.displayName ?? this.currentUser.displayName,
      handle: updates.handle ?? this.currentUser.handle,
      bio: updates.bio !== undefined ? updates.bio : this.currentUser.bio,
      avatar: updates.avatar !== undefined ? updates.avatar : this.currentUser.avatar,
    });
    return this.currentUser;
  }

  async checkHandleAvailability(handle: string): Promise<boolean> {
    const normalized = handle.toLowerCase();
    if (this.currentUser?.handle === normalized) return true;

    const snapshot = await getDocs(
      firestoreQuery(
        collection(getDb(), COLLECTIONS.users),
        where('handle', '==', normalized),
        limit(1)
      )
    );

    if (snapshot.empty) return true;
    return snapshot.docs[0].id === this.currentUser?.id;
  }

  async searchUsers(query: string): Promise<User[]> {
    if (!query.trim()) return [];

    const snapshot = await getDocs(
      firestoreQuery(
        collection(getDb(), COLLECTIONS.users),
        where('handle', '>=', query.toLowerCase()),
        where('handle', '<=', query.toLowerCase() + '\uf8ff'),
        limit(10)
      )
    );

    return snapshot.docs.map((doc) =>
      this.mapUserDoc(doc.id, doc.data(), doc.data().email)
    );
  }

  async getUserById(id: ID): Promise<User | null> {
    const userDoc = await getDoc(doc(getDb(), COLLECTIONS.users, id));
    const data = userDoc.data();
    if (!userDoc.exists() || !data) return null;
    return this.mapUserDoc(userDoc.id, data, data.email);
  }

  async searchUsersByEmail(email: string): Promise<User[]> {
    return this.searchUsers(email);
  }

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(getAuth(), email);
  }
}

export const authRepository = new AuthRepository();
