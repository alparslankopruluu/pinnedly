import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { User, AuthState } from '@/types';
import { authRepository } from '@/repositories/AuthRepository';
import { socialRepository } from '@/repositories/SocialRepository';
import { slugRepository } from '@/repositories/SlugRepository';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      console.log('Initializing auth...');
      await authRepository.initialize();
      
      const user = authRepository.getCurrentUser();
      if (user) {
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        // Create a test user for development
        const testUser: User = {
          id: 'test-user-123',
          handle: 'testuser',
          email: 'test@example.com',
          displayName: 'Test User',
          followerCount: 0,
          followingCount: 0,
          createdAt: Date.now(),
        };
        
        setAuthState({
          user: testUser,
          isAuthenticated: true,
          isLoading: false,
        });
        
        console.log('Created test user for development');
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      // Still create test user on error for development
      const testUser: User = {
        id: 'test-user-123',
        handle: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        followerCount: 0,
        followingCount: 0,
        createdAt: Date.now(),
      };
      
      setAuthState({
        user: testUser,
        isAuthenticated: true,
        isLoading: false,
      });
    }
  };

  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      const user = await authRepository.signIn(email, password);
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      const user = await authRepository.signUp(email, password, displayName);
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await authRepository.signOut();
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<User>): Promise<void> => {
    if (!authState.user) return;
    
    try {
      const updatedUser = await authRepository.updateProfile(updates);
      setAuthState(prev => ({
        ...prev,
        user: updatedUser,
      }));
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
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
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const searchUsersByEmail = useCallback(async (email: string): Promise<User[]> => {
    return authRepository.searchUsersByEmail(email);
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<void> => {
    return authRepository.resetPassword(email);
  }, []);

  return useMemo(() => ({
    ...authState,
    signIn,
    signUp,
    signOut,
    updateProfile,
    checkHandleAvailability,
    searchUsers,
    getUserById,
    signInWithApple,
    searchUsersByEmail,
    resetPassword,
  }), [authState, signIn, signUp, signOut, updateProfile, checkHandleAvailability, searchUsers, getUserById, signInWithApple, searchUsersByEmail, resetPassword]);
});