import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Bookmark } from '@/types';
import { formatRelativeTime } from '@/utils/date';

interface BookmarkCardProps {
  bookmark: Bookmark;
  onPress: () => void;
}

export function BookmarkCard({ bookmark, onPress }: BookmarkCardProps) {
  const getOpenCountText = () => {
    if (bookmark.openCount === 0) return 'Never opened';
    return `Opened ${bookmark.openCount}×`;
  };

  const getOpenCountColor = () => {
    if (bookmark.openCount === 0) return '#6B7280';
    if (bookmark.openCount >= 10) return '#059669';
    return '#D97706';
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.favicon}>
            <Text style={styles.faviconText}>
              {bookmark.title?.[0]?.toUpperCase() || bookmark.url?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.domain} numberOfLines={1}>
              {bookmark.url ? new URL(bookmark.url).hostname : 'Screenshot'}
            </Text>
            <Text style={styles.date}>
              {formatRelativeTime(bookmark.createdAt)}
            </Text>
          </View>
        </View>
        
        <Text style={styles.title} numberOfLines={2}>
          {bookmark.title || bookmark.url || 'Untitled'}
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
        
        <View style={styles.footer}>
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
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
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