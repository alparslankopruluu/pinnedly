import AsyncStorage from '@react-native-async-storage/async-storage';
import { PublicSlug, ID } from '@/types';

class SlugRepository {
  private slugs: PublicSlug[] = [];

  async initialize(): Promise<void> {
    try {
      const slugData = await AsyncStorage.getItem('slug_data');
      if (slugData) {
        const parsed = JSON.parse(slugData);
        this.slugs = parsed.slugs || [];
      }
    } catch (error) {
      console.error('Failed to load slug data:', error);
    }
  }

  async createSlug(
    itemType: 'bookmark' | 'note' | 'project',
    itemId: ID,
    userId: ID,
    customSlug?: string
  ): Promise<string> {
    // Check if slug already exists for this item
    const existingSlug = this.slugs.find(s => s.itemId === itemId && s.itemType === itemType);
    if (existingSlug) {
      return existingSlug.slug;
    }

    let slug = customSlug || this.generateSlug();
    
    // Ensure uniqueness
    while (this.slugs.some(s => s.slug === slug)) {
      slug = this.generateSlug();
    }

    const publicSlug: PublicSlug = {
      id: `slug_${Date.now()}`,
      slug,
      itemType,
      itemId,
      userId,
      createdAt: Date.now(),
    };

    this.slugs.push(publicSlug);
    await this.saveData();
    return slug;
  }

  async getSlugInfo(slug: string): Promise<PublicSlug | null> {
    return this.slugs.find(s => s.slug === slug) || null;
  }

  async deleteSlug(itemId: ID, itemType: 'bookmark' | 'note' | 'project'): Promise<void> {
    this.slugs = this.slugs.filter(s => !(s.itemId === itemId && s.itemType === itemType));
    await this.saveData();
  }

  async getPublicUrl(slug: string): Promise<string> {
    return `https://pinprogress.app/shared/${slug}`;
  }

  private generateSlug(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private async saveData(): Promise<void> {
    try {
      const data = {
        slugs: this.slugs,
      };
      await AsyncStorage.setItem('slug_data', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save slug data:', error);
    }
  }
}

export const slugRepository = new SlugRepository();