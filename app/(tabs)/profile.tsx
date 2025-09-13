import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  User, 
  Bell, 
  Palette, 
  Download, 
  Upload, 
  Info,
  ChevronRight,
  Crown,
  Sparkles 
} from 'lucide-react-native';
import { useAppStore } from '@/store/useAppStore';
import { PremiumModal } from '@/components/PremiumModal';

export default function ProfileScreen() {
  const { preferences, updatePreferences, bookmarks, projects, notes } = useAppStore();
  const [showPremiumModal, setShowPremiumModal] = useState<boolean>(false);
  const insets = useSafeAreaInsets();
  
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

  const stats = [
    { id: 'bookmarks', label: 'Bookmarks', value: bookmarks.length },
    { id: 'projects', label: 'Projects', value: projects.length },
    { id: 'notes', label: 'Notes', value: notes.length },
    { id: 'opens', label: 'Total Opens', value: bookmarks.reduce((sum, b) => sum + b.openCount, 0) },
  ];

  const settingsItems = [
    {
      id: 'notifications',
      icon: <Bell size={20} color="#6B7280" />,
      title: 'Notifications',
      subtitle: 'Daily reminders and nudges',
      action: (
        <Switch
          value={preferences.notificationsEnabled}
          onValueChange={(value) => updatePreferences({ notificationsEnabled: value })}
          trackColor={{ false: '#F3F4F6', true: '#FEE2E2' }}
          thumbColor={preferences.notificationsEnabled ? '#EF4444' : '#9CA3AF'}
        />
      ),
    },
    {
      id: 'theme',
      icon: <Palette size={20} color="#6B7280" />,
      title: 'Theme',
      subtitle: 'Light mode',
      action: <ChevronRight size={20} color="#9CA3AF" />,
    },
    {
      id: 'export',
      icon: <Download size={20} color="#6B7280" />,
      title: 'Export Data',
      subtitle: 'Download your data as JSON',
      action: <ChevronRight size={20} color="#9CA3AF" />,
    },
    {
      id: 'import',
      icon: <Upload size={20} color="#6B7280" />,
      title: 'Import Data',
      subtitle: 'Restore from backup',
      action: <ChevronRight size={20} color="#9CA3AF" />,
    },
    {
      id: 'about',
      icon: <Info size={20} color="#6B7280" />,
      title: 'About',
      subtitle: 'Version 1.0.0',
      action: <ChevronRight size={20} color="#9CA3AF" />,
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <User size={32} color="#6B7280" />
          </View>
          <Text style={styles.profileName}>Pinnedly User</Text>
          <Text style={styles.profileEmail}>Keep your knowledge organized</Text>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
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
          <Text style={styles.sectionTitle}>Goals</Text>
          <View style={styles.goalCard}>
            <Text style={styles.goalTitle}>Daily Goal</Text>
            <Text style={styles.goalValue}>{preferences.dailyGoal || 3} bookmarks</Text>
          </View>
          <View style={styles.goalCard}>
            <Text style={styles.goalTitle}>Weekly Goal</Text>
            <Text style={styles.goalValue}>{preferences.weeklyGoal || 20} bookmarks</Text>
          </View>
        </View>

        {/* Premium CTA Section */}
        <View style={styles.section}>
          <Animated.View style={[styles.premiumCTA, { transform: [{ scale: pulseAnim }] }]}>
            <TouchableOpacity
              style={styles.premiumButton}
              onPress={() => setShowPremiumModal(true)}
            >
              <View style={styles.premiumContent}>
                <View style={styles.premiumLeft}>
                  <View style={styles.premiumIconContainer}>
                    <Crown size={24} color="#FFFFFF" />
                    <Sparkles size={16} color="#FFFFFF" style={styles.sparkleIcon} />
                  </View>
                  <View style={styles.premiumText}>
                    <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
                    <Text style={styles.premiumSubtitle}>Unlock powerful collaboration features</Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          {settingsItems.map((item) => (
            <TouchableOpacity key={item.id} style={styles.settingItem}>
              <View style={styles.settingIcon}>{item.icon}</View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{item.title}</Text>
                <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
              </View>
              {item.action}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      
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
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
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
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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
  settingItem: {
    flexDirection: 'row',
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
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
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
});