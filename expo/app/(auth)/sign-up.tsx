import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { showAppAlert } from '@/providers/DialogProvider';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useAuth } from '@/store/useAuthStore';
import { trackButtonPress } from '@/lib/analytics';
import { Button } from '@/components/ui/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Eye, EyeOff } from '@/components/icons/lucide';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';

export default function SignUp() {
  const { t } = useTranslation();
  const { signUp, signInWithApple, signInWithGoogle, isLoading } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim() || !displayName.trim() || !confirmPassword.trim()) {
      showAppAlert(t('common.error'), t('auth.errors.fillAllFields'), undefined, { variant: 'error' });
      return;
    }

    if (password !== confirmPassword) {
      showAppAlert(t('common.error'), t('auth.errors.passwordsDoNotMatch'), undefined, { variant: 'error' });
      return;
    }

    if (password.length < 6) {
      showAppAlert(t('common.error'), t('auth.errors.passwordTooShort'), undefined, { variant: 'error' });
      return;
    }

    try {
      await trackButtonPress('sign_up', 'email_sign_up');
      await signUp(email.trim(), password, displayName.trim());
    } catch (error) {
      showAppAlert(t('auth.errors.signUpFailed'), error instanceof Error ? error.message : t('auth.errors.pleaseTryAgain'));
    }
  };

  const handleAppleSignUp = async () => {
    try {
      await trackButtonPress('sign_up', 'apple_sign_up');
      await signInWithApple();
    } catch (error) {
      showAppAlert(t('auth.errors.appleSignUpFailed'), error instanceof Error ? error.message : t('auth.errors.pleaseTryAgain'));
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      await trackButtonPress('sign_up', 'google_sign_up');
      await signInWithGoogle();
    } catch (error) {
      showAppAlert(t('auth.errors.googleSignUpFailed'), error instanceof Error ? error.message : t('auth.errors.pleaseTryAgain'));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('auth.createAccount')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('auth.fullName')}</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={t('auth.placeholders.fullName')}
              autoCapitalize="words"
              autoCorrect={false}
              accessibilityLabel={t('auth.fullName')}
            />
          </View>

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
              accessibilityLabel={t('auth.email')}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('auth.password')}</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder={t('auth.placeholders.createPassword')}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel={t('auth.password')}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                accessibilityRole="button"
                accessibilityLabel={t(showPassword ? 'accessibility.hidePassword' : 'accessibility.showPassword')}
                accessibilityState={{ expanded: showPassword }}
              >
                {showPassword ? (
                  <EyeOff size={20} color="#64748b" />
                ) : (
                  <Eye size={20} color="#64748b" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('auth.confirmPassword')}</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t('auth.placeholders.confirmPassword')}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel={t('auth.confirmPassword')}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}
                accessibilityRole="button"
                accessibilityLabel={t(showConfirmPassword ? 'accessibility.hidePassword' : 'accessibility.showPassword')}
                accessibilityState={{ expanded: showConfirmPassword }}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} color="#64748b" />
                ) : (
                  <Eye size={20} color="#64748b" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <Button
            title={isLoading ? t('common.creatingAccount') : t('auth.createAccount')}
            onPress={handleSignUp}
            disabled={isLoading}
            style={styles.signUpButton}
          />
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('auth.orContinueWith')}</Text>
          <View style={styles.dividerLine} />
        </View>

        <SocialAuthButtons
          mode="signUp"
          disabled={isLoading}
          onApplePress={handleAppleSignUp}
          onGooglePress={handleGoogleSignUp}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('auth.alreadyHaveAccount')}{' '}
            <Text
              style={styles.footerLink}
              onPress={() => router.push('./sign-in')}
            >
              {t('auth.signIn')}
            </Text>
          </Text>
        </View>
      </ScrollView>
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
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1e293b',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
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
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpButton: {
    backgroundColor: '#4f46e5',
    marginTop: 8,
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
});
