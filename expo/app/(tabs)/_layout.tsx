import { Tabs, router } from 'expo-router';
import { Home, Bookmark, FolderOpen, FileText, User, Settings, Plus, ListTodo } from '@/components/icons/lucide';
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTabBarBottomInset, getTabBarHeight } from '@/utils/layout';

export default function TabLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBarBottomInset = getTabBarBottomInset(insets.bottom);
  const tabBarHeight = getTabBarHeight(insets.bottom);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#EF4444',
        tabBarInactiveTintColor: '#9CA3AF',
        headerShown: true,
        headerStyle: {
          backgroundColor: '#F9FAFB',
          borderBottomWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          fontSize: 28,
          fontWeight: '700',
          color: '#111827',
        },
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          paddingBottom: tabBarBottomInset,
          paddingTop: 4,
          height: tabBarHeight,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
          marginBottom: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => router.push('/settings')}
              style={styles.headerButton}
            >
              <Settings size={24} color="#6B7280" />
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: t('tabs.bookmarks'),
          tabBarIcon: ({ color, size }) => <Bookmark size={size} color={color} />,
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => router.push('/add-bookmark')}
              style={styles.headerButton}
            >
              <Plus size={24} color="#EF4444" />
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: t('tabs.projects'),
          tabBarIcon: ({ color, size }) => <FolderOpen size={size} color={color} />,
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => router.push('/add-project')}
              style={styles.headerButton}
            >
              <Plus size={24} color="#EF4444" />
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: t('tabs.notes'),
          tabBarIcon: ({ color, size }) => <FileText size={size} color={color} />,
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => router.push('/add-note')}
              style={styles.headerButton}
            >
              <Plus size={24} color="#EF4444" />
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="todos"
        options={{
          title: t('tabs.todos'),
          tabBarIcon: ({ color, size }) => <ListTodo size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => router.push('/settings')}
              style={styles.headerButton}
            >
              <Settings size={24} color="#6B7280" />
            </TouchableOpacity>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    marginRight: 16,
  },
});