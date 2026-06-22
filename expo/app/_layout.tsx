import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineProvider } from "@/providers/OfflineProvider";
import { AuthProvider, useAuth } from "@/store/useAuthStore";
import { OnboardingProvider, useOnboarding } from "@/store/useOnboardingStore";
import { initializeDatabase } from "@/lib/supabase";
import { syncEngine } from "@/services/sync-engine";

SplashScreen.preventAutoHideAsync();

function NavigationGuard() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isCompleted: onboardingCompleted, isLoading: onboardingLoading } = useOnboarding();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || onboardingLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const onOnboarding = segments[0] === "onboarding";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/welcome");
      return;
    }

    if (isAuthenticated && inAuthGroup) {
      router.replace(onboardingCompleted ? "/(tabs)" : "/onboarding");
      return;
    }

    if (isAuthenticated && !onboardingCompleted && !onOnboarding) {
      router.replace("/onboarding");
    }
  }, [isAuthenticated, authLoading, onboardingLoading, onboardingCompleted, segments, router]);

  return null;
}

function RootLayoutNav() {
  return (
    <>
      <NavigationGuard />
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
        <Stack.Screen name="ai-chat" options={{ title: "AI Assistant" }} />
        <Stack.Screen name="add-bookmark" options={{ presentation: "modal" }} />
        <Stack.Screen name="add-project" options={{ presentation: "modal" }} />
        <Stack.Screen name="add-note" options={{ presentation: "modal" }} />
        <Stack.Screen name="add-todo" options={{ presentation: "modal", title: "Todo" }} />
        <Stack.Screen name="bookmark/[id]" />
        <Stack.Screen name="project/[id]" />
        <Stack.Screen name="note/[id]" />
        <Stack.Screen name="profile/[id]" options={{ title: "Profile" }} />
        <Stack.Screen name="share-inbox" options={{ title: "Share Inbox" }} />
        <Stack.Screen name="people-search" options={{ presentation: "modal", title: "Find People" }} />
        <Stack.Screen name="discover-lists" options={{ title: "Discover Lists" }} />
        <Stack.Screen name="create-list" options={{ presentation: "modal", title: "Create List" }} />
        <Stack.Screen name="bookmark-list/[id]" options={{ title: "Bookmark List" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const initApp = async () => {
      try {
        console.log("App initializing...");

        const dbInitialized = await initializeDatabase();
        if (dbInitialized) {
          console.log("Database connection established");
          await syncEngine.forceSync();
        } else {
          console.warn("Database connection failed, continuing in offline mode");
        }
      } catch (error) {
        console.error("Failed to initialize app:", error);
      } finally {
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
          <OnboardingProvider>
            <OfflineProvider>
              <RootLayoutNav />
            </OfflineProvider>
          </OnboardingProvider>
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