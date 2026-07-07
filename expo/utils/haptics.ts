import { platformCapabilities } from '@/utils/platform';

declare const require: <T = unknown>(moduleName: string) => T;

function haptics() {
  return require<typeof import('expo-haptics')>('expo-haptics');
}

export function hapticSelection(): void {
  if (!platformCapabilities.supportsHaptics) return;
  void haptics().selectionAsync();
}

export function hapticImpactMedium(): void {
  if (!platformCapabilities.supportsHaptics) return;
  void haptics().impactAsync(haptics().ImpactFeedbackStyle.Medium);
}

export function hapticSuccess(): void {
  if (!platformCapabilities.supportsHaptics) return;
  void haptics().notificationAsync(haptics().NotificationFeedbackType.Success);
}

export function hapticError(): void {
  if (!platformCapabilities.supportsHaptics) return;
  void haptics().notificationAsync(haptics().NotificationFeedbackType.Error);
}
