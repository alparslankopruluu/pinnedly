import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenFooterProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ScreenFooter({ children, style }: ScreenFooterProps) {
  return (
    <SafeAreaView
      edges={['bottom']}
      style={[
        styles.footer,
        style,
      ]}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
});
