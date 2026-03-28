import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Heart, Share, Users, Edit3, Trash2 } from 'lucide-react-native';
import { useBookmarkLists } from '@/store/useBookmarkListStore';
import { BookmarkList, Bookmark } from '@/types';
import { BookmarkCard } from '@/components/BookmarkCard';

import { EmptyState } from '@/components/ui/EmptyState';

export default function BookmarkListDetailScreen() {
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
      Alert.alert('Error', 'Failed to load list data');
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
      Alert.alert('Error', 'Failed to update follow status');
    }
  };

  const handleDelete = () => {
    if (!list) return;
    
    Alert.alert(
      'Delete List',
      'Are you sure you want to delete this list? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteList(list.id);
              router.back();
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete list');
            }
          },
        },
      ]
    );
  };

  const handleShare = () => {
    // TODO: Implement sharing functionality
    Alert.alert('Share', 'Sharing functionality coming soon!');
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
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOwner = true; // TODO: Check if current user is the owner

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
          <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
            <Share size={20} color="#64748b" />
          </TouchableOpacity>
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
            <Text style={styles.statText}>{list.followerCount} followers</Text>
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
            title="No bookmarks yet"
            description="This list doesn't have any bookmarks yet."
          />
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