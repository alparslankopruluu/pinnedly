import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectStoreProvider, BookmarkStoreProvider, NoteStoreProvider } from '@/store/useOfflineStore';

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