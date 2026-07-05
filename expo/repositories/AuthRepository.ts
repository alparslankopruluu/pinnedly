import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { User, ID } from '@/types';
import { COLLECTIONS, serverTimestamp } from '@/lib/firestore';

class AuthRepository {
  private currentUser: User | null = null;
  private phoneConfirmation: FirebaseAuthTypes.ConfirmationResult | null = null;

  async initialize(): Promise<void> {
    const webClientId = Constants.expoConfig?.extra?.googleWebClientId as string | undefined;
    if (webClientId) {
      GoogleSignin.configure({ webClientId });
    }

    const firebaseUser = auth().currentUser;
    if (firebaseUser) {
      this.currentUser = await this.loadOrCreateProfile(firebaseUser);
    }
  }

  onAuthStateChanged(listener: (user: User | null) => void): () => void {
    return auth().onAuthStateChanged(async (firebaseUser) => {
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
    const docRef = firestore().collection(COLLECTIONS.users).doc(firebaseUser.uid);
    const doc = await docRef.get();

    if (doc.exists()) {
      return this.mapUserDoc(firebaseUser.uid, doc.data()!, firebaseUser.email);
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

    await docRef.set(profile);
    const created = await docRef.get();
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
      createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
    };
  }

  async signIn(email: string, password: string): Promise<User> {
    const credential = await auth().signInWithEmailAndPassword(email, password);
    this.currentUser = await this.loadOrCreateProfile(credential.user);
    return this.currentUser;
  }

  async signUp(email: string, password: string, displayName: string): Promise<User> {
    const credential = await auth().createUserWithEmailAndPassword(email, password);
    const handle = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);

    await firestore().collection(COLLECTIONS.users).doc(credential.user.uid).set({
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

    const credential = auth.GoogleAuthProvider.credential(idToken);
    const result = await auth().signInWithCredential(credential);
    this.currentUser = await this.loadOrCreateProfile(result.user);
    return this.currentUser;
  }

  async sendPhoneVerification(phoneNumber: string): Promise<void> {
    this.phoneConfirmation = await auth().signInWithPhoneNumber(phoneNumber);
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

    const appleCredential = auth.AppleAuthProvider.credential(credential.identityToken);
    const result = await auth().signInWithCredential(appleCredential);

    if (!result.additionalUserInfo?.isNewUser) {
      this.currentUser = await this.loadOrCreateProfile(result.user);
      return this.currentUser;
    }

    const displayName = credential.fullName
      ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
      : result.user.email?.split('@')[0] || 'User';

    await firestore().collection(COLLECTIONS.users).doc(result.user.uid).set({
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
    await auth().signOut();
    this.currentUser = null;
    this.phoneConfirmation = null;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    if (!this.currentUser) throw new Error('No user logged in');

    await firestore().collection(COLLECTIONS.users).doc(this.currentUser.id).update({
      ...(updates.handle !== undefined && { handle: updates.handle }),
      ...(updates.displayName !== undefined && { displayName: updates.displayName }),
      ...(updates.avatar !== undefined && { avatar: updates.avatar }),
      ...(updates.bio !== undefined && { bio: updates.bio }),
      updatedAt: serverTimestamp(),
    });

    const doc = await firestore().collection(COLLECTIONS.users).doc(this.currentUser.id).get();
    this.currentUser = this.mapUserDoc(this.currentUser.id, doc.data()!, this.currentUser.email);
    return this.currentUser;
  }

  async checkHandleAvailability(handle: string): Promise<boolean> {
    const snapshot = await firestore()
      .collection(COLLECTIONS.users)
      .where('handle', '==', handle.toLowerCase())
      .limit(1)
      .get();
    return snapshot.empty;
  }

  async searchUsers(query: string): Promise<User[]> {
    if (!query.trim()) return [];

    const snapshot = await firestore()
      .collection(COLLECTIONS.users)
      .where('handle', '>=', query.toLowerCase())
      .where('handle', '<=', query.toLowerCase() + '\uf8ff')
      .limit(10)
      .get();

    return snapshot.docs.map((doc) =>
      this.mapUserDoc(doc.id, doc.data(), doc.data().email)
    );
  }

  async getUserById(id: ID): Promise<User | null> {
    const doc = await firestore().collection(COLLECTIONS.users).doc(id).get();
    const data = doc.data();
    if (!doc.exists() || !data) return null;
    return this.mapUserDoc(doc.id, data, data.email);
  }

  async searchUsersByEmail(email: string): Promise<User[]> {
    return this.searchUsers(email);
  }

  async resetPassword(email: string): Promise<void> {
    await auth().sendPasswordResetEmail(email);
  }
}

export const authRepository = new AuthRepository();