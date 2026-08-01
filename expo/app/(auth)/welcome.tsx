import React, { useEffect, useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { useAppAppearance, type AppColors } from '@/hooks/useAppAppearance';
import { useAuth } from '@/store/useAuthStore';

const OWL_MASCOT = require('@/assets/brand/owl-mascot-transparent.png');

export default function Welcome() {
  const { t } = useTranslation();
  const { colors, font } = useAppAppearance();
  const styles = useMemo(() => createStyles(colors, font), [colors, font]);
  const { isAuthenticated, isGuest, isLoading, continueAsGuest } = useAuth();

  useEffect(() => {
    if (!isLoading && (isAuthenticated || isGuest)) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isGuest, isLoading]);

  const handleContinueAsGuest = async () => {
    try {
      await continueAsGuest();
      router.replace('/(tabs)');
    } catch {
      // Auth store keeps the action retryable.
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('welcome.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View pointerEvents="none" style={styles.haloLarge} />
      <View pointerEvents="none" style={styles.haloSmall} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.mascotStage} accessible={false} importantForAccessibility="no-hide-descendants">
            <Image source={OWL_MASCOT} style={styles.mascot} resizeMode="contain" />
          </View>
          <Text style={styles.title} maxFontSizeMultiplier={1.5}>{t('common.appName')}</Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.75}>{t('welcome.subtitle')}</Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title={t('auth.signIn')}
            onPress={() => router.push('/(auth)/sign-in')}
            style={styles.primaryButton}
          />
          <Button
            title={t('auth.createAccount')}
            onPress={() => router.push('/(auth)/sign-up')}
            variant="outline"
            style={styles.secondaryButton}
          />
          <Button
            title={t('auth.continueAsGuest')}
            onPress={() => void handleContinueAsGuest()}
            variant="outline"
            style={styles.guestButton}
          />
        </View>

        <Text style={styles.footerText} maxFontSizeMultiplier={1.75}>{t('auth.termsFooter')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppColors, font: (size: number) => number) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: font(16),
    color: colors.textSecondary,
  },
  haloLarge: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: colors.primarySoft,
    opacity: 0.72,
    top: -180,
    alignSelf: 'center',
  },
  haloSmall: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: '#F59E0B18',
    right: -90,
    bottom: 90,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 38,
  },
  mascotStage: {
    width: 154,
    height: 154,
    borderRadius: 46,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  mascot: {
    width: '90%',
    height: '90%',
  },
  title: {
    fontSize: font(32),
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    letterSpacing: -0.7,
  },
  subtitle: {
    fontSize: font(16),
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    maxWidth: 520,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    gap: 14,
    marginBottom: 28,
  },
  primaryButton: {
    borderRadius: 16,
    minHeight: 54,
  },
  secondaryButton: {
    borderRadius: 16,
    minHeight: 54,
  },
  guestButton: {
    borderRadius: 16,
    minHeight: 54,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: font(12),
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
