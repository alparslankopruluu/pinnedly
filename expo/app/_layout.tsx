import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
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
import { SubscriptionProvider } from "@/providers/SubscriptionProvider";
import { configureAccessibilityDefaults } from "@/lib/accessibility";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useAppAppearance } from "@/hooks/useAppAppearance";

configureAccessibilityDefaults();

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
  const { isLoading: onboardingLoading } = useOnboarding();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || onboardingLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/welcome");
      return;
    }

    if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, authLoading, onboardingLoading, segments, router]);

  return null;
}

function RootLayoutNav() {
  const { t } = useTranslation();
  const { colors, isDark } = useAppAppearance();
  const navigationTheme = React.useMemo(() => ({
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
  }), [colors, isDark]);

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AnalyticsProvider>
        <NavigationGuard />
        <Stack screenOptions={{
          headerBackTitle: t('common.back'),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
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
        <Stack.Screen name="discover-lists" options={{ headerShown: false }} />
        <Stack.Screen name="create-list" options={{ presentation: "modal", title: t('navigation.createList') }} />
        <Stack.Screen name="bookmark-list/[id]" options={{ title: t('navigation.bookmarkList') }} />
        </Stack>
      </AnalyticsProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const loadSettings = useSettingsStore((state) => state.loadSettings);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const initApp = async () => {
      try {
        await loadSettings();
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
  }, [loadSettings]);

  return (
    <ErrorBoundary>
      <WebHydrationGate>
        <ShareIntentProviderBoundary>
          <GestureHandlerRootView style={styles.container}>
            <AuthProvider>
              <SubscriptionProvider>
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
              </SubscriptionProvider>
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
