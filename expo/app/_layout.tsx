import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineProvider } from "@/providers/OfflineProvider";
import { AuthProvider } from "@/store/useAuthStore";
import { initializeDatabase } from "@/lib/supabase";

SplashScreen.preventAutoHideAsync();



function RootLayoutNav() {
  // Simplified navigation without auth/onboarding checks to prevent bundling loop
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="add-bookmark" options={{ presentation: "modal" }} />
      <Stack.Screen name="add-project" options={{ presentation: "modal" }} />
      <Stack.Screen name="add-note" options={{ presentation: "modal" }} />
      <Stack.Screen name="add-todo" options={{ presentation: "modal", title: "Todo" }} />
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
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const initApp = async () => {
      try {
        console.log('App initializing...');
        
        // Initialize database connection
        const dbInitialized = await initializeDatabase();
        if (dbInitialized) {
          console.log('Database connection established');
        } else {
          console.warn('Database connection failed, continuing in offline mode');
        }
        
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        // Hide splash screen after a short delay to ensure UI is ready
        timeoutId = setTimeout(() => {
          SplashScreen.hideAsync();
        }, 500);
      }
    };
    
    initApp();
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        <AuthProvider>
          <OfflineProvider>
            <RootLayoutNav />
          </OfflineProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});