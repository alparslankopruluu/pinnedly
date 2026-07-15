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
  updateDoc,
  timestampToMillis,
  where,
} from '@/lib/firestore';
import { shareApi } from '@/services/shareApi';

class AuthRepository {
  private currentUser: User | null = null;
  private phoneConfirmation: {
    confirm: (code: string) => Promise<{ user: FirebaseUserLike } | null>;
  } | null = null;

  private handleBase(email?: string | null): string {
    const base = (email?.split('@')[0] || 'user')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 24);
    return base.length >= 3 ? base : `user${base}`.slice(0, 24);
  }

  private async isHandleAvailable(handle: string, excludeUserId?: string): Promise<boolean> {
    const snapshot = await getDocs(
      firestoreQuery(
        collection(getDb(), COLLECTIONS.users),
        where('handle', '==', handle),
        limit(1)
      )
    );
    return snapshot.empty || snapshot.docs[0].id === excludeUserId;
  }

  private async generateAvailableHandle(email?: string | null): Promise<string> {
    const base = this.handleBase(email);
    if (await this.isHandleAvailable(base)) return base;

    for (let suffix = 2; suffix <= 999; suffix += 1) {
      const candidate = `${base.slice(0, 30 - String(suffix).length)}${suffix}`;
      if (await this.isHandleAvailable(candidate)) return candidate;
    }
    return `${base.slice(0, 24)}${Date.now().toString().slice(-6)}`;
  }

  private async migrateLegacyGeneratedHandle(
    userId: string,
    email: string | null | undefined,
    data: DocumentData
  ): Promise<DocumentData> {
    const base = this.handleBase(email);
    const current = typeof data.handle === 'string' ? data.handle : '';
    const legacyPattern = new RegExp(`^${base}[a-z0-9]{2}(?:[a-z0-9]{2})?$`);
    if (!legacyPattern.test(current)) return data;

    try {
      if (!(await this.isHandleAvailable(base, userId))) return data;
      await updateDoc(doc(getDb(), COLLECTIONS.users, userId), {
        handle: base,
        updatedAt: serverTimestamp(),
      });
      return { ...data, handle: base };
    } catch (error) {
      // A profile migration must never block authentication. The user can still
      // choose a cleaner handle from Edit Profile if rules/network are unavailable.
      console.warn('Could not migrate legacy generated handle:', error);
      return data;
    }
  }

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
      const data = await this.migrateLegacyGeneratedHandle(
        firebaseUser.uid,
        firebaseUser.email,
        userDoc.data()
      );
      return this.mapUserDoc(firebaseUser.uid, data, firebaseUser.email);
    }

    const handle = await this.generateAvailableHandle(firebaseUser.email);

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
    const handle = await this.generateAvailableHandle(email);

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
      handle: await this.generateAvailableHandle(result.user.email),
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
    return this.isHandleAvailable(normalized, this.currentUser?.id);
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
