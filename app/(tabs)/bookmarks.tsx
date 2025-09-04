import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, ChevronDown } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAppStore } from '@/store/useAppStore';
import { SearchBar } from '@/components/ui/SearchBar';
import { FilterChips } from '@/components/ui/FilterChips';
import { BookmarkCard } from '@/components/BookmarkCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Bookmark } from '@/types';

type SortOption = 'recent' | 'most-opened';
type FilterOption = 'all' | 'never-opened' | 'frequently' | 'tagged';

export default function BookmarksScreen() {
  const { bookmarks } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  const filterChips = [
    { id: 'all', label: 'All', count: bookmarks.length },
    { id: 'never-opened', label: 'Never Opened', count: bookmarks.filter(b => b.openCount === 0).length },
    { id: 'frequently', label: 'Frequently', count: bookmarks.filter(b => b.openCount >= 5).length },
    { id: 'tagged', label: 'Tagged', count: bookmarks.filter(b => b.tags.length > 0).length },
  ];

  const filteredAndSortedBookmarks = useMemo(() => {
    let filtered = bookmarks;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (bookmark) =>
          bookmark.title?.toLowerCase().includes(query) ||
          bookmark.description?.toLowerCase().includes(query) ||
          bookmark.url?.toLowerCase().includes(query) ||
          bookmark.tags.some((tag) => tag.name.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    switch (selectedFilter) {
      case 'never-opened':
        filtered = filtered.filter((bookmark) => bookmark.openCount === 0);
        break;
      case 'frequently':
        filtered = filtered.filter((bookmark) => bookmark.openCount >= 5);
        break;
      case 'tagged':
        filtered = filtered.filter((bookmark) => bookmark.tags.length > 0);
        break;
    }

    // Apply sorting
    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'most-opened':
        filtered.sort((a, b) => b.openCount - a.openCount);
        break;
    }

    return filtered;
  }, [bookmarks, searchQuery, selectedFilter, sortBy]);

  const renderBookmark = ({ item }: { item: Bookmark }) => (
    <BookmarkCard
      bookmark={item}
      onPress={() => router.push(`/bookmark/${item.id}` as any)}
    />
  );

  const renderHeader = () => (
    <View>
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search bookmarks"
      />
      
      <FilterChips
        chips={filterChips}
        selectedId={selectedFilter}
        onSelect={(id) => setSelectedFilter(id as FilterOption)}
      />
      
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Your Bookmarks</Text>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setSortBy(sortBy === 'recent' ? 'most-opened' : 'recent')}
        >
          <Text style={styles.sortButtonText}>
            Sort by: {sortBy === 'recent' ? 'Recent' : 'Most Opened'}
          </Text>
          <ChevronDown size={16} color="#6B7280" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <EmptyState
      title="No bookmarks yet"
      description="Start saving interesting links and articles to build your personal knowledge base."
      buttonTitle="Add Your First Bookmark"
      onButtonPress={() => router.push('/add-bookmark')}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bookmarks</Text>
        <TouchableOpacity onPress={() => router.push('/add-bookmark')}>
          <Plus size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredAndSortedBookmarks}
        renderItem={renderBookmark}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={filteredAndSortedBookmarks.length === 0 ? styles.emptyContainer : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
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
});