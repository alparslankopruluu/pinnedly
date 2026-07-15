import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Pressable, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { 
  ChevronRight,
  Crown,
  Sparkles,
  Pencil,
  Minus,
  Plus,
} from '@/components/icons/lucide';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/store/useAuthStore';
import { PremiumModal } from '@/components/PremiumModal';
import { useReducedMotion } from '@/hooks/useAccessibilityPreferences';
import { AppColors, useAppAppearance } from '@/hooks/useAppAppearance';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { preferences, bookmarks, projects, notes, updatePreferences } = useAppStore();
  const { colors, font } = useAppAppearance();
  const styles = useMemo(() => createStyles(colors, font), [colors, font]);
  const insets = useSafeAreaInsets();
  const [showPremiumModal, setShowPremiumModal] = useState<boolean>(false);
  const reduceMotion = useReducedMotion();
  
  const pulseAnim = useMemo(() => new Animated.Value(1), []);
  
  React.useEffect(() => {
    if (reduceMotion) {
      pulseAnim.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim, reduceMotion]);

  const displayName =
    user?.displayName?.trim() ||
    user?.email?.split('@')[0] ||
    t('profile.defaultName');
  const handleLabel = user?.handle ? `@${user.handle}` : user?.email || t('profile.tagline');
  const avatarInitial = displayName.charAt(0).toUpperCase();
  const dailyGoal = preferences.dailyGoal || 3;
  const weeklyGoal = preferences.weeklyGoal || 20;

  const changeGoal = (kind: 'dailyGoal' | 'weeklyGoal', delta: number) => {
    const current = kind === 'dailyGoal' ? dailyGoal : weeklyGoal;
    const max = kind === 'dailyGoal' ? 50 : 200;
    updatePreferences({ [kind]: Math.min(max, Math.max(1, current + delta)) });
  };

  const stats = [
    { id: 'bookmarks', label: t('profile.stats.bookmarks'), value: bookmarks.length },
    { id: 'projects', label: t('profile.stats.projects'), value: projects.length },
    { id: 'notes', label: t('profile.stats.notes'), value: notes.length },
    { id: 'opens', label: t('profile.stats.totalOpens'), value: bookmarks.reduce((sum, b) => sum + b.openCount, 0) },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.safeArea}>
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{avatarInitial}</Text>
            </View>
          )}
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileEmail}>{handleLabel}</Text>
          {user?.bio ? (
            <Text style={styles.profileBio} numberOfLines={2}>{user.bio}</Text>
          ) : null}
          <Pressable
            style={({ pressed }) => [styles.editButton, pressed && styles.editButtonPressed]}
            onPress={() => router.push('/edit-profile')}
          >
            <Pencil size={14} color="#EF4444" />
            <Text style={styles.editButtonText}>{t('profile.editProfile')}</Text>
          </Pressable>
        </View>
        
        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>{t('profile.yourStats')}</Text>
          <View style={styles.statsGrid}>
            {stats.map((stat) => (
              <View key={stat.id} style={styles.statCard}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>
        
        {/* Goals Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.goals')}</Text>
          <View style={styles.goalCard}>
            <View style={styles.goalTextContent}>
              <Text style={styles.goalTitle}>{t('profile.dailyGoal')}</Text>
              <Text style={styles.goalValue}>{t('profile.bookmarksGoal', { count: dailyGoal })}</Text>
            </View>
            <View style={styles.goalStepper}>
              <Pressable
                style={({ pressed }) => [styles.goalButton, pressed && styles.goalButtonPressed]}
                onPress={() => changeGoal('dailyGoal', -1)}
                accessibilityRole="button"
                accessibilityLabel={t('profile.decreaseGoal', { goal: t('profile.dailyGoal') })}
              >
                <Minus size={18} color={colors.textSecondary} />
              </Pressable>
              <Text style={styles.goalCount}>{dailyGoal}</Text>
              <Pressable
                style={({ pressed }) => [styles.goalButton, pressed && styles.goalButtonPressed]}
                onPress={() => changeGoal('dailyGoal', 1)}
                accessibilityRole="button"
                accessibilityLabel={t('profile.increaseGoal', { goal: t('profile.dailyGoal') })}
              >
                <Plus size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>
          <View style={styles.goalCard}>
            <View style={styles.goalTextContent}>
              <Text style={styles.goalTitle}>{t('profile.weeklyGoal')}</Text>
              <Text style={styles.goalValue}>{t('profile.bookmarksGoal', { count: weeklyGoal })}</Text>
            </View>
            <View style={styles.goalStepper}>
              <Pressable
                style={({ pressed }) => [styles.goalButton, pressed && styles.goalButtonPressed]}
                onPress={() => changeGoal('weeklyGoal', -1)}
                accessibilityRole="button"
                accessibilityLabel={t('profile.decreaseGoal', { goal: t('profile.weeklyGoal') })}
              >
                <Minus size={18} color={colors.textSecondary} />
              </Pressable>
              <Text style={styles.goalCount}>{weeklyGoal}</Text>
              <Pressable
                style={({ pressed }) => [styles.goalButton, pressed && styles.goalButtonPressed]}
                onPress={() => changeGoal('weeklyGoal', 1)}
                accessibilityRole="button"
                accessibilityLabel={t('profile.increaseGoal', { goal: t('profile.weeklyGoal') })}
              >
                <Plus size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>
        </View>
        
        {/* Premium CTA Section */}
        <View style={styles.section}>
          <Animated.View style={[styles.premiumCTA, { transform: [{ scale: pulseAnim }] }]}>
            <Pressable
              style={({ pressed }) => [
                styles.premiumButton,
                pressed && styles.premiumButtonPressed
              ]}
              onPress={() => {
                setShowPremiumModal(true);
              }}
            >
              <View style={styles.premiumContent}>
                <View style={styles.premiumLeft}>
                  <View style={styles.premiumIconContainer}>
                    <Crown size={24} color="#FFFFFF" />
                    <Sparkles size={16} color="#FFFFFF" style={styles.sparkleIcon} />
                  </View>
                  <View style={styles.premiumText}>
                    <Text style={styles.premiumTitle}>{t('profile.upgradePremium')}</Text>
                    <Text style={styles.premiumSubtitle}>{t('profile.upgradeSubtitle')}</Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#FFFFFF" />
              </View>
            </Pressable>
          </Animated.View>
        </View>
      </ScrollView>
      </View>
      
      {/* Premium Modal */}
      <PremiumModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
      />
    </View>
  );
}

const createStyles = (colors: AppColors, font: (size: number) => number) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    paddingTop: 44,
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  avatarInitial: {
    fontSize: font(28),
    fontWeight: '700',
    color: '#B91C1C',
  },
  profileName: {
    fontSize: font(20),
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: font(14),
    color: colors.textSecondary,
  },
  profileBio: {
    fontSize: font(13),
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
    lineHeight: 18,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  editButtonPressed: {
    opacity: 0.85,
  },
  editButtonText: {
    fontSize: font(13),
    fontWeight: '600',
    color: '#EF4444',
  },
  statsSection: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: font(18),
    fontWeight: '600',
    color: colors.text,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    margin: '1%',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: font(24),
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: font(14),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  goalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  goalTitle: {
    fontSize: font(16),
    fontWeight: '500',
    color: colors.text,
  },
  goalValue: {
    fontSize: font(13),
    fontWeight: '600',
    color: '#EF4444',
  },
  goalTextContent: {
    flex: 1,
    marginRight: 12,
  },
  goalStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: 4,
  },
  goalButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  goalButtonPressed: {
    opacity: 0.65,
  },
  goalCount: {
    minWidth: 38,
    textAlign: 'center',
    fontSize: font(16),
    fontWeight: '700',
    color: colors.text,
  },
  premiumCTA: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  premiumButton: {
    backgroundColor: '#6366F1',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  premiumLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  premiumIconContainer: {
    position: 'relative',
    marginRight: 16,
  },
  sparkleIcon: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  premiumText: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: font(18),
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  premiumSubtitle: {
    fontSize: font(14),
    color: 'rgba(255, 255, 255, 0.8)',
  },
  premiumButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
