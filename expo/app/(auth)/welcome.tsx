import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Bookmark, ChevronRight, FolderOpen, Users } from '@/components/icons/lucide';
import { useReducedMotion } from '@/hooks/useAccessibilityPreferences';
import { useAuth } from '@/store/useAuthStore';
import { useOnboarding } from '@/store/useOnboardingStore';

const OWL_MASCOT = require('@/assets/brand/owl-mascot-transparent.png');

export default function Welcome() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    hasSeenWelcome,
    isLoading: onboardingLoading,
    markWelcomeSeen,
  } = useOnboarding();
  const [currentScreen, setCurrentScreen] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReducedMotion();
  const { fontScale } = useWindowDimensions();
  const usesLargeText = fontScale >= 1.5;

  const onboardingScreens = useMemo(
    () => [
      {
        id: 'capture',
        title: t('welcome.screens.captureEverything.title'),
        subtitle: t('welcome.screens.captureEverything.subtitle'),
        description: t('welcome.screens.captureEverything.description'),
        icon: Bookmark,
        color: '#F04444',
      },
      {
        id: 'organize',
        title: t('welcome.screens.organizeProjects.title'),
        subtitle: t('welcome.screens.organizeProjects.subtitle'),
        description: t('welcome.screens.organizeProjects.description'),
        icon: FolderOpen,
        color: '#F59E0B',
      },
      {
        id: 'think-share',
        title: t('welcome.screens.thinkAndShare.title'),
        subtitle: t('welcome.screens.thinkAndShare.subtitle'),
        description: t('welcome.screens.thinkAndShare.description'),
        icon: Users,
        color: '#4F46E5',
      },
    ],
    [t]
  );

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [authLoading, isAuthenticated]);

  const finishWelcome = async (method: 'completed' | 'skipped') => {
    try {
      await markWelcomeSeen(method);
    } catch {
      // State is updated before persistence; keep the sign-in path usable offline.
    }
  };

  const handleNext = () => {
    if (currentScreen === onboardingScreens.length - 1) {
      void finishWelcome('completed');
      return;
    }

    if (reduceMotion) {
      setCurrentScreen((current) => current + 1);
      return;
    }

    Animated.timing(opacity, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setCurrentScreen((current) => current + 1);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }).start();
    });
  };

  const renderDots = () => (
    <View
      style={styles.dotsContainer}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: onboardingScreens.length, now: currentScreen + 1 }}
    >
      {onboardingScreens.map((screen, index) => (
        <View
          key={screen.id}
          style={[
            styles.dot,
            index === currentScreen && styles.activeDot,
          ]}
        />
      ))}
    </View>
  );

  const renderOnboardingScreen = () => {
    const screen = onboardingScreens[currentScreen];
    const FeatureIcon = screen.icon;

    return (
      <Animated.ScrollView
        style={[styles.onboardingContainer, { opacity }]}
        contentContainerStyle={styles.onboardingScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.onboardingContent, usesLargeText && styles.onboardingContentLarge]}>
          <View
            style={[styles.mascotStage, usesLargeText && styles.mascotStageLarge]}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          >
            <Image source={OWL_MASCOT} style={styles.mascot} resizeMode="contain" />
            <View style={[styles.featureBadge, { backgroundColor: screen.color }]}>
              <FeatureIcon size={26} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.onboardingTitle} maxFontSizeMultiplier={1.5}>
            {screen.title}
          </Text>
          <Text style={[styles.onboardingSubtitle, { color: screen.color }]} maxFontSizeMultiplier={1.6}>
            {screen.subtitle}
          </Text>
          <Text style={styles.onboardingDescription} maxFontSizeMultiplier={1.75}>
            {screen.description}
          </Text>
        </View>

        {renderDots()}

        <View style={[styles.onboardingButtons, usesLargeText && styles.onboardingButtonsLarge]}>
          <Pressable
            onPress={() => void finishWelcome('skipped')}
            style={styles.skipButton}
            accessibilityRole="button"
          >
            <Text style={styles.skipText}>{t('common.skip')}</Text>
          </Pressable>

          <Pressable
            onPress={handleNext}
            style={[styles.nextButton, { backgroundColor: screen.color }]}
            accessibilityRole="button"
            accessibilityLabel={
              currentScreen === onboardingScreens.length - 1
                ? t('common.getStarted')
                : t('common.next')
            }
          >
            <Text style={styles.nextText} maxFontSizeMultiplier={1.5}>
              {currentScreen === onboardingScreens.length - 1
                ? t('common.getStarted')
                : t('common.next')}
            </Text>
            <ChevronRight size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </Animated.ScrollView>
    );
  };

  const renderAuthScreen = () => (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.authMascotStage} accessible={false} importantForAccessibility="no-hide-descendants">
          <Image source={OWL_MASCOT} style={styles.authMascot} resizeMode="contain" />
        </View>
        <Text style={styles.title} maxFontSizeMultiplier={1.5}>{t('common.appName')}</Text>
        <Text style={styles.subtitle} maxFontSizeMultiplier={1.75}>{t('welcome.subtitle')}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title={t('auth.signIn')}
          onPress={() => router.push('/(auth)/sign-in')}
          style={styles.primaryButton}
        />
        <Button
          title={t('auth.createAccount')}
          onPress={() => router.push('/(auth)/sign-up')}
          variant="outline"
          style={styles.secondaryButton}
        />
      </View>

      <Text style={styles.footerText} maxFontSizeMultiplier={1.75}>{t('auth.termsFooter')}</Text>
    </ScrollView>
  );

  if (authLoading || onboardingLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('welcome.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {hasSeenWelcome ? renderAuthScreen() : renderOnboardingScreen()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
  },
  onboardingContainer: {
    flex: 1,
  },
  onboardingScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  onboardingContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  onboardingContentLarge: {
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  mascotStage: {
    width: 210,
    height: 210,
    borderRadius: 48,
    backgroundColor: '#FFF1EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  mascotStageLarge: {
    width: 132,
    height: 132,
    borderRadius: 34,
    marginBottom: 18,
  },
  mascot: {
    width: '90%',
    height: '90%',
  },
  featureBadge: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onboardingTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#17213B',
    textAlign: 'center',
    marginBottom: 10,
  },
  onboardingSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  onboardingDescription: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 12,
    maxWidth: 520,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  dot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  activeDot: {
    width: 24,
    backgroundColor: '#F04444',
  },
  onboardingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
  },
  onboardingButtonsLarge: {
    flexDirection: 'column-reverse',
    alignItems: 'stretch',
    gap: 8,
  },
  skipButton: {
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },
  nextButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 8,
  },
  nextText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 42,
  },
  authMascotStage: {
    width: 144,
    height: 144,
    borderRadius: 38,
    backgroundColor: '#FFF1EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  authMascot: {
    width: '90%',
    height: '90%',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#17213B',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    maxWidth: 520,
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#F04444',
  },
  secondaryButton: {
    borderColor: '#CBD5E1',
  },
  footerText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
});
