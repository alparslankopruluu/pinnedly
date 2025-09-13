import React, { useState, useRef, useCallback, useEffect } from 'react';
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
import { Button } from '@/components/ui/Button';
import { LinearGradient } from 'expo-linear-gradient';
import { useOnboarding } from '@/store/useOnboardingStore';
import { useAuth } from '@/store/useAuthStore';

const { width: screenWidth } = Dimensions.get('window');

type OnboardingScreen = {
  id: string;
  illustration: string;
  headline: string;
  body: string;
  ctaText: string;
};

const onboardingScreens: OnboardingScreen[] = [
  {
    id: '1',
    illustration: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop&crop=face',
    headline: 'Save what matters, don\'t forget again.',
    body: 'Pinnedly helps you effortlessly add bookmarks, create notes, and manage projects to stay on top of everything.',
    ctaText: 'Get Started',
  },
  {
    id: '2',
    illustration: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face',
    headline: 'Save bookmarks from anywhere.',
    body: 'Paste a URL, add screenshots, and track how often you revisit it.',
    ctaText: 'Next',
  },
  {
    id: '3',
    illustration: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=300&h=300&fit=crop',
    headline: 'See your projects move forward.',
    body: 'Create projects, add tasks, and watch your progress grow.',
    ctaText: 'Next',
  },
  {
    id: '4',
    illustration: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=300&h=300&fit=crop',
    headline: 'Share and collaborate.',
    body: 'Follow friends, share bookmarks, and work on projects together.',
    ctaText: 'Get Started',
  },
];

export default function Onboarding() {
  const { isAuthenticated } = useAuth();
  const { completeOnboarding, skipOnboarding } = useOnboarding();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const flatListRef = useRef<FlatList<OnboardingScreen>>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/welcome');
    }
  }, [isAuthenticated]);

  const handleNext = useCallback(async () => {
    if (currentIndex < onboardingScreens.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    } else {
      // Last screen - complete onboarding
      await handleCompleteOnboarding();
    }
  }, [currentIndex]);

  const handleSkip = useCallback(async () => {
    await handleSkipOnboarding();
  }, []);

  const handleCompleteOnboarding = async () => {
    try {
      completeOnboarding();
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      router.replace('/(tabs)');
    }
  };

  const handleSkipOnboarding = async () => {
    try {
      skipOnboarding();
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Failed to skip onboarding:', error);
      router.replace('/(tabs)');
    }
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }, []);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

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
        {/* Skip Button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Screens */}
        <FlatList
          ref={flatListRef}
          data={onboardingScreens}
          renderItem={renderScreen}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          style={styles.flatList}
        />

        {/* Bottom Section */}
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