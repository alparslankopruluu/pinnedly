import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { showAppAlert } from '@/providers/DialogProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Heart, Share, Users, Edit3, Trash2 } from 'lucide-react-native';
import { useBookmarkLists } from '@/store/useBookmarkListStore';
import { BookmarkList, Bookmark } from '@/types';
import { BookmarkCard } from '@/components/BookmarkCard';

import { EmptyState } from '@/components/ui/EmptyState';
import { ShareModal } from '@/components/ShareModal';
import { useAuth } from '@/store/useAuthStore';

export default function BookmarkListDetailScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getListById,
    getBookmarksByListId,
    followList,
    unfollowList,
    deleteList,
    isFollowingList,
    isLoading,
  } = useBookmarkLists();

  const [list, setList] = useState<BookmarkList | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  const loadListData = useCallback(async () => {
    if (!id) return;
    
    try {
      const listData = await getListById(id);
      const listBookmarks = await getBookmarksByListId(id);
      
      setList(listData);
      setBookmarks(listBookmarks);
      setIsFollowing(isFollowingList(id));
    } catch (error) {
      console.error('Error loading list data:', error);
      showAppAlert(t('common.error'), t('bookmarkList.alerts.loadFailed'), undefined, { variant: 'error' });
    }
  }, [id, getListById, getBookmarksByListId, isFollowingList]);

  useEffect(() => {
    if (id) {
      loadListData();
    }
  }, [id, loadListData]);

  const handleFollowToggle = async () => {
    if (!list) return;
    
    try {
      if (isFollowing) {
        await unfollowList(list.id);
        setIsFollowing(false);
      } else {
        await followList(list.id);
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Follow error:', error);
      showAppAlert(t('common.error'), t('bookmarkList.alerts.followFailed'), undefined, { variant: 'error' });
    }
  };

  const handleDelete = () => {
    if (!list) return;
    
    showAppAlert(
      t('bookmarkList.deleteTitle'),
      t('bookmarkList.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteList(list.id);
              router.back();
            } catch (error) {
              console.error('Delete error:', error);
              showAppAlert(t('common.error'), t('bookmarkList.alerts.deleteFailed'), undefined, { variant: 'error' });
            }
          },
        },
      ]
    );
  };

  const handleShare = () => {
    if (!list) return;
    setShowShareModal(true);
  };

  const renderBookmark = ({ item }: { item: Bookmark }) => (
    <BookmarkCard
      bookmark={item}
      onPress={() => router.push(`/bookmark/${item.id}`)}
    />
  );

  if (isLoading || !list) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOwner = user?.id === list.ownerId;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          {!isOwner && (
            <TouchableOpacity
              onPress={handleFollowToggle}
              style={[styles.actionButton, isFollowing && styles.followingButton]}
            >
              <Heart
                size={20}
                color={isFollowing ? '#ef4444' : '#64748b'}
                fill={isFollowing ? '#ef4444' : 'transparent'}
              />
            </TouchableOpacity>
          )}
          {isOwner ? (
          <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
            <Share size={20} color="#64748b" />
          </TouchableOpacity>
          ) : null}
          {isOwner && (
            <>
              <TouchableOpacity
                onPress={() => console.log('Edit list functionality coming soon')}
                style={styles.actionButton}
              >
                <Edit3 size={20} color="#64748b" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={styles.actionButton}>
                <Trash2 size={20} color="#ef4444" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View style={styles.listInfo}>
        <Text style={styles.listName}>{list.name}</Text>
        {list.description && (
          <Text style={styles.listDescription}>{list.description}</Text>
        )}
        <View style={styles.listStats}>
          <View style={styles.stat}>
            <Users size={16} color="#64748b" />
            <Text style={styles.statText}>{t('common.followers', { count: list.followerCount })}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={bookmarks}
        renderItem={renderBookmark}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.bookmarksList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <EmptyState
            icon="bookmark"
            title={t('bookmarkList.empty.title')}
            description={t('bookmarkList.empty.description')}
          />
        )}
      />

      {isOwner && list ? (
        <ShareModal
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          entityId={list.id}
          entityType="list"
          entityTitle={list.name}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  followingButton: {
    backgroundColor: '#fef2f2',
  },
  listInfo: {
    padding: 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  listName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1e293b',
    marginBottom: 8,
  },
  listDescription: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
    marginBottom: 16,
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
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500' as const,
  },
  bookmarksList: {
    padding: 24,
    gap: 16,
  },
});