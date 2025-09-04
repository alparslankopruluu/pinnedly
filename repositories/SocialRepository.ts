import AsyncStorage from '@react-native-async-storage/async-storage';
import { FollowRelation, ShareItem, ID } from '@/types';

class SocialRepository {
  private follows: FollowRelation[] = [];
  private shares: ShareItem[] = [];

  async initialize(): Promise<void> {
    try {
      const socialData = await AsyncStorage.getItem('social_data');
      if (socialData) {
        const parsed = JSON.parse(socialData);
        this.follows = parsed.follows || [];
        this.shares = parsed.shares || [];
      }
    } catch (error) {
      console.error('Failed to load social data:', error);
    }
  }

  async followUser(followerId: ID, followingId: ID): Promise<void> {
    const existingFollow = this.follows.find(
      f => f.followerId === followerId && f.followingId === followingId
    );
    
    if (existingFollow) return;
    
    const follow: FollowRelation = {
      id: `follow_${Date.now()}`,
      followerId,
      followingId,
      createdAt: Date.now(),
    };
    
    this.follows.push(follow);
    await this.saveData();
  }

  async unfollowUser(followerId: ID, followingId: ID): Promise<void> {
    this.follows = this.follows.filter(
      f => !(f.followerId === followerId && f.followingId === followingId)
    );
    await this.saveData();
  }

  async isFollowing(followerId: ID, followingId: ID): Promise<boolean> {
    return this.follows.some(
      f => f.followerId === followerId && f.followingId === followingId
    );
  }

  async getFollowers(userId: ID): Promise<ID[]> {
    return this.follows
      .filter(f => f.followingId === userId)
      .map(f => f.followerId);
  }

  async getFollowing(userId: ID): Promise<ID[]> {
    return this.follows
      .filter(f => f.followerId === userId)
      .map(f => f.followingId);
  }

  async shareItem(
    fromUserId: ID,
    toUserId: ID,
    itemType: 'bookmark' | 'note' | 'project',
    itemId: ID,
    message?: string
  ): Promise<void> {
    const share: ShareItem = {
      id: `share_${Date.now()}`,
      fromUserId,
      toUserId,
      itemType,
      itemId,
      message,
      isRead: false,
      createdAt: Date.now(),
    };
    
    this.shares.push(share);
    await this.saveData();
  }

  async getSharedItems(userId: ID): Promise<ShareItem[]> {
    return this.shares
      .filter(s => s.toUserId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async markShareAsRead(shareId: ID): Promise<void> {
    const share = this.shares.find(s => s.id === shareId);
    if (share) {
      share.isRead = true;
      await this.saveData();
    }
  }

  async getUnreadShareCount(userId: ID): Promise<number> {
    return this.shares.filter(s => s.toUserId === userId && !s.isRead).length;
  }

  private async saveData(): Promise<void> {
    try {
      const data = {
        follows: this.follows,
        shares: this.shares,
      };
      await AsyncStorage.setItem('social_data', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save social data:', error);
    }
  }
}

export const socialRepository = new SocialRepository();