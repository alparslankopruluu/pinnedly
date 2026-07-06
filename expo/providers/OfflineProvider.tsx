import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectStoreProvider, BookmarkStoreProvider, NoteStoreProvider } from '@/store/useOfflineStore';
import { TodoStoreProvider } from '@/store/useTodoStore';
import { BookmarkListProvider } from '@/store/useBookmarkListStore';
import { notificationService } from '@/utils/notifications';
import { router } from 'expo-router';
import { BookmarkDigestSync } from '@/components/BookmarkDigestSync';

// Create a query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

interface OfflineProviderProps {
  children: React.ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  useEffect(() => {
    // Initialize notifications
    notificationService.initialize();

    // Handle notification taps
    const subscription = notificationService.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        
        if (data.type === 'bookmark_digest') {
          router.push('/(tabs)/bookmarks?filter=inbox' as never);
          return;
        }

        if (data.type === 'entity_reminder' && data.entityType && data.entityId) {
          switch (data.entityType) {
            case 'bookmark':
              router.push(`/bookmark/${data.entityId}` as never);
              break;
            case 'note':
              router.push(`/note/${data.entityId}` as never);
              break;
            case 'todo':
              router.push('/(tabs)/todos' as never);
              break;
          }
          return;
        }

        if (data.entityType && data.entityId) {
          switch (data.entityType) {
            case 'project':
              router.push(`/project/${data.entityId}` as never);
              break;
            case 'task':
              console.log('Navigate to task:', data.entityId);
              break;
            case 'note':
              router.push(`/note/${data.entityId}` as never);
              break;
            case 'bookmark':
              if (data.entityId === 'inbox') {
                router.push('/(tabs)/bookmarks?filter=inbox' as never);
              } else {
                router.push(`/bookmark/${data.entityId}` as never);
              }
              break;
          }
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ProjectStoreProvider>
        <BookmarkStoreProvider>
          <NoteStoreProvider>
            <TodoStoreProvider>
              <BookmarkListProvider>
                <BookmarkDigestSync />
                {children}
              </BookmarkListProvider>
            </TodoStoreProvider>
          </NoteStoreProvider>
        </BookmarkStoreProvider>
      </ProjectStoreProvider>
    </QueryClientProvider>
  );
}

// Export hooks for easy access
export { useProjectStore, useBookmarkStore, useNoteStore } from '@/store/useOfflineStore';
export { useTodoStore } from '@/store/useTodoStore';

export { useSyncStatus } from '@/hooks/useSyncStatus';