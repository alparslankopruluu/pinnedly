import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { platformCapabilities } from '@/utils/platform';

declare const require: <T = unknown>(moduleName: string) => T;

type SocialAuthButtonsProps = {
  mode: 'signIn' | 'signUp';
  onGooglePress: () => void;
  onApplePress: () => void;
  disabled?: boolean;
};

export function SocialAuthButtons({
  mode,
  onGooglePress,
  onApplePress,
  disabled = false,
}: SocialAuthButtonsProps) {
  const { t } = useTranslation();
  const [appleAvailable, setAppleAvailable] = useState(platformCapabilities.supportsAppleSignIn);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const AppleAuthentication = require<typeof import('expo-apple-authentication')>(
      'expo-apple-authentication'
    );
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  const googleLabel = t(mode === 'signIn' ? 'auth.signInWithGoogle' : 'auth.signUpWithGoogle');
  const AppleAuthentication =
    appleAvailable && Platform.OS === 'ios'
      ? require<typeof import('expo-apple-authentication')>('expo-apple-authentication')
      : null;

  return (
    <View style={styles.container}>
      {AppleAuthentication && (
        <View
          style={[styles.appleButtonWrapper, disabled && styles.buttonWrapperDisabled]}
          pointerEvents={disabled ? 'none' : 'auto'}
        >
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              mode === 'signIn'
                ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                : AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
            }
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={4}
            style={styles.appleButton}
            onPress={onApplePress}
          />
        </View>
      )}
      <GoogleSignInButton
        label={googleLabel}
        onPress={onGooglePress}
        disabled={disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 12,
    marginBottom: 32,
  },
  appleButtonWrapper: {
    width: '100%',
  },
  appleButton: {
    width: '100%',
    height: 44,
  },
  buttonWrapperDisabled: {
    opacity: 0.6,
  },
});
