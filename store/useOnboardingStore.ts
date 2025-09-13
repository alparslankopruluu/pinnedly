import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingState, OnboardingStep } from '@/types';

const ONBOARDING_KEY = 'pinnedly_onboarding';

const onboardingSteps: OnboardingStep[] = [
  {
    id: '1',
    title: 'Save Everything',
    description: 'Bookmark articles, videos, and links from anywhere. Never lose important content again.',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&h=300&fit=crop'
  },
  {
    id: '2',
    title: 'Organize Projects',
    description: 'Track your projects with tasks, deadlines, and progress. Stay on top of everything.',
    image: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=300&h=300&fit=crop'
  },
  {
    id: '3',
    title: 'Take Smart Notes',
    description: 'Write notes with markdown support and link them to your bookmarks and projects.',
    image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=300&h=300&fit=crop'
  },
  {
    id: '4',
    title: 'Share & Collaborate',
    description: 'Share your lists publicly or collaborate privately with team members.',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=300&h=300&fit=crop'
  }
];

export const [OnboardingProvider, useOnboarding] = createContextHook(() => {
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({
    isCompleted: false,
    currentStep: 0,
    hasSeenWelcome: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadOnboardingState();
  }, []);

  const loadOnboardingState = async () => {
    try {
      const stored = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (stored) {
        const parsedState = JSON.parse(stored) as OnboardingState;
        setOnboardingState(parsedState);
      }
    } catch (error) {
      console.error('Failed to load onboarding state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveOnboardingState = async (state: OnboardingState) => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(state));
      setOnboardingState(state);
    } catch (error) {
      console.error('Failed to save onboarding state:', error);
    }
  };

  const nextStep = useCallback(() => {
    const newStep = Math.min(onboardingState.currentStep + 1, onboardingSteps.length - 1);
    const newState = { ...onboardingState, currentStep: newStep };
    saveOnboardingState(newState);
  }, [onboardingState]);

  const previousStep = useCallback(() => {
    const newStep = Math.max(onboardingState.currentStep - 1, 0);
    const newState = { ...onboardingState, currentStep: newStep };
    saveOnboardingState(newState);
  }, [onboardingState]);

  const completeOnboarding = useCallback(() => {
    const newState = { ...onboardingState, isCompleted: true };
    saveOnboardingState(newState);
  }, [onboardingState]);

  const skipOnboarding = useCallback(() => {
    const newState = { ...onboardingState, isCompleted: true };
    saveOnboardingState(newState);
  }, [onboardingState]);

  const resetOnboarding = useCallback(() => {
    const newState = {
      isCompleted: false,
      currentStep: 0,
      hasSeenWelcome: false,
    };
    saveOnboardingState(newState);
  }, []);

  const markWelcomeSeen = useCallback(() => {
    const newState = { ...onboardingState, hasSeenWelcome: true };
    saveOnboardingState(newState);
  }, [onboardingState]);

  return useMemo(() => ({
    ...onboardingState,
    isLoading,
    steps: onboardingSteps,
    currentStepData: onboardingSteps[onboardingState.currentStep],
    isFirstStep: onboardingState.currentStep === 0,
    isLastStep: onboardingState.currentStep === onboardingSteps.length - 1,
    nextStep,
    previousStep,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
    markWelcomeSeen,
  }), [onboardingState, isLoading, nextStep, previousStep, completeOnboarding, skipOnboarding, resetOnboarding, markWelcomeSeen]);
});