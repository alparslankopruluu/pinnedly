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
} from '@/components/icons/lucide';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/store/useAuthStore';
import { PremiumModal } from '@/components/PremiumModal';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { preferences, bookmarks, projects, notes } = useAppStore();
  const insets = useSafeAreaInsets();
  const [showPremiumModal, setShowPremiumModal] = useState<boolean>(false);
  
  const pulseAnim = useMemo(() => new Animated.Value(1), []);
  
  React.useEffect(() => {
    const pulse = () => {
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
      ]).start(() => pulse());
    };
    pulse();
  }, [pulseAnim]);

  const displayName =
    user?.displayName?.trim() ||
    user?.email?.split('@')[0] ||
    t('profile.defaultName');
  const handleLabel = user?.handle ? `@${user.handle}` : user?.email || t('profile.tagline');
  const avatarInitial = displayName.charAt(0).toUpperCase();

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
            <Text style={styles.goalTitle}>{t('profile.dailyGoal')}</Text>
            <Text style={styles.goalValue}>{t('profile.bookmarksGoal', { count: preferences.dailyGoal || 3 })}</Text>
          </View>
          <View style={styles.goalCard}>
            <Text style={styles.goalTitle}>{t('profile.weeklyGoal')}</Text>
            <Text style={styles.goalValue}>{t('profile.bookmarksGoal', { count: preferences.weeklyGoal || 20 })}</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    shadowColor: '#000',
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
    fontSize: 28,
    fontWeight: '700',
    color: '#B91C1C',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  profileBio: {
    fontSize: 13,
    color: '#9CA3AF',
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
    fontSize: 13,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
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
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: '1%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  goalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  goalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
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
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  premiumSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  premiumButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});