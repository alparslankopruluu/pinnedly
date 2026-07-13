import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

async function readReducedMotion(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  }
  return AccessibilityInfo.isReduceMotionEnabled();
}
export function useReducedMotion(): boolean {
  const [isReducedMotionEnabled, setReducedMotionEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    void readReducedMotion().then((enabled) => {
      if (active) setReducedMotionEnabled(enabled);
    });

    if (Platform.OS === 'web') {
      const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
      const onChange = (event: MediaQueryListEvent) => setReducedMotionEnabled(event.matches);
      media?.addEventListener?.('change', onChange);
      return () => {
        active = false;
        media?.removeEventListener?.('change', onChange);
      };
    }

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotionEnabled
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return isReducedMotionEnabled;
}
