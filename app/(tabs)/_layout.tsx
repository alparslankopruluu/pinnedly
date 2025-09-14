import { Tabs, router } from 'expo-router';
import { Home, Bookmark, FolderOpen, FileText, User, Settings, Plus } from 'lucide-react-native';
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';

export default function TabLayout() {
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
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
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
          title: 'Bookmarks',
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
          title: 'Projects',
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
          title: 'Notes',
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
        name="profile"
        options={{
          title: 'Profile',
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