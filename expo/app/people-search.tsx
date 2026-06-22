import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar } from '@/components/ui/SearchBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/store/useAuthStore';
import { User } from '@/types';

export default function PeopleSearch() {
  const { searchUsers } = useAuth();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchUsers(query.trim());
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchUsers]);

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => router.push(`/profile/${item.id}`)}
    >
      <View style={styles.userInfo}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {item.displayName?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
        )}
        
        <View style={styles.userDetails}>
          <Text style={styles.displayName}>{item.displayName}</Text>
          <Text style={styles.handle}>@{item.handle}</Text>
          {item.bio && <Text style={styles.bio} numberOfLines={2}>{item.bio}</Text>}
        </View>
      </View>

      <View style={styles.userStats}>
        {item.isVerified && (
          <Ionicons name="checkmark-circle" size={16} color="#3b82f6" />
        )}
        <Text style={styles.followerCount}>
          {item.followerCount} followers
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.title}>Find People</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.searchBar}>
          <SearchBar
            placeholder="Search by name or username..."
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>

        {searchQuery.length === 0 ? (
          <EmptyState
            title="Search for People"
            description="Enter a name or username to find people to connect with"
          />
        ) : searchResults.length === 0 && !isLoading ? (
          <EmptyState
            title="No Results"
            description={`No users found for "${searchQuery}"`}
          />
        ) : (
          <FlatList
            data={searchResults}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1e293b',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  searchBar: {
    marginVertical: 16,
  },
  listContainer: {
    paddingBottom: 24,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600' as const,
  },
  userDetails: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e293b',
    marginBottom: 2,
  },
  handle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  bio: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  userStats: {
    alignItems: 'flex-end',
    gap: 4,
  },
  followerCount: {
    fontSize: 12,
    color: '#64748b',
  },
});