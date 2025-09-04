import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthState, ID } from '@/types';

class AuthRepository {
  private currentUser: User | null = null;
  private users: User[] = [];

  async initialize(): Promise<void> {
    try {
      const userData = await AsyncStorage.getItem('auth_data');
      if (userData) {
        const parsed = JSON.parse(userData);
        this.currentUser = parsed.currentUser;
        this.users = parsed.users || [];
      }
      
      // Seed some mock users if empty
      if (this.users.length === 0) {
        this.seedMockUsers();
      }
    } catch (error) {
      console.error('Failed to load auth data:', error);
    }
  }

  private seedMockUsers(): void {
    const mockUsers: User[] = [
      {
        id: 'user_1',
        handle: 'johndoe',
        email: 'john@example.com',
        displayName: 'John Doe',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        bio: 'Product designer & coffee enthusiast',
        isVerified: true,
        followerCount: 1234,
        followingCount: 567,
        createdAt: Date.now() - 86400000 * 30,
      },
      {
        id: 'user_2',
        handle: 'sarahsmith',
        email: 'sarah@example.com',
        displayName: 'Sarah Smith',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
        bio: 'Frontend developer & tech blogger',
        followerCount: 892,
        followingCount: 234,
        createdAt: Date.now() - 86400000 * 15,
      },
      {
        id: 'user_3',
        handle: 'mikejohnson',
        email: 'mike@example.com',
        displayName: 'Mike Johnson',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        bio: 'Startup founder & investor',
        followerCount: 2156,
        followingCount: 89,
        createdAt: Date.now() - 86400000 * 45,
      },
    ];
    
    this.users = mockUsers;
    this.saveData();
  }

  async signIn(email: string, password: string): Promise<User> {
    // Mock authentication - in real app, this would call an API
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    
    let user = this.users.find(u => u.email === email);
    
    if (!user) {
      // Create new user for demo
      user = {
        id: `user_${Date.now()}`,
        handle: email.split('@')[0],
        email,
        displayName: email.split('@')[0],
        followerCount: 0,
        followingCount: 0,
        createdAt: Date.now(),
      };
      this.users.push(user);
    }
    
    this.currentUser = user;
    await this.saveData();
    return user;
  }

  async signUp(email: string, password: string, displayName: string): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const existingUser = this.users.find(u => u.email === email);
    if (existingUser) {
      throw new Error('User already exists');
    }
    
    const user: User = {
      id: `user_${Date.now()}`,
      handle: email.split('@')[0],
      email,
      displayName,
      followerCount: 0,
      followingCount: 0,
      createdAt: Date.now(),
    };
    
    this.users.push(user);
    this.currentUser = user;
    await this.saveData();
    return user;
  }

  async signOut(): Promise<void> {
    this.currentUser = null;
    await this.saveData();
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }
    
    this.currentUser = { ...this.currentUser, ...updates };
    
    // Update in users array
    const index = this.users.findIndex(u => u.id === this.currentUser!.id);
    if (index !== -1) {
      this.users[index] = this.currentUser;
    }
    
    await this.saveData();
    return this.currentUser;
  }

  async checkHandleAvailability(handle: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return !this.users.some(u => u.handle.toLowerCase() === handle.toLowerCase());
  }

  async searchUsers(query: string): Promise<User[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (!query.trim()) return [];
    
    return this.users.filter(user => 
      user.handle.toLowerCase().includes(query.toLowerCase()) ||
      user.displayName.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);
  }

  async getUserById(id: ID): Promise<User | null> {
    return this.users.find(u => u.id === id) || null;
  }

  private async saveData(): Promise<void> {
    try {
      const data = {
        currentUser: this.currentUser,
        users: this.users,
      };
      await AsyncStorage.setItem('auth_data', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save auth data:', error);
    }
  }
}

export const authRepository = new AuthRepository();