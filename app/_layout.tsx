import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineProvider } from "@/providers/OfflineProvider";
import { syncEngine } from "@/services/sync-engine";

SplashScreen.preventAutoHideAsync();



function RootLayoutNav() {
  // Simplified navigation without auth/onboarding checks to prevent bundling loop
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('App initializing with offline-first architecture...');
        
        // Initialize sync engine
        console.log('Sync engine initialized');
        
        // Force initial sync if online
        try {
          await syncEngine.forceSync();
          console.log('Initial sync completed');
        } catch (syncError) {
          console.warn('Initial sync failed, will continue offline:', syncError);
        }
        
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        SplashScreen.hideAsync();
      }
    };
    
    initApp();
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        <OfflineProvider>
          <RootLayoutNav />
        </OfflineProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});