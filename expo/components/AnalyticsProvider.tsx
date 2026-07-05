import React, { useEffect } from 'react';
import { useSegments } from 'expo-router';
import { logAnalyticsScreenView, resolveAnalyticsScreen } from '@/lib/analytics';
import { logCrashlytics, setCrashlyticsAttributes } from '@/lib/crashlytics';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const segments = useSegments();

  useEffect(() => {
    const screenName = resolveAnalyticsScreen(segments);
    logAnalyticsScreenView(segments);
    setCrashlyticsAttributes({ current_screen: screenName });
    logCrashlytics(`Screen: ${screenName}`);
  }, [segments]);

  return <>{children}</>;
}