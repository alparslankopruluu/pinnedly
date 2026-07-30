import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  Bookmark,
  ChevronRight,
  FileText,
  Folder,
  List,
  CheckCheck,
} from '@/components/icons/lucide';
import { EmptyState } from '@/components/ui/EmptyState';
import { useNotifications, NotificationItem } from '@/store/useNotificationStore';
import { useAppAppearance } from '@/hooks/useAppAppearance';

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useAppAppearance();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Real-time listener handles updates, brief artificial delay for UX pull feel
    setTimeout(() => {
      setRefreshing(false);
    }, 400);
  };

  const getEntityIcon = (entityType?: string) => {
    switch (entityType) {
      case 'project':
        return <Folder size={20} color={colors.primary} />;
      case 'note':
        return <FileText size={20} color={colors.primary} />;
      case 'bookmark':
        return <Bookmark size={20} color={colors.primary} />;
      case 'list':
        return <List size={20} color={colors.primary} />;
      default:
        return <Bell size={20} color={colors.primary} />;
    }
  };

  const formatTimestamp = (timestamp?: number | null) => {
    if (!timestamp) return '';
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return t('common.justNow', { defaultValue: 'Az önce' });
    if (diffMins < 60) return `${diffMins}dk`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}s`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}gün`;
    return new Date(timestamp).toLocaleDateString();
  };

  const handleNotificationPress = async (item: NotificationItem) => {
    if (!item.read) {
      void markAsRead(item.id);
    }

    if (item.entityType && item.entityId) {
      switch (item.entityType) {
        case 'project':
          router.push(`/project/${item.entityId}` as never);
          break;
        case 'note':
          router.push(`/note/${item.entityId}` as never);
          break;
        case 'bookmark':
          router.push(`/bookmark/${item.entityId}` as never);
          break;
        case 'list':
          router.push(`/bookmark-list/${item.entityId}` as never);
          break;
      }
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
        !item.read && { backgroundColor: isDark ? '#2D1F1F' : '#FEF2F2' },
      ]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
        {getEntityIcon(item.entityType)}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.time, { color: colors.textSecondary }]}>
            {formatTimestamp(item.createdAt)}
          </Text>
        </View>

        <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.body}
        </Text>
      </View>

      {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
      <ChevronRight size={18} color={colors.textSecondary} style={{ marginLeft: 6 }} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: t('notifications.screenTitle'),
          headerRight: () =>
            unreadCount > 0 ? (
              <TouchableOpacity onPress={markAllAsRead} style={styles.headerAction}>
                <CheckCheck size={18} color={colors.primary} />
                <Text style={[styles.headerActionText, { color: colors.primary }]}>
                  {t('notifications.markAllRead')}
                </Text>
              </TouchableOpacity>
            ) : null,
        }}
      />

      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon={<Bell size={48} color={colors.textSecondary} />}
              title={t('notifications.emptyStateTitle')}
              description={t('notifications.emptyStateSubtitle')}
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 10,
    flexGrow: 1,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerActionText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
