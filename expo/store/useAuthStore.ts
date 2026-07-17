import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { User, AuthState } from '@/types';
import { authRepository } from '@/repositories/AuthRepository';
import {
  setAnalyticsUserId,
  setAnalyticsUserProperties,
  trackAuthEvent,
  type AuthMethod,
} from '@/lib/analytics';
import { setCrashlyticsUser, recordError, logCrashlytics } from '@/lib/crashlytics';
import { logOutRevenueCat } from '@/lib/revenuecat';

function handleAuthFailure(method: AuthMethod, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Unknown auth error';
  trackAuthEvent('auth_failed', method, { error_message: message });
  recordError(error instanceof Error ? error : new Error(message), `auth:${method}`);
}

async function handleAuthSuccess(user: User, method: AuthMethod, isNewUser = false): Promise<void> {
  await setAnalyticsUserId(user.id);
  await setCrashlyticsUser(user.id);
  await setAnalyticsUserProperties({
    auth_method: method,
    user_handle: user.handle,
  });
  logCrashlytics(`User authenticated via ${method}: ${user.id}`);
  await trackAuthEvent(isNewUser ? 'sign_up' : 'login', method);
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isGuest: false,
    isLoading: true,
  });

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const init = async () => {
      try {
        await authRepository.initialize();
        unsubscribe = authRepository.onAuthStateChanged(async (user, isGuest) => {
          if (!user) {
            await setAnalyticsUserId(null);
            await setCrashlyticsUser(null);
          }
          setAuthState({
            user,
            isAuthenticated: !!user,
            isGuest,
            isLoading: false,
          });
        });
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        recordError(error instanceof Error ? error : new Error('Auth init failed'), 'auth:init');
        setAuthState({
          user: null,
          isAuthenticated: false,
          isGuest: false,
          isLoading: false,
        });
      }
    };

    init();

    return () => {
      unsubscribe?.();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      const user = await authRepository.signIn(email, password);
      await handleAuthSuccess(user, 'email');
      setAuthState({ user, isAuthenticated: true, isGuest: false, isLoading: false });
    } catch (error) {
      handleAuthFailure('email', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      const user = await authRepository.signUp(email, password, displayName);
      await handleAuthSuccess(user, 'email', true);
      setAuthState({ user, isAuthenticated: true, isGuest: false, isLoading: false });
    } catch (error) {
      handleAuthFailure('email', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      const user = await authRepository.signInWithGoogle();
      await handleAuthSuccess(user, 'google');
      setAuthState({ user, isAuthenticated: true, isGuest: false, isLoading: false });
    } catch (error) {
      handleAuthFailure('google', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await trackAuthEvent('logout');
      await logOutRevenueCat();
      await authRepository.signOut();
      await setAnalyticsUserId(null);
      await setCrashlyticsUser(null);
      setAuthState({
        user: null,
        isAuthenticated: false,
        isGuest: false,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to sign out:', error);
      recordError(error instanceof Error ? error : new Error('Sign out failed'), 'auth:sign_out');
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<User>): Promise<void> => {
    if (!authState.user) return;

    const updatedUser = await authRepository.updateProfile(updates);
    setAuthState(prev => ({
      ...prev,
      user: updatedUser,
    }));
  }, [authState.user]);

  const checkHandleAvailability = useCallback(async (handle: string): Promise<boolean> => {
    return authRepository.checkHandleAvailability(handle);
  }, []);

  const searchUsers = useCallback(async (query: string): Promise<User[]> => {
    return authRepository.searchUsers(query);
  }, []);

  const getUserById = useCallback(async (id: string): Promise<User | null> => {
    return authRepository.getUserById(id);
  }, []);

  const signInWithApple = useCallback(async (): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      const user = await authRepository.signInWithApple();
      await handleAuthSuccess(user, 'apple');
      setAuthState({ user, isAuthenticated: true, isGuest: false, isLoading: false });
    } catch (error) {
      handleAuthFailure('apple', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const searchUsersByEmail = useCallback(async (email: string): Promise<User[]> => {
    return authRepository.searchUsersByEmail(email);
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<void> => {
    try {
      await authRepository.resetPassword(email);
      await trackAuthEvent('password_reset', 'email');
    } catch (error) {
      handleAuthFailure('email', error);
      throw error;
    }
  }, []);

  const continueAsGuest = useCallback(async (): Promise<void> => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));
    try {
      await authRepository.continueAsGuest();
      await setAnalyticsUserId(null);
      await setCrashlyticsUser(null);
      setAuthState({ user: null, isAuthenticated: false, isGuest: true, isLoading: false });
    } catch (error) {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  return useMemo(() => ({
    ...authState,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    updateProfile,
    checkHandleAvailability,
    searchUsers,
    getUserById,
    signInWithApple,
    searchUsersByEmail,
    resetPassword,
    continueAsGuest,
  }), [authState, signIn, signUp, signOut, signInWithGoogle, updateProfile, checkHandleAvailability, searchUsers, getUserById, signInWithApple, searchUsersByEmail, resetPassword, continueAsGuest]);
});
