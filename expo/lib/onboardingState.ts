export const CURRENT_ONBOARDING_VERSION = 2;

export type StoredOnboardingState = {
  hasSeenWelcome: boolean;
  completedExperienceVersion: number;
  // Retained for compatibility with early onboarding payloads.
  isCompleted?: boolean;
  currentStep?: number;
};

export const INITIAL_ONBOARDING_STATE: StoredOnboardingState = {
  hasSeenWelcome: false,
  completedExperienceVersion: 0,
};

export function normalizeStoredOnboardingState(value: unknown): StoredOnboardingState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return INITIAL_ONBOARDING_STATE;
  }

  const candidate = value as Record<string, unknown>;
  const legacyWelcomeSeen = candidate.hasSeenWelcome === true || candidate.isCompleted === true;
  const storedVersion = candidate.completedExperienceVersion;
  const completedExperienceVersion =
    typeof storedVersion === 'number' && Number.isFinite(storedVersion) && storedVersion >= 0
      ? Math.floor(storedVersion)
      : legacyWelcomeSeen
        ? 1
        : 0;

  return {
    hasSeenWelcome: legacyWelcomeSeen || completedExperienceVersion >= 1,
    completedExperienceVersion,
    ...(typeof candidate.isCompleted === 'boolean' ? { isCompleted: candidate.isCompleted } : {}),
    ...(typeof candidate.currentStep === 'number' ? { currentStep: candidate.currentStep } : {}),
  };
}

export function shouldShowCurrentOnboarding(state: StoredOnboardingState): boolean {
  return state.completedExperienceVersion < CURRENT_ONBOARDING_VERSION;
}
