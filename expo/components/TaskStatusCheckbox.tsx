import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Check, Minus } from '@/components/icons/lucide';
import { Task } from '@/types';

interface TaskStatusCheckboxProps {
  status: Task['status'];
  onPress: () => void;
  size?: number;
  style?: ViewStyle;
}

export function TaskStatusCheckbox({
  status,
  onPress,
  size = 18,
  style,
}: TaskStatusCheckboxProps) {
  const iconSize = Math.max(10, size - 6);

  return (
    <TouchableOpacity
      style={[
        styles.checkbox,
        { width: size, height: size, borderRadius: size * 0.22 },
        status === 'in-progress' && styles.checkboxInProgress,
        status === 'done' && styles.checkboxDone,
        style,
      ]}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {status === 'in-progress' && <Minus size={iconSize} color="#FFFFFF" strokeWidth={3} />}
      {status === 'done' && <Check size={iconSize} color="#FFFFFF" strokeWidth={3} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  checkbox: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxInProgress: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  checkboxDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
});