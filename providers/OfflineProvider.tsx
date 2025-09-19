import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectStoreProvider, BookmarkStoreProvider, NoteStoreProvider } from '@/store/useOfflineStore';
import { notificationService } from '@/utils/notifications';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';

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
        
        if (data.entityType && data.entityId) {
          // Navigate to the relevant screen based on entity type
          switch (data.entityType) {
            case 'project':
              router.push(`/project/${data.entityId}` as any);
              break;
            case 'task':
              // Find the project that contains this task and navigate to it
              // This would require a more complex lookup
              console.log('Navigate to task:', data.entityId);
              break;
            case 'note':
              router.push(`/note/${data.entityId}` as any);
              break;
            case 'bookmark':
              router.push(`/bookmark/${data.entityId}` as any);
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
            {children}
          </NoteStoreProvider>
        </BookmarkStoreProvider>
      </ProjectStoreProvider>
    </QueryClientProvider>
  );
}

// Export hooks for easy access
export { useProjectStore, useBookmarkStore, useNoteStore } from '@/store/useOfflineStore';

// Export sync engine utilities
export { syncEngine, useSyncStatus } from '@/services/sync-engine';