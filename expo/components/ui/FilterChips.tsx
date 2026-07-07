import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface FilterChip {
  id: string;
  label: string;
  count?: number;
}

interface FilterChipsProps {
  chips: FilterChip[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function FilterChips({ chips, selectedId, onSelect }: FilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {chips.map((chip) => (
        <TouchableOpacity
          key={chip.id}
          style={[
            styles.chip,
            selectedId === chip.id && styles.selectedChip,
          ]}
          onPress={() => onSelect(chip.id)}
        >
          <Text
            style={[
              styles.chipText,
              selectedId === chip.id && styles.selectedChipText,
            ]}
          >
            {chip.label}
            {chip.count !== undefined && ` (${chip.count})`}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  chip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  selectedChip: {
    backgroundColor: '#EF4444',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  selectedChipText: {
    color: 'white',
  },
});
