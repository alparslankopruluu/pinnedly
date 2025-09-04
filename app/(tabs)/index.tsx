import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, CheckCircle, Clock, TrendingUp } from 'lucide-react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import { QuickAddFAB } from '@/components/QuickAddFAB';
import { formatRelativeTime, isOverdue, isDueToday } from '@/utils/date';

function HomeContent() {
  const {
    bookmarks,
    projects,
    activities,
    loadData,
    isLoading,
  } = useAppStore();

  useEffect(() => {
    loadData();
  }, []);

  const getContinueItems = () => {
    const neverOpenedBookmarks = bookmarks
      .filter((b) => b.openCount === 0)
      .slice(0, 2);
    
    const recentNotes: any[] = []; // TODO: Add notes when implemented
    
    return [...neverOpenedBookmarks, ...recentNotes];
  };

  const getDueAndOverdueTasks = () => {
    const allTasks = projects.flatMap((project) =>
      project.tasks
        .filter((task) => task.status !== 'done' && task.dueDate)
        .map((task) => ({ ...task, projectTitle: project.title }))
    );

    const overdue = allTasks.filter((task) => task.dueDate && isOverdue(task.dueDate));
    const dueToday = allTasks.filter((task) => task.dueDate && isDueToday(task.dueDate));

    return [...overdue, ...dueToday].slice(0, 3);
  };

  const getStreak = () => {
    // Simple streak calculation based on recent activity
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const hasActivityToday = activities.some((activity) => {
      const activityDate = new Date(activity.timestamp);
      return activityDate.toDateString() === today.toDateString();
    });

    const hasActivityYesterday = activities.some((activity) => {
      const activityDate = new Date(activity.timestamp);
      return activityDate.toDateString() === yesterday.toDateString();
    });

    if (hasActivityToday && hasActivityYesterday) {
      return 3; // Simplified 3-day streak
    }
    return hasActivityToday ? 1 : 0;
  };

  const continueItems = getContinueItems();
  const dueAndOverdueTasks = getDueAndOverdueTasks();
  const streak = getStreak();
  const recentActivities = activities.slice(0, 3);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadData} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Home</Text>
          <TouchableOpacity onPress={() => router.push('/profile')}>
            <Settings size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Continue Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Continue</Text>
          {continueItems.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {continueItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.continueCard}
                  onPress={() => {
                    if ('url' in item) {
                      router.push('/bookmarks');
                    }
                  }}
                >
                  <View style={styles.continueImage}>
                    <Text style={styles.continueImageText}>
                      {item.title?.[0]?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <Text style={styles.continueTitle} numberOfLines={2}>
                    {item.title || 'Untitled'}
                  </Text>
                  <Text style={styles.continueSubtitle}>
                    {'url' in item ? 'Bookmark' : 'Note'} • {formatRelativeTime(item.createdAt)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.emptyText}>No items to continue with</Text>
          )}
        </View>

        {/* Due & Overdue Tasks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Due & Overdue Tasks</Text>
          {dueAndOverdueTasks.length > 0 ? (
            dueAndOverdueTasks.map((task) => (
              <View key={task.id} style={styles.taskRow}>
                <View style={styles.taskIcon}>
                  <Clock size={16} color="#EF4444" />
                </View>
                <View style={styles.taskContent}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskProject}>{task.projectTitle}</Text>
                </View>
                <View style={styles.taskStatus}>
                  <Text
                    style={[
                      styles.taskStatusText,
                      task.dueDate && isOverdue(task.dueDate)
                        ? styles.overdue
                        : styles.dueToday,
                    ]}
                  >
                    {task.dueDate && isOverdue(task.dueDate) ? 'Overdue' : 'Due Today'}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No due tasks</Text>
          )}
        </View>

        {/* Streak Card */}
        {streak > 0 && (
          <View style={styles.section}>
            <View style={styles.streakCard}>
              <View style={styles.streakContent}>
                <Text style={styles.streakBadge}>{streak}-DAY STREAK</Text>
                <Text style={styles.streakTitle}>Keep the momentum going!</Text>
              </View>
              <TrendingUp size={32} color="#EF4444" />
            </View>
          </View>
        )}

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
              <View key={activity.id} style={styles.activityRow}>
                <View style={styles.activityIcon}>
                  <CheckCircle size={16} color="#059669" />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  {activity.subtitle && (
                    <Text style={styles.activitySubtitle}>{activity.subtitle}</Text>
                  )}
                </View>
                <Text style={styles.activityTime}>
                  {formatRelativeTime(activity.timestamp)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No recent activity</Text>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <QuickAddFAB />
    </SafeAreaView>
  );
}

export default function HomeScreen() {
  // Temporarily commented out auth/onboarding checks to open app directly
  // const { isAuthenticated, isLoading: authLoading } = useAuth();
  // const [isCheckingOnboarding, setIsCheckingOnboarding] = useState<boolean>(true);

  // useEffect(() => {
  //   const checkInitialRoute = async () => {
  //     if (authLoading) return;

  //     try {
  //       const onboardingCompleted = await AsyncStorage.getItem('onboardingCompleted');
        
  //       if (!onboardingCompleted) {
  //         // First time user - show onboarding
  //         router.replace('/onboarding');
  //         return;
  //       } else if (!isAuthenticated) {
  //         // User has seen onboarding but not authenticated - go to auth
  //         router.replace('/(auth)/welcome');
  //         return;
  //       }
        
  //       // User is authenticated and has seen onboarding - show home
  //       setIsCheckingOnboarding(false);
  //     } catch (error) {
  //       console.error('Failed to check onboarding status:', error);
  //       // Fallback to onboarding on error
  //       router.replace('/onboarding');
  //     }
  //   };

  //   checkInitialRoute();
  // }, [isAuthenticated, authLoading]);

  // if (authLoading || isCheckingOnboarding) {
  //   return (
  //     <SafeAreaView style={styles.container}>
  //       <View style={styles.loadingContainer}>
  //         <Text style={styles.loadingText}>Loading...</Text>
  //       </View>
  //     </SafeAreaView>
  //   );
  // }

  return <HomeContent />;
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  continueCard: {
    width: 160,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginLeft: 20,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  continueImage: {
    width: '100%',
    height: 80,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  continueImageText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6B7280',
  },
  continueTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  continueSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  taskIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  taskProject: {
    fontSize: 14,
    color: '#6B7280',
  },
  taskStatus: {
    alignItems: 'flex-end',
  },
  taskStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  overdue: {
    color: '#EF4444',
  },
  dueToday: {
    color: '#D97706',
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
  },
  streakContent: {
    flex: 1,
  },
  streakBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 4,
  },
  streakTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  activityTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  bottomPadding: {
    height: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
});