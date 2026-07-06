import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Bookmark } from '@/types';
import { formatRelativeTime } from '@/utils/date';
import { getSourceLabel, isUnreadBookmark } from '@/utils/bookmark';
import { CategoryBadge } from '@/components/ui/CategoryBadge';
import { EntityReminderBell } from '@/components/ui/EntityReminderBell';
import { getCategoryDef } from '@/constants/contentCategories';

interface BookmarkCardProps {
  bookmark: Bookmark;
  onPress: () => void;
}

export function BookmarkCard({ bookmark, onPress }: BookmarkCardProps) {
  const { t } = useTranslation();
  const categoryDef = getCategoryDef(bookmark.category);

  const getOpenCountText = () => {
    if (bookmark.openCount === 0) return t('bookmarkCard.neverOpened');
    return t('bookmarkCard.openedCount', { count: bookmark.openCount });
  };

  const getOpenCountColor = () => {
    if (bookmark.openCount === 0) return '#6B7280';
    if (bookmark.openCount >= 10) return '#059669';
    return '#D97706';
  };

  const getDomainLabel = () => {
    if (bookmark.source) return getSourceLabel(bookmark.source);
    if (bookmark.url) return new URL(bookmark.url).hostname;
    return t('bookmarkCard.screenshot');
  };

  return (
    <TouchableOpacity style={[styles.container, { borderLeftColor: categoryDef.color }]} onPress={onPress}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.favicon}>
            <Text style={styles.faviconText}>
              {bookmark.title?.[0]?.toUpperCase() || bookmark.url?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.domain} numberOfLines={1}>
              {getDomainLabel()}
            </Text>
            <Text style={styles.date}>
              {formatRelativeTime(bookmark.createdAt)}
            </Text>
          </View>
          <EntityReminderBell
            entityType="bookmark"
            entityId={bookmark.id}
            title={bookmark.title || bookmark.url || t('common.untitled')}
            createdAt={bookmark.createdAt}
            schedule={bookmark.reminderSchedule}
            size={16}
          />
        </View>
        
        <Text style={styles.title} numberOfLines={2}>
          {bookmark.title || bookmark.url || t('common.untitled')}
        </Text>
        
        {bookmark.description && (
          <Text style={styles.description} numberOfLines={2}>
            {bookmark.description}
          </Text>
        )}
        
        {(bookmark.imagePreview || bookmark.screenshotUri) && (
          <Image
            source={{ uri: bookmark.imagePreview || bookmark.screenshotUri }}
            style={styles.preview}
            resizeMode="cover"
          />
        )}
        
        {bookmark.personalNote ? (
          <Text style={styles.personalNote} numberOfLines={2}>
            {bookmark.personalNote}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <CategoryBadge category={bookmark.category} compact />
          {isUnreadBookmark(bookmark) && bookmark.status !== 'done' ? (
            <View style={[styles.openCount, { backgroundColor: '#FEE2E220' }]}>
              <Text style={[styles.openCountText, { color: '#B91C1C' }]}>{t('bookmarkCard.readLater')}</Text>
            </View>
          ) : (
            <View
              style={[
                styles.openCount,
                { backgroundColor: `${getOpenCountColor()}20` },
              ]}
            >
              <Text style={[styles.openCountText, { color: getOpenCountColor() }]}>
                {getOpenCountText()}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderLeftWidth: 4,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  favicon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  faviconText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  headerText: {
    flex: 1,
  },
  domain: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 22,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  preview: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
  },
  personalNote: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  openCount: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  openCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
});