import { supabase } from '@/lib/supabase';
import { User, AuthState, ID } from '@/types';
import { AuthError } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

class AuthRepository {
  private currentUser: User | null = null;

  async initialize(): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Temporarily skip profile loading to prevent database errors
        console.log('User session found, but skipping profile loading for now');
        // const profile = await this.getProfileById(session.user.id);
        // if (profile) {
        //   this.currentUser = profile;
        // }
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    }
  }

  private async getProfileById(id: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        handle: data.handle,
        email: '', // We'll get this from auth.user
        displayName: data.display_name,
        avatar: data.avatar_url,
        bio: data.bio,
        isVerified: data.is_verified,
        followerCount: data.follower_count,
        followingCount: data.following_count,
        createdAt: new Date(data.created_at).getTime(),
      };
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }

  async signIn(email: string, password: string): Promise<User> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error('No user returned from sign in');
      }

      const profile = await this.getProfileById(data.user.id);
      if (!profile) {
        throw new Error('Profile not found');
      }

      this.currentUser = { ...profile, email: data.user.email || '' };
      return this.currentUser;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async signUp(email: string, password: string, displayName: string): Promise<User> {
    try {
      console.log('Starting sign up process for:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('Supabase auth sign up error:', error);
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error('No user returned from sign up');
      }

      console.log('User created successfully:', data.user.id);
      console.log('Creating profile for user...');

      // Create profile
      const handle = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      
      console.log('Attempting to insert profile with data:', {
        id: data.user.id,
        handle,
        display_name: displayName,
      });
      
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          handle,
          display_name: displayName,
          is_verified: false,
          follower_count: 0,
          following_count: 0,
        });

      if (profileError) {
        console.error('Profile creation error details:', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
        });
        throw new Error('Failed to create profile');
      }
      
      console.log('Profile created successfully');

      const user: User = {
        id: data.user.id,
        handle,
        email,
        displayName,
        followerCount: 0,
        followingCount: 0,
        createdAt: Date.now(),
      };

      this.currentUser = user;
      return user;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
      this.currentUser = null;
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          handle: updates.handle,
          display_name: updates.displayName,
          avatar_url: updates.avatar,
          bio: updates.bio,
        })
        .eq('id', this.currentUser.id);

      if (error) {
        throw new Error(error.message);
      }

      this.currentUser = { ...this.currentUser, ...updates };
      return this.currentUser;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  async checkHandleAvailability(handle: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('handle', handle.toLowerCase())
        .single();

      return !data; // Available if no data found
    } catch (error) {
      return true; // Assume available on error
    }
  }

  async searchUsers(query: string): Promise<User[]> {
    if (!query.trim()) return [];

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`handle.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(10);

      if (error || !data) return [];

      return data.map(profile => ({
        id: profile.id,
        handle: profile.handle,
        email: '',
        displayName: profile.display_name,
        avatar: profile.avatar_url,
        bio: profile.bio,
        isVerified: profile.is_verified,
        followerCount: profile.follower_count,
        followingCount: profile.following_count,
        createdAt: new Date(profile.created_at).getTime(),
      }));
    } catch (error) {
      console.error('Search users error:', error);
      return [];
    }
  }

  async getUserById(id: ID): Promise<User | null> {
    return this.getProfileById(id);
  }

  async signInWithApple(): Promise<User> {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign-In is only available on iOS');
    }

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('No identity token received from Apple');
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error('No user returned from Apple sign in');
      }

      // Check if profile exists
      let profile = await this.getProfileById(data.user.id);
      
      if (!profile) {
        // Create profile for new Apple user
        const displayName = credential.fullName 
          ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
          : data.user.email?.split('@')[0] || 'User';
        
        const handle = (data.user.email?.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9]/g, '') + Math.random().toString(36).substr(2, 4);
        
        console.log('Creating Apple user profile with data:', {
          id: data.user.id,
          handle,
          display_name: displayName,
        });
        
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            handle,
            display_name: displayName,
            is_verified: false,
            follower_count: 0,
            following_count: 0,
          });

        if (profileError) {
          console.error('Apple profile creation error details:', {
            code: profileError.code,
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint,
          });
          throw new Error('Failed to create profile');
        }
        
        console.log('Apple user profile created successfully');

        profile = {
          id: data.user.id,
          handle,
          email: data.user.email || '',
          displayName,
          followerCount: 0,
          followingCount: 0,
          createdAt: Date.now(),
        };
      }

      this.currentUser = { ...profile, email: data.user.email || '' };
      return this.currentUser;
    } catch (error) {
      console.error('Apple sign in error:', error);
      throw error;
    }
  }

  async searchUsersByEmail(email: string): Promise<User[]> {
    if (!email.trim()) return [];

    try {
      // First search in profiles by email (we'll need to add email to profiles or use auth.users)
      // For now, let's search by handle and display_name
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`handle.ilike.%${email}%,display_name.ilike.%${email}%`)
        .limit(10);

      if (error || !data) return [];

      return data.map(profile => ({
        id: profile.id,
        handle: profile.handle,
        email: '',
        displayName: profile.display_name,
        avatar: profile.avatar_url,
        bio: profile.bio,
        isVerified: profile.is_verified,
        followerCount: profile.follower_count,
        followingCount: profile.following_count,
        createdAt: new Date(profile.created_at).getTime(),
      }));
    } catch (error) {
      console.error('Search users by email error:', error);
      return [];
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://your-app.com/reset-password',
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }

}

export const authRepository = new AuthRepository();