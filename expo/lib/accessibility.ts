import { AccessibilityInfo, Text, TextInput } from 'react-native';

export const MAX_FONT_SIZE_MULTIPLIER = 2;
export const MIN_TOUCH_TARGET = 44;

let defaultsConfigured = false;

/**
 * Keep Dynamic Type enabled across the app, including older screens that use
 * React Native's primitive Text and TextInput components directly.
 */
export function configureAccessibilityDefaults(): void {
  if (defaultsConfigured) return;
  defaultsConfigured = true;

  const scalableDefaults = {
    allowFontScaling: true,
    maxFontSizeMultiplier: MAX_FONT_SIZE_MULTIPLIER,
  };

  const TextComponent = Text as typeof Text & { defaultProps?: Record<string, unknown> };
  const TextInputComponent = TextInput as typeof TextInput & {
    defaultProps?: Record<string, unknown>;
  };

  TextComponent.defaultProps = {
    ...TextComponent.defaultProps,
    ...scalableDefaults,
  };
  TextInputComponent.defaultProps = {
    ...TextInputComponent.defaultProps,
    ...scalableDefaults,
  };
}
export function announceForAccessibility(message: string): void {
  if (!message.trim()) return;
  AccessibilityInfo.announceForAccessibility(message);
}
