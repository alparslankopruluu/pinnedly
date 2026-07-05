import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { GoogleGLogo } from '@/components/auth/GoogleGLogo';

type GoogleSignInButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export function GoogleSignInButton({ label, onPress, disabled = false }: GoogleSignInButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
    >
      <View style={styles.content}>
        <GoogleGLogo size={20} />
        <Text style={styles.label}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#747775',
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    paddingHorizontal: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#3C4043',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 1,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  buttonPressed: {
    backgroundColor: '#F8F9FA',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: '#1F1F1F',
    fontFamily: Platform.select({ ios: 'System', android: 'Roboto' }),
  },
});