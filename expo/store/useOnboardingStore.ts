import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { trackOnboardingEvent } from '@/lib/analytics';
import {
  CURRENT_ONBOARDING_VERSION,
  INITIAL_ONBOARDING_STATE,
  normalizeStoredOnboardingState,
  shouldShowCurrentOnboarding,
  type StoredOnboardingState,
} from '@/lib/onboardingState';

const ONBOARDING_KEY = 'pinnedly_onboarding';

type CompletionDetails = {
  step: number;
  screenId: string;
  navigationMethod: 'swipe' | 'button';
};

export const [OnboardingProvider, useOnboarding] = createContextHook(() => {
  const [state, setState] = useState<StoredOnboardingState>(INITIAL_ONBOARDING_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const stateRef = useRef(state);
  const completionPromiseRef = useRef<Promise<void> | null>(null);

  const updateState = useCallback((nextState: StoredOnboardingState) => {
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (stored) {
          updateState(normalizeStoredOnboardingState(JSON.parse(stored)));
        }
      } catch (error) {
        console.error('Failed to load onboarding state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [updateState]);

  const persist = useCallback(async (nextState: StoredOnboardingState) => {
    await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(nextState));
    updateState(nextState);
  }, [updateState]);

  const completeOnboarding = useCallback((
    method: 'completed' | 'skipped' = 'completed',
    details: CompletionDetails = { step: 2, screenId: 'think-share', navigationMethod: 'button' }
  ): Promise<void> => {
    if (!shouldShowCurrentOnboarding(stateRef.current)) {
      return Promise.resolve();
    }
    if (completionPromiseRef.current) {
      return completionPromiseRef.current;
    }

    const completion = (async () => {
      const nextState: StoredOnboardingState = {
        ...stateRef.current,
        hasSeenWelcome: true,
        completedExperienceVersion: CURRENT_ONBOARDING_VERSION,
        isCompleted: true,
        currentStep: details.step,
      };

      try {
        await persist(nextState);
        await trackOnboardingEvent(
          method === 'skipped' ? 'onboarding_skipped' : 'onboarding_completed',
          {
            step: details.step,
            screen_id: details.screenId,
            navigation_method: details.navigationMethod,
            onboarding_version: CURRENT_ONBOARDING_VERSION,
          }
        );
      } catch (error) {
        console.error('Failed to save welcome state:', error);
        throw error;
      }
    })();

    completionPromiseRef.current = completion;
    void completion.then(
      () => { completionPromiseRef.current = null; },
      () => { completionPromiseRef.current = null; }
    );
    return completion;
  }, [persist]);

  const markWelcomeSeen = useCallback(
    (method: 'completed' | 'skipped' = 'completed') => completeOnboarding(method),
    [completeOnboarding]
  );

  const resetOnboarding = useCallback(async () => {
    try {
      await persist(INITIAL_ONBOARDING_STATE);
    } catch (error) {
      console.error('Failed to reset onboarding state:', error);
      throw error;
    }
  }, [persist]);

  return useMemo(() => ({
    hasSeenWelcome: state.hasSeenWelcome,
    completedExperienceVersion: state.completedExperienceVersion,
    shouldShowOnboarding: shouldShowCurrentOnboarding(state),
    isLoading,
    completeOnboarding,
    markWelcomeSeen,
    resetOnboarding,
  }), [completeOnboarding, isLoading, markWelcomeSeen, resetOnboarding, state]);
});
