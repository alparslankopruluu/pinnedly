import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CURRENT_ONBOARDING_VERSION,
  normalizeStoredOnboardingState,
  shouldShowCurrentOnboarding,
} from '../lib/onboardingState.ts';

test('unseen and malformed onboarding data starts at version zero', () => {
  for (const value of [undefined, null, 'broken', [], { completedExperienceVersion: -1 }]) {
    const state = normalizeStoredOnboardingState(value);
    assert.equal(state.completedExperienceVersion, 0);
    assert.equal(state.hasSeenWelcome, false);
    assert.equal(shouldShowCurrentOnboarding(state), true);
  }
});

test('legacy completed onboarding migrates to version one and sees version two once', () => {
  const state = normalizeStoredOnboardingState({ hasSeenWelcome: true, currentStep: 2 });
  assert.equal(state.completedExperienceVersion, 1);
  assert.equal(state.hasSeenWelcome, true);
  assert.equal(shouldShowCurrentOnboarding(state), true);
});

test('the alternate legacy completion flag also migrates to version one', () => {
  const state = normalizeStoredOnboardingState({ isCompleted: true });
  assert.equal(state.completedExperienceVersion, 1);
  assert.equal(shouldShowCurrentOnboarding(state), true);
});

test('version two and future versions do not show the current onboarding again', () => {
  for (const version of [CURRENT_ONBOARDING_VERSION, CURRENT_ONBOARDING_VERSION + 1]) {
    const state = normalizeStoredOnboardingState({ completedExperienceVersion: version });
    assert.equal(state.hasSeenWelcome, true);
    assert.equal(shouldShowCurrentOnboarding(state), false);
  }
});

test('stored version is normalized to a non-fractional number', () => {
  const state = normalizeStoredOnboardingState({ completedExperienceVersion: 1.9 });
  assert.equal(state.completedExperienceVersion, 1);
  assert.equal(shouldShowCurrentOnboarding(state), true);
});
