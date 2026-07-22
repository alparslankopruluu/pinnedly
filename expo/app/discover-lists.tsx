import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Search, Users, Heart, ArrowLeft, Plus } from '@/components/icons/lucide';
import { useBookmarkLists } from '@/store/useBookmarkListStore';
import { BookmarkList } from '@/types';
import { Button } from '@/components/ui/Button';
import { useAuthGate } from '@/hooks/useAuthGate';

export default function PublicListsScreen() {
  const { t } = useTranslation();
  const { requireAccount } = useAuthGate();
  const {
    publicLists,
    searchResults,
    searchQuery,
    isLoadingPublicLists,
    isSearching,
    isFollowing,
    followList,
    unfollowList,
    searchLists,
    refreshPublicLists,
    isFollowingList,
  } = useBookmarkLists();

  const [localSearchQuery, setLocalSearchQuery] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchLists(localSearchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [localSearchQuery, searchLists]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshPublicLists();
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

  const renderListItem = ({ item }: { item: BookmarkList }) => (
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
      </View>
      
      <View style={styles.listStats}>
        <View style={styles.stat}>
          <Users size={14} color="#64748b" />
          <Text style={styles.statText}>{t('common.followers', { count: item.followerCount })}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const displayLists = searchQuery.trim() ? searchResults : publicLists;
  const isLoading = searchQuery.trim() ? isSearching : isLoadingPublicLists;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('discoverLists.title')}</Text>
        <TouchableOpacity
          onPress={() => requireAccount() && router.push('/create-list' as any)}
          style={styles.createButton}
        >
          <Plus size={24} color="#4f46e5" />
        </TouchableOpacity>
      </View>

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
              {isLoading
                ? t('discoverLists.loading')
                : searchQuery.trim()
                  ? t('discoverLists.noListsFound')
                  : t('discoverLists.noPublicLists')}
            </Text>
            <Text style={styles.emptyDescription}>
              {searchQuery.trim()
                ? t('discoverLists.tryDifferentKeywords')
                : t('discoverLists.beFirstToCreate')}
            </Text>
            {!searchQuery.trim() && (
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
