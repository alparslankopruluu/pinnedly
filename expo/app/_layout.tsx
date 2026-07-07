import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import { OfflineProvider } from "@/providers/OfflineProvider";
import { DialogProvider } from "@/providers/DialogProvider";
import { AuthProvider, useAuth } from "@/store/useAuthStore";
import { OnboardingProvider, useOnboarding } from "@/store/useOnboardingStore";
import { SharingProvider } from "@/store/useSharingStore";
import { initializeFirestore } from "@/lib/firestore";
import { initializeAnalytics } from "@/lib/analytics";
import { initializeCrashlytics, recordError } from "@/lib/crashlytics";
import { ShareIntentHandler, ShareIntentProviderBoundary } from "@/components/ShareIntentHandler";
import { ClipboardUrlBanner } from "@/components/ClipboardUrlBanner";
import { loadSavedLanguage } from "@/lib/i18n";

SplashScreen.preventAutoHideAsync();

function WebHydrationGate({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = React.useState(Platform.OS !== "web");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <View style={styles.container} />;
  }

  return <>{children}</>;
}

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
  const { t } = useTranslation();

  return (
    <AnalyticsProvider>
      <NavigationGuard />
      <Stack screenOptions={{ headerBackTitle: t('common.back') }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: t('navigation.settings') }} />
        <Stack.Screen name="edit-profile" options={{ title: t('navigation.editProfile') }} />
        <Stack.Screen name="ai-chat" options={{ title: t('navigation.aiAssistant') }} />
        <Stack.Screen name="add-bookmark" options={{ presentation: "modal" }} />
        <Stack.Screen name="add-project" options={{ presentation: "modal" }} />
        <Stack.Screen name="add-note" options={{ presentation: "modal" }} />
        <Stack.Screen name="add-todo" options={{ presentation: "modal" }} />
        <Stack.Screen name="bookmark/[id]" />
        <Stack.Screen name="project/[id]" />
        <Stack.Screen name="note/[id]" />
        <Stack.Screen name="profile/[id]" options={{ title: t('navigation.profile') }} />
        <Stack.Screen name="share-inbox" options={{ title: t('navigation.shareInbox') }} />
        <Stack.Screen name="invite/[token]" options={{ title: t('navigation.invite') }} />
        <Stack.Screen name="people-search" options={{ presentation: "modal", title: t('navigation.findPeople') }} />
        <Stack.Screen name="discover-lists" options={{ title: t('navigation.discoverLists') }} />
        <Stack.Screen name="create-list" options={{ presentation: "modal", title: t('navigation.createList') }} />
        <Stack.Screen name="bookmark-list/[id]" options={{ title: t('navigation.bookmarkList') }} />
      </Stack>
    </AnalyticsProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const initApp = async () => {
      try {
        await loadSavedLanguage();
        await initializeFirestore();
        await initializeAnalytics();
        await initializeCrashlytics();
      } catch (error) {
        console.error("Failed to initialize app:", error);
        recordError(
          error instanceof Error ? error : new Error("App initialization failed"),
          "app:init"
        );
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
      <WebHydrationGate>
        <ShareIntentProviderBoundary>
          <GestureHandlerRootView style={styles.container}>
            <AuthProvider>
              <OnboardingProvider>
                <SharingProvider>
                  <OfflineProvider>
                    <DialogProvider>
                      <ShareIntentHandler />
                      <ClipboardUrlBanner />
                      <RootLayoutNav />
                    </DialogProvider>
                  </OfflineProvider>
                </SharingProvider>
              </OnboardingProvider>
            </AuthProvider>
          </GestureHandlerRootView>
        </ShareIntentProviderBoundary>
      </WebHydrationGate>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
