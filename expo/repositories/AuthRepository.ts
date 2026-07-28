import { User, ID, Note } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  configureAuthProviders,
  createEmailUser,
  getCurrentFirebaseUser,
  onFirebaseAuthStateChanged,
  sendPasswordReset,
  signInWithAppleProvider,
  signInWithEmail,
  signInWithGoogleProvider,
  signInAnonymouslyProvider,
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
import { noteRepository } from '@/repositories/NoteRepository';

class AuthRepository {
  private currentUser: User | null = null;
  private guestMode = false;
  private readonly profileLoads = new Map<string, Promise<User>>();

  private static readonly GUEST_MODE_KEY = 'draft:guest-mode';

  private async setGuestMode(enabled: boolean): Promise<void> {
    this.guestMode = enabled;
    if (enabled) {
      await AsyncStorage.setItem(AuthRepository.GUEST_MODE_KEY, 'true');
    } else {
      await AsyncStorage.removeItem(AuthRepository.GUEST_MODE_KEY);
    }
  }

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

    this.guestMode = (await AsyncStorage.getItem(AuthRepository.GUEST_MODE_KEY)) === 'true';

    const firebaseUser = getCurrentFirebaseUser();
    if (firebaseUser?.isAnonymous) {
      await this.setGuestMode(true);
      this.currentUser = null;
    } else if (firebaseUser) {
      await this.setGuestMode(false);
      this.currentUser = await this.loadOrCreateProfile(firebaseUser);
    }
  }

  onAuthStateChanged(listener: (user: User | null, isGuest: boolean) => void): () => void {
    return onFirebaseAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        this.currentUser = null;
        listener(null, this.guestMode);
        return;
      }
      if (firebaseUser.isAnonymous) {
        await this.setGuestMode(true);
        this.currentUser = null;
        listener(null, true);
        return;
      }
      await this.setGuestMode(false);
      this.currentUser = await this.loadOrCreateProfile(firebaseUser);
      listener(this.currentUser, false);
    });
  }

  async continueAsGuest(): Promise<void> {
    this.currentUser = null;
    await this.setGuestMode(true);

    const current = getCurrentFirebaseUser();
    if (current?.isAnonymous) return;
    if (current) await signOutFromAuth();

    try {
      await signInAnonymouslyProvider();
    } catch (error) {
      // Public content remains available without Firebase Auth. Keeping a local
      // guest session also makes the app usable while offline or while the
      // Anonymous provider is being enabled in Firebase Console.
      console.warn('Firebase anonymous sign-in unavailable; using local guest mode:', error);
    }
  }

  private async loadOrCreateProfile(
    firebaseUser: FirebaseUserLike,
    options?: { displayName?: string }
  ): Promise<User> {
    const activeLoad = this.profileLoads.get(firebaseUser.uid);
    if (activeLoad) {
      const user = await activeLoad;
      // If a concurrent auth-state create already finished, still apply the
      // explicit displayName from email sign-up when the profile only has the
      // generated handle as its name.
      if (options?.displayName?.trim()) {
        return this.applyDisplayNameIfNeeded(user, options.displayName.trim());
      }
      return user;
    }

    const profileLoad = this.loadOrCreateProfileOnce(firebaseUser, options);
    this.profileLoads.set(firebaseUser.uid, profileLoad);

    try {
      return await profileLoad;
    } finally {
      if (this.profileLoads.get(firebaseUser.uid) === profileLoad) {
        this.profileLoads.delete(firebaseUser.uid);
      }
    }
  }

  private async applyDisplayNameIfNeeded(user: User, displayName: string): Promise<User> {
    if (!displayName || user.displayName === displayName) return user;
    // Only overwrite placeholder names (handle / email local-part), not a
    // name the user already set.
    const isPlaceholder =
      !user.displayName
      || user.displayName === user.handle
      || user.displayName === (user.email?.split('@')[0] ?? '');
    if (!isPlaceholder) return user;

    try {
      await updateDoc(doc(getDb(), COLLECTIONS.users, user.id), {
        displayName,
        updatedAt: serverTimestamp(),
      });
      const updated = { ...user, displayName };
      this.currentUser = updated;
      return updated;
    } catch (error) {
      console.warn('Could not apply sign-up display name:', error);
      return user;
    }
  }

  private async loadOrCreateProfileOnce(
    firebaseUser: FirebaseUserLike,
    options?: { displayName?: string }
  ): Promise<User> {
    const docRef = doc(getDb(), COLLECTIONS.users, firebaseUser.uid);
    const userDoc = await getDoc(docRef);

    if (userDoc.exists()) {
      const data = await this.migrateLegacyGeneratedHandle(
        firebaseUser.uid,
        firebaseUser.email,
        userDoc.data()
      );
      const mapped = this.mapUserDoc(firebaseUser.uid, data, firebaseUser.email);
      if (options?.displayName?.trim()) {
        return this.applyDisplayNameIfNeeded(mapped, options.displayName.trim());
      }
      return mapped;
    }

    const handle = await this.generateAvailableHandle(firebaseUser.email);
    const displayName =
      options?.displayName?.trim()
      || firebaseUser.displayName
      || handle;

    const profile = {
      handle,
      displayName,
      email: firebaseUser.email || '',
      avatar: firebaseUser.photoURL || null,
      bio: null,
      isVerified: false,
      followerCount: 0,
      followingCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(docRef, profile);
    } catch (error) {
      // Auth state listener often creates the profile first; a second create
      // is rejected as an update that may not include only allowed fields.
      const code = (error as { code?: string } | undefined)?.code ?? '';
      if (code.includes('permission-denied') || code.includes('already-exists')) {
        const raced = await getDoc(docRef);
        if (raced.exists()) {
          const mapped = this.mapUserDoc(firebaseUser.uid, raced.data()!, firebaseUser.email);
          if (options?.displayName?.trim()) {
            return this.applyDisplayNameIfNeeded(mapped, options.displayName.trim());
          }
          return mapped;
        }
      }
      throw error;
    }

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

  private async captureGuestNotesSnapshot(): Promise<Note[]> {
    if (getCurrentFirebaseUser()?.isAnonymous !== true) return [];
    try {
      return await noteRepository.getNotes();
    } catch (error) {
      console.warn('Could not read guest notes before sign-in:', error);
      return [];
    }
  }

  private async migrateGuestNotesIfNeeded(
    previousUid: string | null,
    guestNotes: Note[],
    newUid: string
  ): Promise<void> {
    if (!previousUid || !guestNotes.length || newUid === previousUid) return;
    for (const note of guestNotes) {
      try {
        await noteRepository.createNote({
          title: note.title,
          markdown: note.markdown,
          visibility: note.visibility,
          category: note.category,
          reminderSchedule: note.reminderSchedule,
          links: note.links,
        });
      } catch (error) {
        console.warn(`Could not migrate guest note "${note.title}":`, error);
      }
    }
  }

  async signIn(email: string, password: string): Promise<User> {
    await this.setGuestMode(false);
    const previousUid = getCurrentFirebaseUser()?.uid ?? null;
    const guestNotes = await this.captureGuestNotesSnapshot();
    const credential = await signInWithEmail(email, password);
    await this.migrateGuestNotesIfNeeded(previousUid, guestNotes, credential.user.uid);
    this.currentUser = await this.loadOrCreateProfile(credential.user);
    return this.currentUser;
  }

  async signUp(email: string, password: string, displayName: string): Promise<User> {
    await this.setGuestMode(false);
    const previousUid = getCurrentFirebaseUser()?.uid ?? null;
    const guestNotes = await this.captureGuestNotesSnapshot();
    const credential = await createEmailUser(email, password);
    await this.migrateGuestNotesIfNeeded(previousUid, guestNotes, credential.user.uid);
    // Single profile path — a separate setDoc here raced with onAuthStateChanged
    // and failed as a forbidden update (handle/email not writable on update).
    this.currentUser = await this.loadOrCreateProfile(credential.user, {
      displayName: displayName.trim(),
    });
    return this.currentUser;
  }

  async signInWithGoogle(): Promise<User> {
    await this.setGuestMode(false);
    const previousUid = getCurrentFirebaseUser()?.uid ?? null;
    const guestNotes = await this.captureGuestNotesSnapshot();
    const result = await signInWithGoogleProvider();
    await this.migrateGuestNotesIfNeeded(previousUid, guestNotes, result.user.uid);
    this.currentUser = await this.loadOrCreateProfile(result.user);
    return this.currentUser;
  }

  async signInWithApple(): Promise<User> {
    await this.setGuestMode(false);
    const previousUid = getCurrentFirebaseUser()?.uid ?? null;
    const guestNotes = await this.captureGuestNotesSnapshot();
    const result = await signInWithAppleProvider();
    await this.migrateGuestNotesIfNeeded(previousUid, guestNotes, result.user.uid);

    const displayName =
      result.displayName
      || result.user.displayName
      || result.user.email?.split('@')[0]
      || undefined;

    this.currentUser = await this.loadOrCreateProfile(
      result.user,
      displayName ? { displayName } : undefined
    );
    return this.currentUser;
  }

  async signOut(): Promise<void> {
    await signOutFromAuth();
    await this.setGuestMode(false);
    this.currentUser = null;
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
