import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from '@/utils/notifications';
import { isUnreadBookmark } from '@/utils/bookmark';
import { Bookmark } from '@/types';

const DIGEST_NOTIFICATION_KEY = 'bookmark_digest_notification_id';
const DIGEST_FREQUENCY_KEY = 'bookmark_digest_frequency';

export type DigestFrequency = 'daily' | 'weekly' | 'off';

function getNextSundayMorning(): Date {
  const now = new Date();
  const next = new Date(now);
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  next.setDate(now.getDate() + daysUntilSunday);
  next.setHours(10, 0, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 7);
  }
  return next;
}

function getTomorrowMorning(): Date {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(9, 0, 0, 0);
  return next;
}

export function countUnreadBookmarks(bookmarks: Bookmark[]): number {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return bookmarks.filter(
    (bookmark) =>
      isUnreadBookmark(bookmark) &&
      bookmark.status !== 'archived' &&
      bookmark.status !== 'done' &&
      bookmark.createdAt >= thirtyDaysAgo
  ).length;
}

export async function getDigestFrequency(): Promise<DigestFrequency> {
  const value = await AsyncStorage.getItem(DIGEST_FREQUENCY_KEY);
  if (value === 'daily' || value === 'weekly' || value === 'off') return value;
  return 'weekly';
}

export async function setDigestFrequency(frequency: DigestFrequency): Promise<void> {
  await AsyncStorage.setItem(DIGEST_FREQUENCY_KEY, frequency);
}

export async function scheduleBookmarkDigest(
  bookmarks: Bookmark[],
  frequency: DigestFrequency = 'weekly'
): Promise<void> {
  const existingId = await AsyncStorage.getItem(DIGEST_NOTIFICATION_KEY);
  if (existingId) {
    await notificationService.cancelNotification(existingId);
    await AsyncStorage.removeItem(DIGEST_NOTIFICATION_KEY);
  }

  if (frequency === 'off') return;

  const unreadCount = countUnreadBookmarks(bookmarks);
  if (unreadCount === 0) return;

  const triggerDate = frequency === 'daily' ? getTomorrowMorning() : getNextSundayMorning();
  const notificationId = await notificationService.scheduleBookmarkDigest(unreadCount, triggerDate);

  if (notificationId) {
    await AsyncStorage.setItem(DIGEST_NOTIFICATION_KEY, notificationId);
  }
}