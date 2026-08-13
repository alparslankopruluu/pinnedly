import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookmarkList, ID, Visibility } from '@/types';
import { bookmarkListRepository } from '@/repositories/BookmarkListRepository';
import { bookmarkRepository } from '@/repositories/BookmarkRepository';
import { Bookmark } from '@/types';
import { useAuth } from '@/store/useAuthStore';
import {
  isPublicBookmarkList,
  matchesBookmarkListSearch,
  upsertBookmarkList,
} from '@/lib/bookmarkListState';

export const [BookmarkListProvider, useBookmarkLists] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { isAuthenticated, isGuest } = useAuth();
  const hasAccount = isAuthenticated && !isGuest;
  const [searchQuery, setSearchQuery] = useState<string>('');

  const myListsQuery = useQuery({
    queryKey: ['bookmark-lists', 'my'],
    queryFn: () => bookmarkListRepository.getMyLists(),
    enabled: hasAccount,
  });

  const publicListsQuery = useQuery({
    queryKey: ['bookmark-lists', 'public'],
    queryFn: () => bookmarkListRepository.getPublicLists(),
    enabled: isAuthenticated || isGuest,
  });

  const followedListsQuery = useQuery({
    queryKey: ['bookmark-lists', 'followed'],
    queryFn: () => bookmarkListRepository.getFollowedLists(),
    enabled: hasAccount,
  });

  const searchResultsQuery = useQuery({
    queryKey: ['bookmark-lists', 'search', searchQuery],
    queryFn: () => bookmarkListRepository.searchPublicLists(searchQuery),
    enabled: (isAuthenticated || isGuest) && searchQuery.trim().length > 0,
  });

  const getCachedList = useCallback((listId: ID): BookmarkList | undefined => {
    const cachedQueries = queryClient.getQueriesData<BookmarkList[]>({
      queryKey: ['bookmark-lists'],
    });
    for (const [, lists] of cachedQueries) {
      const match = lists?.find((list) => list.id === listId);
      if (match) return match;
    }
    return undefined;
  }, [queryClient]);

  const updateListInCaches = useCallback((listId: ID, update: (list: BookmarkList) => BookmarkList) => {
    queryClient.setQueriesData<BookmarkList[]>(
      { queryKey: ['bookmark-lists'] },
      (lists) => lists?.map((list) => (list.id === listId ? update(list) : list))
    );
  }, [queryClient]);

  // Mutations
  const createListMutation = useMutation({
    mutationFn: ({ name, description, visibility }: { name: string; description?: string; visibility?: Visibility }) =>
      bookmarkListRepository.createList(name, description, visibility ?? 'private'),
    onSuccess: (created) => {
      queryClient.setQueryData<BookmarkList[]>(
        ['bookmark-lists', 'my'],
        (lists) => upsertBookmarkList(lists, created)
      );

      if (isPublicBookmarkList(created)) {
        queryClient.setQueryData<BookmarkList[]>(
          ['bookmark-lists', 'public'],
          (lists) => upsertBookmarkList(lists, created)
        );
        queryClient.getQueriesData<BookmarkList[]>({
          queryKey: ['bookmark-lists', 'search'],
        }).forEach(([queryKey, lists]) => {
          const query = String(queryKey[2] ?? '');
          if (matchesBookmarkListSearch(created, query)) {
            queryClient.setQueryData<BookmarkList[]>(
              queryKey,
              upsertBookmarkList(lists, created)
            );
          }
        });
      }
      queryClient.invalidateQueries({ queryKey: ['bookmark-lists', 'my'] });
      if (isPublicBookmarkList(created)) {
        queryClient.invalidateQueries({ queryKey: ['bookmark-lists', 'public'] });
        queryClient.invalidateQueries({ queryKey: ['bookmark-lists', 'search'] });
      }
    },
  });

  const updateListMutation = useMutation({
    mutationFn: ({ id, updates }: { id: ID; updates: Partial<Pick<BookmarkList, 'name' | 'description' | 'isPublic' | 'visibility'>> }) =>
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
    onMutate: async (listId) => {
      await queryClient.cancelQueries({ queryKey: ['bookmark-lists'] });
      const previous = queryClient.getQueriesData<BookmarkList[]>({ queryKey: ['bookmark-lists'] });
      const list = getCachedList(listId);
      if (list) {
        updateListInCaches(listId, (item) => ({ ...item, followerCount: item.followerCount + 1 }));
        queryClient.setQueryData<BookmarkList[]>(['bookmark-lists', 'followed'], (lists = []) => [
          { ...list, followerCount: list.followerCount + 1 },
          ...lists.filter((item) => item.id !== listId),
        ]);
      }
      return { previous };
    },
    onError: (_error, _listId, context) => {
      context?.previous.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmark-lists', 'followed'] });
      queryClient.invalidateQueries({ queryKey: ['bookmark-lists', 'public'] });
    },
  });

  const unfollowListMutation = useMutation({
    mutationFn: (listId: ID) => bookmarkListRepository.unfollowList(listId),
    onMutate: async (listId) => {
      await queryClient.cancelQueries({ queryKey: ['bookmark-lists'] });
      const previous = queryClient.getQueriesData<BookmarkList[]>({ queryKey: ['bookmark-lists'] });
      queryClient.setQueryData<BookmarkList[]>(['bookmark-lists', 'followed'], (lists = []) =>
        lists.filter((list) => list.id !== listId)
      );
      updateListInCaches(listId, (item) => ({
        ...item,
        followerCount: Math.max(0, item.followerCount - 1),
      }));
      return { previous };
    },
    onError: (_error, _listId, context) => {
      context?.previous.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmark-lists', 'followed'] });
      queryClient.invalidateQueries({ queryKey: ['bookmark-lists', 'public'] });
    },
  });

  const addBookmarkMutation = useMutation({
    mutationFn: ({ listId, bookmarkId }: { listId: ID; bookmarkId: ID }) =>
      bookmarkListRepository.addBookmarkToList(listId, bookmarkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmark-lists', 'my'] });
    },
  });

  const removeBookmarkMutation = useMutation({
    mutationFn: ({ listId, bookmarkId }: { listId: ID; bookmarkId: ID }) =>
      bookmarkListRepository.removeBookmarkFromList(listId, bookmarkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmark-lists', 'my'] });
    },
  });

  // Actions
  const createList = useCallback(async (name: string, description?: string, visibility: Visibility = 'private'): Promise<BookmarkList> => {
    return createListMutation.mutateAsync({ name, description, visibility });
  }, [createListMutation]);

  const updateList = useCallback(async (id: ID, updates: Partial<Pick<BookmarkList, 'name' | 'description' | 'isPublic' | 'visibility'>>): Promise<BookmarkList> => {
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

  const addBookmarkToList = useCallback(async (listId: ID, bookmarkId: ID): Promise<void> => {
    return addBookmarkMutation.mutateAsync({ listId, bookmarkId });
  }, [addBookmarkMutation]);

  const removeBookmarkFromList = useCallback(async (listId: ID, bookmarkId: ID): Promise<void> => {
    return removeBookmarkMutation.mutateAsync({ listId, bookmarkId });
  }, [removeBookmarkMutation]);

  const getListById = useCallback(async (id: ID): Promise<BookmarkList | null> => {
    return bookmarkListRepository.getListById(id);
  }, []);

  const getBookmarksByListId = useCallback(async (listId: ID): Promise<Bookmark[]> => {
    const bookmarkIds = await bookmarkListRepository.getBookmarksByListId(listId);
    if (bookmarkIds.length === 0) return [];
    return bookmarkRepository.getByIds(bookmarkIds);
  }, []);

  const isFollowingList = useCallback((listId: ID): boolean => {
    return (followedListsQuery.data ?? []).some((list) => list.id === listId);
  }, [followedListsQuery.data]);

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
    isUpdatingMembership: addBookmarkMutation.isPending || removeBookmarkMutation.isPending,

    // Actions
    createList,
    updateList,
    deleteList,
    followList,
    unfollowList,
    addBookmarkToList,
    removeBookmarkFromList,
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
    addBookmarkMutation.isPending,
    removeBookmarkMutation.isPending,
    createList,
    updateList,
    deleteList,
    followList,
    unfollowList,
    addBookmarkToList,
    removeBookmarkFromList,
    getListById,
    getBookmarksByListId,
    isFollowingList,
    searchLists,
    myListsQuery.refetch,
    publicListsQuery.refetch,
    followedListsQuery.refetch,
  ]);
});
