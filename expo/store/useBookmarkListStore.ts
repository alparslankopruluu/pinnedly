import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookmarkList, ID } from '@/types';
import { bookmarkListRepository } from '@/repositories/BookmarkListRepository';
import { bookmarkRepository } from '@/repositories/BookmarkRepository';
import { Bookmark } from '@/types';

export const [BookmarkListProvider, useBookmarkLists] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState<string>('');

  const myListsQuery = useQuery({
    queryKey: ['bookmark-lists', 'my'],
    queryFn: () => bookmarkListRepository.getMyLists(),
  });

  const publicListsQuery = useQuery({
    queryKey: ['bookmark-lists', 'public'],
    queryFn: () => bookmarkListRepository.getPublicLists(),
  });

  const followedListsQuery = useQuery({
    queryKey: ['bookmark-lists', 'followed'],
    queryFn: () => bookmarkListRepository.getFollowedLists(),
  });

  const searchResultsQuery = useQuery({
    queryKey: ['bookmark-lists', 'search', searchQuery],
    queryFn: () => bookmarkListRepository.searchPublicLists(searchQuery),
    enabled: searchQuery.trim().length > 0,
  });

  // Mutations
  const createListMutation = useMutation({
    mutationFn: ({ name, description, isPublic }: { name: string; description?: string; isPublic?: boolean }) =>
      bookmarkListRepository.createList(name, description, isPublic),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmark-lists', 'my'] });
    },
  });

  const updateListMutation = useMutation({
    mutationFn: ({ id, updates }: { id: ID; updates: Partial<Pick<BookmarkList, 'name' | 'description' | 'isPublic'>> }) =>
      bookmarkListRepository.updateList(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmark-lists'] });
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: (id: ID) => bookmarkListRepository.deleteList(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmark-lists'] });
    },
  });

  const followListMutation = useMutation({
    mutationFn: (listId: ID) => bookmarkListRepository.followList(listId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmark-lists'] });
    },
  });

  const unfollowListMutation = useMutation({
    mutationFn: (listId: ID) => bookmarkListRepository.unfollowList(listId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmark-lists'] });
    },
  });

  // Actions
  const createList = useCallback(async (name: string, description?: string, isPublic: boolean = false): Promise<BookmarkList> => {
    return createListMutation.mutateAsync({ name, description, isPublic });
  }, [createListMutation]);

  const updateList = useCallback(async (id: ID, updates: Partial<Pick<BookmarkList, 'name' | 'description' | 'isPublic'>>): Promise<BookmarkList> => {
    return updateListMutation.mutateAsync({ id, updates });
  }, [updateListMutation]);

  const deleteList = useCallback(async (id: ID): Promise<void> => {
    return deleteListMutation.mutateAsync(id);
  }, [deleteListMutation]);

  const followList = useCallback(async (listId: ID): Promise<void> => {
    return followListMutation.mutateAsync(listId);
  }, [followListMutation]);

  const unfollowList = useCallback(async (listId: ID): Promise<void> => {
    return unfollowListMutation.mutateAsync(listId);
  }, [unfollowListMutation]);

  const getListById = useCallback(async (id: ID): Promise<BookmarkList | null> => {
    return bookmarkListRepository.getListById(id);
  }, []);

  const getBookmarksByListId = useCallback(async (listId: ID): Promise<Bookmark[]> => {
    const bookmarkIds = await bookmarkListRepository.getBookmarksByListId(listId);
    if (bookmarkIds.length === 0) return [];
    const allBookmarks = await bookmarkRepository.getBookmarks();
    return allBookmarks.filter((bookmark) => bookmarkIds.includes(bookmark.id));
  }, []);

  const isFollowingList = useCallback((listId: ID): boolean => {
    // Check if the list is in the followed lists - temporarily return false
    return false;
  }, []);

  const searchLists = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return useMemo(() => ({
    // Data
    myLists: myListsQuery.data || [],
    publicLists: publicListsQuery.data || [],
    followedLists: followedListsQuery.data || [],
    searchResults: searchResultsQuery.data || [],
    searchQuery,

    // Loading states
    isLoading: myListsQuery.isLoading || publicListsQuery.isLoading,
    isLoadingMyLists: myListsQuery.isLoading,
    isLoadingPublicLists: publicListsQuery.isLoading,
    isLoadingFollowedLists: followedListsQuery.isLoading,
    isSearching: searchResultsQuery.isLoading,

    // Mutation states
    isCreating: createListMutation.isPending,
    isUpdating: updateListMutation.isPending,
    isDeleting: deleteListMutation.isPending,
    isFollowing: followListMutation.isPending,
    isUnfollowing: unfollowListMutation.isPending,

    // Actions
    createList,
    updateList,
    deleteList,
    followList,
    unfollowList,
    getListById,
    getBookmarksByListId,
    isFollowingList,
    searchLists,

    // Refresh functions
    refreshMyLists: myListsQuery.refetch,
    refreshPublicLists: publicListsQuery.refetch,
    refreshFollowedLists: followedListsQuery.refetch,
  }), [
    myListsQuery.data,
    publicListsQuery.data,
    followedListsQuery.data,
    searchResultsQuery.data,
    searchQuery,
    myListsQuery.isLoading,
    publicListsQuery.isLoading,
    followedListsQuery.isLoading,
    searchResultsQuery.isLoading,
    createListMutation.isPending,
    updateListMutation.isPending,
    deleteListMutation.isPending,
    followListMutation.isPending,
    unfollowListMutation.isPending,
    createList,
    updateList,
    deleteList,
    followList,
    unfollowList,
    getListById,
    getBookmarksByListId,
    isFollowingList,
    searchLists,
    myListsQuery.refetch,
    publicListsQuery.refetch,
    followedListsQuery.refetch,
  ]);
});