import React, { useEffect } from 'react';
import { useSegments } from 'expo-router';
import { logScreenView } from '@/lib/analytics';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const segments = useSegments();

  useEffect(() => {
    const screenName = segments.filter(Boolean).join('/') || 'home';
    logScreenView(screenName);
  }, [segments]);

  return <>{children}</>;
}