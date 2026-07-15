import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { trackOnboardingEvent } from '@/lib/analytics';

const ONBOARDING_KEY = 'pinnedly_onboarding';

type StoredOnboardingState = {
  hasSeenWelcome: boolean;
  // Kept when reading/writing so existing installations migrate without a reset.
  isCompleted?: boolean;
  currentStep?: number;
};

const INITIAL_STATE: StoredOnboardingState = {
  hasSeenWelcome: false,
};

export const [OnboardingProvider, useOnboarding] = createContextHook(() => {
  const [state, setState] = useState<StoredOnboardingState>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<StoredOnboardingState>;
          setState({
            ...parsed,
            hasSeenWelcome: parsed.hasSeenWelcome === true,
          });
        }
      } catch (error) {
        console.error('Failed to load onboarding state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const persist = useCallback(async (nextState: StoredOnboardingState) => {
    setState(nextState);
    await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(nextState));
  }, []);

  const markWelcomeSeen = useCallback(async (method: 'completed' | 'skipped' = 'completed') => {
    const nextState = {
      ...state,
      hasSeenWelcome: true,
    };

    try {
      await persist(nextState);
      await trackOnboardingEvent(
        method === 'skipped' ? 'onboarding_skipped' : 'onboarding_completed',
        { step: method === 'skipped' ? 0 : 2 }
      );
    } catch (error) {
      console.error('Failed to save welcome state:', error);
      throw error;
    }
  }, [persist, state]);

  const resetOnboarding = useCallback(async () => {
    try {
      await persist(INITIAL_STATE);
    } catch (error) {
      console.error('Failed to reset onboarding state:', error);
      throw error;
    }
  }, [persist]);

  return useMemo(() => ({
    hasSeenWelcome: state.hasSeenWelcome,
    isLoading,
    markWelcomeSeen,
    resetOnboarding,
  }), [isLoading, markWelcomeSeen, resetOnboarding, state.hasSeenWelcome]);
});
