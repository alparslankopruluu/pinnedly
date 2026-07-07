import { User, ID } from '@/types';
import {
  configureAuthProviders,
  createEmailUser,
  getCurrentFirebaseUser,
  onFirebaseAuthStateChanged,
  sendPasswordReset,
  sendPhoneVerificationCode,
  signInWithAppleProvider,
  signInWithEmail,
  signInWithGoogleProvider,
  signOutFromAuth,
  type FirebaseUserLike,
} from '@/lib/auth';
import {
  COLLECTIONS,
  collection,
  type DocumentData,
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
  private phoneConfirmation: {
    confirm: (code: string) => Promise<{ user: FirebaseUserLike } | null>;
  } | null = null;

  async initialize(): Promise<void> {
    configureAuthProviders();

    const firebaseUser = getCurrentFirebaseUser();
    if (firebaseUser) {
      this.currentUser = await this.loadOrCreateProfile(firebaseUser);
    }
  }

  onAuthStateChanged(listener: (user: User | null) => void): () => void {
    return onFirebaseAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        this.currentUser = null;
        listener(null);
        return;
      }
      this.currentUser = await this.loadOrCreateProfile(firebaseUser);
      listener(this.currentUser);
    });
  }

  private async loadOrCreateProfile(firebaseUser: FirebaseUserLike): Promise<User> {
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

  private mapUserDoc(id: string, data: DocumentData, email?: string | null): User {
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
    const credential = await signInWithEmail(email, password);
    this.currentUser = await this.loadOrCreateProfile(credential.user);
    return this.currentUser;
  }

  async signUp(email: string, password: string, displayName: string): Promise<User> {
    const credential = await createEmailUser(email, password);
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
    const result = await signInWithGoogleProvider();
    this.currentUser = await this.loadOrCreateProfile(result.user);
    return this.currentUser;
  }

  async sendPhoneVerification(phoneNumber: string): Promise<void> {
    this.phoneConfirmation = await sendPhoneVerificationCode(phoneNumber);
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
    const result = await signInWithAppleProvider();

    if (!result.additionalUserInfo?.isNewUser) {
      this.currentUser = await this.loadOrCreateProfile(result.user);
      return this.currentUser;
    }

    const displayName = result.displayName || result.user.email?.split('@')[0] || 'User';

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
    await signOutFromAuth();
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
    await sendPasswordReset(email);
  }
}

export const authRepository = new AuthRepository();
