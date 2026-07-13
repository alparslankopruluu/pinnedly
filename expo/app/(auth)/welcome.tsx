import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, ScrollView, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/store/useAuthStore';
import { Button } from '@/components/ui/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, FileText, Bookmark, FolderOpen, Users } from '@/components/icons/lucide';
import { useReducedMotion } from '@/hooks/useAccessibilityPreferences';

export default function Welcome() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<number>(0);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(true);
  const opacity = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReducedMotion();
  const { fontScale } = useWindowDimensions();
  const usesLargeText = fontScale >= 1.5;

  const onboardingScreens = useMemo(
    () => [
      {
        id: 1,
        title: t('welcome.screens.captureEverything.title'),
        subtitle: t('welcome.screens.captureEverything.subtitle'),
        description: t('welcome.screens.captureEverything.description'),
        icon: <Bookmark size={80} color="#4F46E5" />,
        color: '#4F46E5',
      },
      {
        id: 2,
        title: t('welcome.screens.organizeProjects.title'),
        subtitle: t('welcome.screens.organizeProjects.subtitle'),
        description: t('welcome.screens.organizeProjects.description'),
        icon: <FolderOpen size={80} color="#059669" />,
        color: '#059669',
      },
      {
        id: 3,
        title: t('welcome.screens.richNoteTaking.title'),
        subtitle: t('welcome.screens.richNoteTaking.subtitle'),
        description: t('welcome.screens.richNoteTaking.description'),
        icon: <FileText size={80} color="#DC2626" />,
        color: '#DC2626',
      },
      {
        id: 4,
        title: t('welcome.screens.shareCollaborate.title'),
        subtitle: t('welcome.screens.shareCollaborate.subtitle'),
        description: t('welcome.screens.shareCollaborate.description'),
        icon: <Users size={80} color="#7C3AED" />,
        color: '#7C3AED',
      },
    ],
    [t]
  );

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading]);

  const handleNext = () => {
    if (currentScreen < onboardingScreens.length - 1) {
      if (reduceMotion) {
        setCurrentScreen((current) => current + 1);
        return;
      }
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentScreen(currentScreen + 1);
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    } else {
      setShowOnboarding(false);
    }
  };

  const handleSkip = () => {
    setShowOnboarding(false);
  };

  const renderDots = () => {
    return (
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
              {
                backgroundColor: index === currentScreen ? '#4F46E5' : '#E5E7EB',
                width: index === currentScreen ? 24 : 8,
              }
            ]}
          />
        ))}
      </View>
    );
  };

  const renderOnboardingScreen = () => {
    const screen = onboardingScreens[currentScreen];
    
    return (
      <Animated.ScrollView
        style={[styles.onboardingContainer, { opacity }]}
        contentContainerStyle={styles.onboardingScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.onboardingContent, usesLargeText && styles.onboardingContentLarge]}>
          <View
            style={[
              styles.iconContainer,
              usesLargeText && styles.iconContainerLarge,
              { backgroundColor: `${screen.color}15` },
            ]}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          >
            {screen.icon}
          </View>
          
          <Text style={styles.onboardingTitle} maxFontSizeMultiplier={1.5}>{screen.title}</Text>
          <Text style={styles.onboardingSubtitle} maxFontSizeMultiplier={1.75}>{screen.subtitle}</Text>
          <Text style={styles.onboardingDescription}>{screen.description}</Text>
        </View>
        
        {renderDots()}
        
        <View style={[styles.onboardingButtons, usesLargeText && styles.onboardingButtonsLarge]}>
          <Pressable onPress={handleSkip} style={styles.skipButton} accessibilityRole="button">
            <Text style={styles.skipText}>{t('common.skip')}</Text>
          </Pressable>
          
          <Pressable
            onPress={handleNext}
            style={[styles.nextButton, { backgroundColor: screen.color }]}
            accessibilityRole="button"
            accessibilityLabel={currentScreen === onboardingScreens.length - 1 ? t('common.getStarted') : t('common.next')}
          >
            <Text style={styles.nextText} maxFontSizeMultiplier={1.5}>
              {currentScreen === onboardingScreens.length - 1 ? t('common.getStarted') : t('common.next')}
            </Text>
            <ChevronRight size={20} color="white" />
          </Pressable>
        </View>
      </Animated.ScrollView>
    );
  };

  const renderAuthScreen = () => {
    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Bookmark size={40} color="#4F46E5" />
          </View>
          <Text style={styles.title}>{t('common.appName')}</Text>
          <Text style={styles.subtitle}>
            {t('welcome.subtitle')}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title={t('auth.signIn')}
            onPress={() => router.push('./sign-in')}
            style={styles.primaryButton}
          />
          
          <Button
            title={t('auth.createAccount')}
            onPress={() => router.push('./sign-up')}
            variant="outline"
            style={styles.secondaryButton}
          />
        </View>

        <Text style={styles.footerText}>
          {t('auth.termsFooter')}
        </Text>
      </ScrollView>
    );
  };

  if (isLoading) {
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
      {showOnboarding ? renderOnboardingScreen() : renderAuthScreen()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
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
    paddingVertical: 24,
  },
  onboardingContentLarge: {
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainerLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 20,
  },
  onboardingTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 12,
  },
  onboardingSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4f46e5',
    textAlign: 'center',
    marginBottom: 16,
  },
  onboardingDescription: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  onboardingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
  },
  onboardingButtonsLarge: {
    flexDirection: 'column-reverse',
    alignItems: 'stretch',
    gap: 8,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
  },
  nextText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#4f46e5',
  },
  secondaryButton: {
    borderColor: '#d1d5db',
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
  },
});
