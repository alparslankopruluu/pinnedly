import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  Image,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { LinearGradient } from 'expo-linear-gradient';
import { useOnboarding } from '@/store/useOnboardingStore';
import { useAuth } from '@/store/useAuthStore';
import { trackOnboardingEvent } from '@/lib/analytics';

const { width: screenWidth } = Dimensions.get('window');

type OnboardingScreen = {
  id: string;
  illustration: string;
  headline: string;
  body: string;
  ctaText: string;
};

export default function Onboarding() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { completeOnboarding, skipOnboarding } = useOnboarding();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const flatListRef = useRef<FlatList<OnboardingScreen>>(null);

  useEffect(() => {
    trackOnboardingEvent('onboarding_started');
  }, []);

  const onboardingScreens: OnboardingScreen[] = useMemo(
    () => [
      {
        id: '1',
        illustration: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop&crop=face',
        headline: t('onboarding.screens.saveWhatMatters.headline'),
        body: t('onboarding.screens.saveWhatMatters.body'),
        ctaText: t('onboarding.screens.saveWhatMatters.cta'),
      },
      {
        id: '2',
        illustration: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face',
        headline: t('onboarding.screens.saveBookmarks.headline'),
        body: t('onboarding.screens.saveBookmarks.body'),
        ctaText: t('onboarding.screens.saveBookmarks.cta'),
      },
      {
        id: '3',
        illustration: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=300&h=300&fit=crop',
        headline: t('onboarding.screens.projectsMoveForward.headline'),
        body: t('onboarding.screens.projectsMoveForward.body'),
        ctaText: t('onboarding.screens.projectsMoveForward.cta'),
      },
      {
        id: '4',
        illustration: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=300&h=300&fit=crop',
        headline: t('onboarding.screens.shareCollaborate.headline'),
        body: t('onboarding.screens.shareCollaborate.body'),
        ctaText: t('onboarding.screens.shareCollaborate.cta'),
      },
    ],
    [t]
  );

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/welcome');
    }
  }, [isAuthenticated]);

  const handleCompleteOnboarding = useCallback(async () => {
    try {
      await completeOnboarding();
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    }
  }, [completeOnboarding]);

  const handleSkipOnboarding = useCallback(async () => {
    try {
      await skipOnboarding();
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Failed to skip onboarding:', error);
    }
  }, [skipOnboarding]);

  const handleNext = useCallback(async () => {
    if (currentIndex < onboardingScreens.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      return;
    }

    await handleCompleteOnboarding();
  }, [currentIndex, onboardingScreens.length, handleCompleteOnboarding]);

  const handleSkip = useCallback(async () => {
    await handleSkipOnboarding();
  }, [handleSkipOnboarding]);

  const onMomentumScrollEnd = useCallback((event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    setCurrentIndex(index);
  }, []);

  const renderScreen = ({ item }: { item: OnboardingScreen }) => (
    <View style={styles.screenContainer}>
      <View style={styles.illustrationContainer}>
        <Image source={{ uri: item.illustration }} style={styles.illustration} />
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.headline}>{item.headline}</Text>
        <Text style={styles.body}>{item.body}</Text>
      </View>
    </View>
  );

  const renderPaginationDots = () => (
    <View style={styles.paginationContainer}>
      {onboardingScreens.map((_, index) => (
        <View
          key={index}
          style={[
            styles.paginationDot,
            index === currentIndex && styles.paginationDotActive,
          ]}
        />
      ))}
    </View>
  );

  return (
    <LinearGradient
      colors={['#fed7aa', '#fdba74', '#fb923c']}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={onboardingScreens}
          renderItem={renderScreen}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          style={styles.flatList}
        />

        <View style={styles.bottomSection}>
          {renderPaginationDots()}
          
          <Button
            title={onboardingScreens[currentIndex].ctaText}
            onPress={handleNext}
            style={styles.ctaButton}
            textStyle={styles.ctaButtonText}
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#7c2d12',
  },
  flatList: {
    flex: 1,
  },
  screenContainer: {
    width: screenWidth,
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  illustration: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#7c2d12',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
  },
  body: {
    fontSize: 16,
    color: '#a16207',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(124, 45, 18, 0.3)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#7c2d12',
    width: 24,
  },
  ctaButton: {
    backgroundColor: '#7c2d12',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#ffffff',
  },
});