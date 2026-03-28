import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/store/useAuthStore';
import { Button } from '@/components/ui/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, FileText, Bookmark, FolderOpen, Users } from 'lucide-react-native';

const onboardingScreens = [
  {
    id: 1,
    title: 'Capture Everything',
    subtitle: 'Save bookmarks, notes, and ideas in one place',
    description: 'Never lose important content again. Our offline-first approach ensures your data is always available.',
    icon: <Bookmark size={80} color="#4F46E5" />,
    color: '#4F46E5'
  },
  {
    id: 2,
    title: 'Organize Projects',
    subtitle: 'Manage tasks with powerful Kanban boards',
    description: 'Track progress, set deadlines, and collaborate with team members on any project.',
    icon: <FolderOpen size={80} color="#059669" />,
    color: '#059669'
  },
  {
    id: 3,
    title: 'Rich Note Taking',
    subtitle: 'Write in Markdown with live preview',
    description: 'Create beautiful notes with formatting, links, and organize your thoughts effortlessly.',
    icon: <FileText size={80} color="#DC2626" />,
    color: '#DC2626'
  },
  {
    id: 4,
    title: 'Share & Collaborate',
    subtitle: 'Work together seamlessly',
    description: 'Share your work with others, get feedback, and build amazing things together.',
    icon: <Users size={80} color="#7C3AED" />,
    color: '#7C3AED'
  }
];

export default function Welcome() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<number>(0);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(true);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading]);



  const handleNext = () => {
    if (currentScreen < onboardingScreens.length - 1) {
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
      <View style={styles.dotsContainer}>
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
      <Animated.View style={[styles.onboardingContainer, { opacity }]}>
        <View style={styles.onboardingContent}>
          <View style={[styles.iconContainer, { backgroundColor: `${screen.color}15` }]}>
            {screen.icon}
          </View>
          
          <Text style={styles.onboardingTitle}>{screen.title}</Text>
          <Text style={styles.onboardingSubtitle}>{screen.subtitle}</Text>
          <Text style={styles.onboardingDescription}>{screen.description}</Text>
        </View>
        
        {renderDots()}
        
        <View style={styles.onboardingButtons}>
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
          
          <Pressable onPress={handleNext} style={[styles.nextButton, { backgroundColor: screen.color }]}>
            <Text style={styles.nextText}>
              {currentScreen === onboardingScreens.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            <ChevronRight size={20} color="white" />
          </Pressable>
        </View>
      </Animated.View>
    );
  };

  const renderAuthScreen = () => {
    return (
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Bookmark size={40} color="#4F46E5" />
          </View>
          <Text style={styles.title}>Pinnedly</Text>
          <Text style={styles.subtitle}>
            Your offline-first workspace for notes, bookmarks, and projects
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Sign In"
            onPress={() => router.push('./sign-in')}
            style={styles.primaryButton}
          />
          
          <Button
            title="Create Account"
            onPress={() => router.push('./sign-up')}
            variant="outline"
            style={styles.secondaryButton}
          />
        </View>

        <Text style={styles.footerText}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
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
  // Onboarding styles
  onboardingContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  onboardingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
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
  },
  nextText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  // Auth screen styles
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
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