import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { router } from 'expo-router';
import { 
  User, 
  ChevronRight,
  Crown,
  Sparkles
} from 'lucide-react-native';
import { useAppStore } from '@/store/useAppStore';
import { PremiumModal } from '@/components/PremiumModal';

export default function ProfileScreen() {
  const { preferences, bookmarks, projects, notes } = useAppStore();
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

  const stats = [
    { id: 'bookmarks', label: 'Bookmarks', value: bookmarks.length },
    { id: 'projects', label: 'Projects', value: projects.length },
    { id: 'notes', label: 'Notes', value: notes.length },
    { id: 'opens', label: 'Total Opens', value: bookmarks.reduce((sum, b) => sum + b.openCount, 0) },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
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