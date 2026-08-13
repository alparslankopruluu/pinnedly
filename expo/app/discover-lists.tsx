import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Search, Users, Heart, ArrowLeft, Plus } from '@/components/icons/lucide';
import { useBookmarkLists } from '@/store/useBookmarkListStore';
import { BookmarkList } from '@/types';
import { Button } from '@/components/ui/Button';
import { useAuthGate } from '@/hooks/useAuthGate';
import { useAuth } from '@/store/useAuthStore';

export default function PublicListsScreen() {
  const { t } = useTranslation();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { requireAccount } = useAuthGate();
  const { user, isAuthenticated, isGuest } = useAuth();
  const hasAccount = isAuthenticated && !isGuest;
  const {
    myLists,
    publicLists,
    searchResults,
    searchQuery,
    isLoadingPublicLists,
    isLoadingMyLists,
    isSearching,
    isFollowing,
    followList,
    unfollowList,
    searchLists,
    refreshMyLists,
    refreshPublicLists,
    isFollowingList,
  } = useBookmarkLists();

  const [localSearchQuery, setLocalSearchQuery] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'my' | 'discover'>(() =>
    hasAccount && tab !== 'discover' ? 'my' : 'discover'
  );

  useEffect(() => {
    if (!hasAccount) {
      setActiveTab('discover');
    } else if (tab === 'my') {
      setActiveTab('my');
    } else if (tab === 'discover') {
      setActiveTab('discover');
    } else {
      setActiveTab('my');
    }
  }, [hasAccount, tab]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchLists(localSearchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [localSearchQuery, searchLists]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'my') {
        await refreshMyLists();
      } else {
        await refreshPublicLists();
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleFollowToggle = async (list: BookmarkList) => {
    if (!requireAccount()) return;
    try {
      const isCurrentlyFollowing = isFollowingList(list.id);
      if (isCurrentlyFollowing) {
        await unfollowList(list.id);
      } else {
        await followList(list.id);
      }
    } catch (error) {
      console.error('Follow toggle error:', error);
    }
  };

  const renderListItem = ({ item }: { item: BookmarkList }) => {
    const visibility = item.visibility ?? (item.isPublic ? 'public' : 'private');
    const showFollow = activeTab === 'discover' && item.ownerId !== user?.id;
    return (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => router.push(`/bookmark-list/${item.id}` as any)}
    >
      <View style={styles.listHeader}>
        <View style={styles.listInfo}>
          <Text style={styles.listName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.listDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>
        {showFollow && (
          <TouchableOpacity
            style={[styles.followButton, isFollowingList(item.id) && styles.followingButton]}
            onPress={() => handleFollowToggle(item)}
            disabled={isFollowing}
          >
            <Heart
              size={16}
              color={isFollowingList(item.id) ? '#ef4444' : '#64748b'}
              fill={isFollowingList(item.id) ? '#ef4444' : 'transparent'}
            />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.listStats}>
        <View style={styles.visibilityBadge}>
          <Text style={styles.visibilityBadgeText}>
            {t(`common.${visibility}` as 'common.private')}
          </Text>
        </View>
        <Text style={styles.statText}>
          {t('discoverLists.savedCount', { count: item.bookmarkIds.length })}
        </Text>
        <View style={styles.stat}>
          <Users size={14} color="#64748b" />
          <Text style={styles.statText}>{t('common.followers', { count: item.followerCount })}</Text>
        </View>
      </View>
    </TouchableOpacity>
    );
  };

  const displayLists = activeTab === 'my'
    ? myLists
    : searchQuery.trim()
      ? searchResults
      : publicLists;
  const isLoading = activeTab === 'my'
    ? isLoadingMyLists
    : searchQuery.trim()
      ? isSearching
      : isLoadingPublicLists;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('discoverLists.listsTitle')}</Text>
        <TouchableOpacity
          onPress={() => requireAccount() && router.push('/create-list' as any)}
          style={styles.createButton}
        >
          <Plus size={24} color="#4f46e5" />
        </TouchableOpacity>
      </View>

      {hasAccount && (
        <View style={styles.tabs}>
          {(['my', 'discover'] as const).map((nextTab) => (
            <TouchableOpacity
              key={nextTab}
              style={[styles.tab, activeTab === nextTab && styles.activeTab]}
              onPress={() => setActiveTab(nextTab)}
            >
              <Text style={[styles.tabText, activeTab === nextTab && styles.activeTabText]}>
                {t(nextTab === 'my' ? 'discoverLists.tabs.my' : 'discoverLists.tabs.discover')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {activeTab === 'discover' && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              placeholder={t('discoverLists.searchPlaceholder')}
              value={localSearchQuery}
              onChangeText={setLocalSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>
      )}

      <FlatList
        data={displayLists}
        renderItem={renderListItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Users size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>
              {activeTab === 'my'
                ? t('discoverLists.noMyLists')
                : isLoading
                ? t('discoverLists.loading')
                : searchQuery.trim()
                  ? t('discoverLists.noListsFound')
                  : t('discoverLists.noPublicLists')}
            </Text>
            <Text style={styles.emptyDescription}>
              {activeTab === 'my'
                ? t('discoverLists.createFirstList')
                : searchQuery.trim()
                ? t('discoverLists.tryDifferentKeywords')
                : t('discoverLists.beFirstToCreate')}
            </Text>
            {(activeTab === 'my' || !searchQuery.trim()) && (
              <Button
                title={t('discoverLists.createList')}
                onPress={() => requireAccount() && router.push('/create-list' as any)}
                style={styles.createListButton}
              />
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginTop: 14,
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#eef2f7',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 9,
  },
  activeTab: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#4f46e5',
  },
  createButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  listContainer: {
    padding: 24,
    gap: 16,
  },
  listItem: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  listInfo: {
    flex: 1,
    marginRight: 12,
  },
  listName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1e293b',
    marginBottom: 4,
  },
  listDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  followButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  followingButton: {
    backgroundColor: '#fef2f2',
  },
  listStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500' as const,
  },
  visibilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#eef2ff',
  },
  visibilityBadgeText: {
    color: '#4f46e5',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#64748b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  createListButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
  },
});
