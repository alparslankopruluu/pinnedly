import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/store/useAuthStore";
import { SocialProvider } from "@/store/useSocialStore";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="add-bookmark" options={{ presentation: "modal" }} />
      <Stack.Screen name="add-project" options={{ presentation: "modal" }} />
      <Stack.Screen name="add-note" options={{ presentation: "modal" }} />
      <Stack.Screen name="bookmark/[id]" />
      <Stack.Screen name="project/[id]" />
      <Stack.Screen name="note/[id]" />
      <Stack.Screen name="profile/[id]" />
      <Stack.Screen name="share-inbox" options={{ title: "Share Inbox" }} />
      <Stack.Screen name="people-search" options={{ presentation: "modal", title: "Find People" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocialProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <RootLayoutNav />
          </GestureHandlerRootView>
        </SocialProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}