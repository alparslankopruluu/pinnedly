import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useBookmarkStore } from '@/providers/OfflineProvider';
import { SearchBar } from '@/components/ui/SearchBar';
import { FilterChips } from '@/components/ui/FilterChips';
import { BookmarkCard } from '@/components/BookmarkCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Bookmark, BookmarkSource } from '@/types';
import { isUnreadBookmark } from '@/utils/bookmark';

type SortOption = 'recent' | 'most-opened' | 'oldest-unread';
type FilterOption = 'all' | 'inbox' | 'never-opened' | 'frequently' | 'tagged' | BookmarkSource;

export default function BookmarksScreen() {
  const { t } = useTranslation();
  const { filter: filterParam } = useLocalSearchParams<{ filter?: string }>();
  const { bookmarks, loading, error } = useBookmarkStore();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  useEffect(() => {
    if (filterParam === 'inbox' || filterParam === 'never-opened') {
      setSelectedFilter(filterParam);
      setSortBy('oldest-unread');
    }
  }, [filterParam]);

  const inboxCount = bookmarks.filter(
    (b) => isUnreadBookmark(b) && b.status !== 'archived' && b.status !== 'done'
  ).length;

  const filterChips = [
    { id: 'all', label: t('bookmarks.filters.all'), count: bookmarks.length },
    { id: 'inbox', label: t('bookmarks.filters.readLater'), count: inboxCount },
    { id: 'never-opened', label: t('bookmarks.filters.neverOpened'), count: bookmarks.filter((b) => b.openCount === 0).length },
    { id: 'linkedin', label: t('bookmarks.filters.linkedin'), count: bookmarks.filter((b) => b.source === 'linkedin').length },
    { id: 'twitter', label: t('bookmarks.filters.twitter'), count: bookmarks.filter((b) => b.source === 'twitter').length },
    { id: 'medium', label: t('bookmarks.filters.medium'), count: bookmarks.filter((b) => b.source === 'medium').length },
    { id: 'tagged', label: t('bookmarks.filters.tagged'), count: bookmarks.filter((b) => b.tagNames.length > 0).length },
  ];

  const filteredAndSortedBookmarks = useMemo(() => {
    const seenIds = new Set<string>();
    const uniqueBookmarks = bookmarks.filter((bookmark) => {
      if (seenIds.has(bookmark.id)) return false;
      seenIds.add(bookmark.id);
      return true;
    });

    let filtered = uniqueBookmarks.filter((b) => b.status !== 'archived');

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (bookmark) =>
          bookmark.title?.toLowerCase().includes(query) ||
          bookmark.description?.toLowerCase().includes(query) ||
          bookmark.personalNote?.toLowerCase().includes(query) ||
          bookmark.url?.toLowerCase().includes(query) ||
          bookmark.tagNames.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    switch (selectedFilter) {
      case 'inbox':
        filtered = filtered.filter(
          (bookmark) =>
            isUnreadBookmark(bookmark) &&
            bookmark.status !== 'done'
        );
        break;
      case 'never-opened':
        filtered = filtered.filter((bookmark) => bookmark.openCount === 0);
        break;
      case 'frequently':
        filtered = filtered.filter((bookmark) => bookmark.openCount >= 5);
        break;
      case 'tagged':
        filtered = filtered.filter((bookmark) => bookmark.tagNames.length > 0);
        break;
      case 'linkedin':
      case 'twitter':
      case 'medium':
      case 'wikipedia':
      case 'youtube':
      case 'reddit':
      case 'instagram':
      case 'github':
      case 'substack':
        filtered = filtered.filter((bookmark) => bookmark.source === selectedFilter);
        break;
    }

    const sorted = [...filtered];
    switch (sortBy) {
      case 'recent':
        sorted.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'most-opened':
        sorted.sort((a, b) => b.openCount - a.openCount);
        break;
      case 'oldest-unread':
        sorted.sort((a, b) => {
          const aUnread = isUnreadBookmark(a) ? 0 : 1;
          const bUnread = isUnreadBookmark(b) ? 0 : 1;
          if (aUnread !== bUnread) return aUnread - bUnread;
          return a.createdAt - b.createdAt;
        });
        break;
    }

    return sorted;
  }, [bookmarks, searchQuery, selectedFilter, sortBy]);

  const cycleSort = () => {
    setSortBy((current) => {
      if (current === 'recent') return 'oldest-unread';
      if (current === 'oldest-unread') return 'most-opened';
      return 'recent';
    });
  };

  const sortLabel =
    sortBy === 'recent'
      ? t('bookmarks.sort.recent')
      : sortBy === 'most-opened'
        ? t('bookmarks.sort.mostOpened')
        : t('bookmarks.sort.oldestUnread');

  const renderBookmark = ({ item }: { item: Bookmark }) => (
    <BookmarkCard
      bookmark={item}
      onPress={() => router.push(`/bookmark/${item.id}` as never)}
    />
  );

  const renderHeader = () => (
    <View>
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={t('bookmarks.searchPlaceholder')}
      />

      <FilterChips
        chips={filterChips}
        selectedId={selectedFilter}
        onSelect={(id) => setSelectedFilter(id as FilterOption)}
      />

      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>{t('bookmarks.yourSaves')}</Text>
        <TouchableOpacity style={styles.sortButton} onPress={cycleSort}>
          <Text style={styles.sortButtonText}>{t('common.sortLabel', { sort: sortLabel })}</Text>
          <ChevronDown size={16} color="#6B7280" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <EmptyState
      title={t('bookmarks.empty.title')}
      description={t('bookmarks.empty.description')}
      buttonTitle={t('bookmarks.empty.button')}
      onButtonPress={() => router.push('/add-bookmark')}
    />
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>{t('bookmarks.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{t('common.errorWithMessage', { message: error })}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredAndSortedBookmarks}
        renderItem={renderBookmark}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          filteredAndSortedBookmarks.length === 0 ? styles.emptyContainer : undefined,
          { paddingBottom: insets.bottom + 80 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  sortContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sortLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 4,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
  },
});