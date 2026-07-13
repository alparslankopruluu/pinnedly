import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, Text, Pressable } from 'react-native';
import { Plus, Bookmark, FolderPlus, FileText } from '@/components/icons/lucide';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trackButtonPress } from '@/lib/analytics';
import { getFabBottomOffset } from '@/utils/layout';
import { useReducedMotion } from '@/hooks/useAccessibilityPreferences';

export function QuickAddFAB() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [isVisible, setIsVisible] = useState(false);
  const reduceMotion = useReducedMotion();

  const options = useMemo(
    () => [
      {
        icon: <Bookmark size={24} color="white" />,
        label: t('quickAdd.addBookmark'),
        onPress: () => {
          trackButtonPress('home', 'fab_add_bookmark');
          setIsVisible(false);
          router.push('/add-bookmark');
        },
      },
      {
        icon: <FolderPlus size={24} color="white" />,
        label: t('quickAdd.addProject'),
        onPress: () => {
          trackButtonPress('home', 'fab_add_project');
          setIsVisible(false);
          router.push('/add-project');
        },
      },
      {
        icon: <FileText size={24} color="white" />,
        label: t('quickAdd.addNote'),
        onPress: () => {
          trackButtonPress('home', 'fab_add_note');
          setIsVisible(false);
          router.push('/add-note');
        },
      },
    ],
    [t]
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.fab, { bottom: getFabBottomOffset(insets.bottom) }]}
        onPress={() => {
          trackButtonPress('home', 'fab_open');
          setIsVisible(true);
        }}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t('accessibility.quickAdd')}
        accessibilityHint={t('accessibility.quickAddHint')}
        accessibilityState={{ expanded: isVisible }}
      >
        <Plus size={24} color="white" />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType={reduceMotion ? "none" : "fade"}
        onRequestClose={() => setIsVisible(false)}
        accessibilityViewIsModal
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setIsVisible(false)}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        >
          <View style={styles.menu} accessible={false}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={option.onPress}
                accessibilityRole="button"
                accessibilityLabel={option.label}
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
    minHeight: 56,
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
