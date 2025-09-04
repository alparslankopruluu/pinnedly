import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, Text, Pressable } from 'react-native';
import { Plus, Bookmark, FolderPlus, FileText } from 'lucide-react-native';
import { router } from 'expo-router';

export function QuickAddFAB() {
  const [isVisible, setIsVisible] = useState(false);

  const options = [
    {
      icon: <Bookmark size={24} color="white" />,
      label: 'Add Bookmark',
      onPress: () => {
        setIsVisible(false);
        router.push('/add-bookmark');
      },
    },
    {
      icon: <FolderPlus size={24} color="white" />,
      label: 'Add Project',
      onPress: () => {
        setIsVisible(false);
        router.push('/add-project');
      },
    },
    {
      icon: <FileText size={24} color="white" />,
      label: 'Add Note',
      onPress: () => {
        setIsVisible(false);
        router.push('/add-note');
      },
    },
  ];

  return (
    <>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsVisible(true)}
        activeOpacity={0.8}
      >
        <Plus size={24} color="white" />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setIsVisible(false)}>
          <View style={styles.menu}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={option.onPress}
              >
                <View style={styles.menuIcon}>{option.icon}</View>
                <Text style={styles.menuLabel}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 8,
    margin: 20,
    minWidth: 200,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
});