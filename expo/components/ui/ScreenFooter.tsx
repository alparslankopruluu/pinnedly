import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFooterBottomPadding } from '@/utils/layout';

interface ScreenFooterProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ScreenFooter({ children, style }: ScreenFooterProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.footer,
        { paddingBottom: getFooterBottomPadding(insets.bottom) },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingTop: 20,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
});