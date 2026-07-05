import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform } from 'react-native';
import { showAppAlert } from '@/providers/DialogProvider';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useAuth } from '@/store/useAuthStore';
import { trackButtonPress } from '@/lib/analytics';
import { Button } from '@/components/ui/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';

export default function SignIn() {
  const { t } = useTranslation();
  const { signIn, signInWithApple, signInWithGoogle, isLoading } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      showAppAlert(t('common.error'), t('auth.errors.fillAllFields'), undefined, { variant: 'error' });
      return;
    }

    try {
      await trackButtonPress('sign_in', 'email_sign_in');
      await signIn(email.trim(), password);
      router.replace('/(tabs)');
    } catch (error) {
      showAppAlert(t('auth.errors.signInFailed'), t('auth.errors.checkCredentials'));
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await trackButtonPress('sign_in', 'apple_sign_in');
      await signInWithApple();
      router.replace('/(tabs)');
    } catch (error) {
      showAppAlert(t('auth.errors.appleSignInFailed'), error instanceof Error ? error.message : t('auth.errors.pleaseTryAgain'));
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await trackButtonPress('sign_in', 'google_sign_in');
      await signInWithGoogle();
      router.replace('/(tabs)');
    } catch (error) {
      showAppAlert(t('auth.errors.googleSignInFailed'), error instanceof Error ? error.message : t('auth.errors.pleaseTryAgain'));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('auth.signIn')}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('auth.email')}</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.placeholders.email')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('auth.password')}</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder={t('auth.placeholders.password')}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity onPress={() => router.push('./forgot-password')}>
            <Text style={styles.forgotPassword}>{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>

          <Button
            title={isLoading ? t('common.signingIn') : t('auth.signIn')}
            onPress={handleSignIn}
            disabled={isLoading}
            style={styles.signInButton}
          />
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('auth.orContinueWith')}</Text>
          <View style={styles.dividerLine} />
        </View>

        <SocialAuthButtons
          mode="signIn"
          disabled={isLoading}
          onApplePress={handleAppleSignIn}
          onGooglePress={handleGoogleSignIn}
        />

        <TouchableOpacity
          style={styles.phoneLink}
          onPress={() => {
            trackButtonPress('sign_in', 'phone_sign_in_link');
            router.push('./phone-sign-in');
          }}
        >
          <Ionicons name="call-outline" size={18} color="#4f46e5" />
          <Text style={styles.phoneLinkText}>{t('auth.signInWithPhone')}</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('auth.dontHaveAccount')}{' '}
            <Text
              style={styles.footerLink}
              onPress={() => router.push('./sign-up')}
            >
              {t('auth.signUp')}
            </Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1e293b',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  eyeButton: {
    paddingHorizontal: 16,
  },
  forgotPassword: {
    fontSize: 14,
    color: '#4f46e5',
    textAlign: 'right',
    marginBottom: 24,
  },
  signInButton: {
    backgroundColor: '#4f46e5',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#6b7280',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  footerLink: {
    color: '#4f46e5',
    fontWeight: '500' as const,
  },
  phoneLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  phoneLinkText: {
    fontSize: 14,
    color: '#4f46e5',
    fontWeight: '500' as const,
  },
});