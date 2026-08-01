import React from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OnboardingExperience } from '@/components/onboarding/OnboardingExperience';
import { useOnboarding } from '@/store/useOnboardingStore';
import { useAppAppearance } from '@/hooks/useAppAppearance';

export function OnboardingGate() {
  const { colors } = useAppAppearance();
  const {
    completeOnboarding,
    isLoading,
    shouldShowOnboarding,
  } = useOnboarding();

  if (isLoading || !shouldShowOnboarding) return null;

  return (
    <Modal
      animationType="none"
      onRequestClose={() => undefined}
      presentationStyle="fullScreen"
      statusBarTranslucent={false}
      transparent={false}
      visible
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <OnboardingExperience onComplete={completeOnboarding} />
      </SafeAreaView>
    </Modal>
  );
}
