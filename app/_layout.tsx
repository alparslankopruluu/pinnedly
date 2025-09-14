import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/store/useAuthStore";
import { SocialProvider } from "@/store/useSocialStore";
import { OnboardingProvider, useOnboarding } from "@/store/useOnboardingStore";
import { BookmarkListProvider } from "@/store/useBookmarkListStore";
import { trpc, trpcClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isCompleted: onboardingCompleted, isLoading: onboardingLoading } = useOnboarding();
  
  if (authLoading || onboardingLoading) {
    return null;
  }
  
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      {!isAuthenticated ? (
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      ) : !onboardingCompleted ? (
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="(tabs)" options={{ headerShown: true }} />
          <Stack.Screen name="add-bookmark" options={{ presentation: "modal" }} />
          <Stack.Screen name="add-project" options={{ presentation: "modal" }} />
          <Stack.Screen name="add-note" options={{ presentation: "modal" }} />
          <Stack.Screen name="bookmark/[id]" />
          <Stack.Screen name="project/[id]" />
          <Stack.Screen name="note/[id]" />
          <Stack.Screen name="profile/[id]" />
          <Stack.Screen name="share-inbox" options={{ title: "Share Inbox" }} />
          <Stack.Screen name="people-search" options={{ presentation: "modal", title: "Find People" }} />
          <Stack.Screen name="discover-lists" options={{ title: "Discover Lists" }} />
          <Stack.Screen name="create-list" options={{ presentation: "modal", title: "Create List" }} />
          <Stack.Screen name="bookmark-list/[id]" options={{ title: "Bookmark List" }} />
        </>
      )}
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <OnboardingProvider>
            <SocialProvider>
              <BookmarkListProvider>
                <GestureHandlerRootView style={styles.container}>
                  <RootLayoutNav />
                </GestureHandlerRootView>
              </BookmarkListProvider>
            </SocialProvider>
          </OnboardingProvider>
        </AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});