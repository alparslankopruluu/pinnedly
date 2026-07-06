import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
} from 'react-native';
import {
  ChevronDown,
  LayoutGrid,
  Sparkles,
  UtensilsCrossed,
  Briefcase,
  User,
  Lightbulb,
  Plane,
  Heart,
} from 'lucide-react-native';
import {
  ContentCategoryId,
  CONTENT_CATEGORIES,
  getCategoryDef,
} from '@/constants/contentCategories';

const CATEGORY_ICONS: Record<ContentCategoryId, React.ComponentType<{ size?: number; color?: string }>> = {
  general: LayoutGrid,
  ai: Sparkles,
  food: UtensilsCrossed,
  work: Briefcase,
  personal: User,
  ideas: Lightbulb,
  travel: Plane,
  health: Heart,
};

interface CategoryPickerProps {
  value: ContentCategoryId;
  onChange: (category: ContentCategoryId) => void;
  label?: string;
}

export function CategoryPicker({ value, onChange, label }: CategoryPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => getCategoryDef(value), [value]);
  const SelectedIcon = CATEGORY_ICONS[value];

  return (
    <>
      <View style={styles.wrapper}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <Pressable
          style={({ pressed }) => [
            styles.trigger,
            { borderColor: selected.color + '55', backgroundColor: selected.bgColor },
            pressed && styles.triggerPressed,
          ]}
          onPress={() => setOpen(true)}
          accessibilityRole="button"
        >
          <View style={[styles.iconWrap, { backgroundColor: selected.color + '22' }]}>
            <SelectedIcon size={18} color={selected.color} />
          </View>
          <Text style={[styles.triggerText, { color: selected.color }]}>
            {t(`categories.${value}`)}
          </Text>
          <ChevronDown size={18} color={selected.color} />
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{t('categories.pickCategory')}</Text>
            <View style={styles.grid}>
              {CONTENT_CATEGORIES.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.id];
                const isSelected = cat.id === value;
                return (
                  <Pressable
                    key={cat.id}
                    style={({ pressed }) => [
                      styles.option,
                      { borderColor: isSelected ? cat.color : '#E5E7EB', backgroundColor: isSelected ? cat.bgColor : '#fff' },
                      pressed && styles.optionPressed,
                    ]}
                    onPress={() => {
                      onChange(cat.id);
                      setOpen(false);
                    }}
                  >
                    <View style={[styles.optionIcon, { backgroundColor: cat.color + '20' }]}>
                      <Icon size={20} color={cat.color} />
                    </View>
                    <Text style={[styles.optionLabel, { color: isSelected ? cat.color : '#374151' }]}>
                      {t(`categories.${cat.id}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  triggerPressed: {
    opacity: 0.9,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  option: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  optionPressed: {
    opacity: 0.85,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
});