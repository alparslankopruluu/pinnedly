import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '@/store/useSettingsStore';

export type AppColors = {
  background: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  primary: string;
  primarySoft: string;
  danger: string;
  shadow: string;
};

const lightColors: AppColors = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceMuted: '#F3F4F6',
  text: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  primary: '#EF4444',
  primarySoft: '#FEE2E2',
  danger: '#DC2626',
  shadow: '#000000',
};

const darkColors: AppColors = {
  background: '#0F172A',
  surface: '#1E293B',
  surfaceMuted: '#334155',
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  border: '#334155',
  primary: '#F87171',
  primarySoft: '#3F1D2A',
  danger: '#F87171',
  shadow: '#000000',
};

export function useAppAppearance() {
  const systemScheme = useColorScheme();
  const theme = useSettingsStore((state) => state.theme);
  const fontScale = useSettingsStore((state) => state.fontSize);
  const isDark = theme === 'dark' || (theme === 'system' && systemScheme === 'dark');

  return useMemo(() => ({
    theme,
    isDark,
    colors: isDark ? darkColors : lightColors,
    fontScale,
    font: (size: number) => Math.round(size * fontScale * 10) / 10,
  }), [fontScale, isDark, theme]);
}
