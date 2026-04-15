import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unconfirmedEmail, setUnconfirmedEmail] = useState(false);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    setUnconfirmedEmail(false);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        setUnconfirmedEmail(true);
        setError('Please verify your email before logging in.');
      } else {
        setError(error.message);
      }
    } else {
      router.replace('/(tabs)/');
    }
    setLoading(false);
  };

  const handleResendVerification = async () => {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) {
      setError(error.message);
    } else {
      setError('Verification email resent! Check your inbox.');
      setUnconfirmedEmail(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      setResetError('Please enter your email address.');
      return;
    }
    setResetLoading(true);
    setResetError('');
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim());
    if (error) {
      setResetError(error.message);
    } else {
      setResetSent(true);
    }
    setResetLoading(false);
  };

  if (showForgotPassword) {
    return (
      <View style={styles.container}>
        <Text style={styles.logo}>FitRankX</Text>
        <Text style={styles.tagline}>Reset your password.</Text>

        {resetSent ? (
          <>
            <Text style={styles.success}>
              Check your email for a password reset link.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                setShowForgotPassword(false);
                setResetSent(false);
                setResetEmail('');
              }}
            >
              <Text style={styles.buttonText}>Back to Login</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {resetError ? <Text style={styles.error}>{resetError}</Text> : null}
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#666"
              value={resetEmail}
              onChangeText={setResetEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity
              style={styles.button}
              onPress={handleForgotPassword}
              disabled={resetLoading}
            >
              <Text style={styles.buttonText}>
                {resetLoading ? 'Sending...' : 'Send Reset Link'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowForgotPassword(false)}>
              <Text style={styles.link}>Back to Login</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>FitRankX</Text>
      <Text style={styles.tagline}>Level up your fitness.</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {unconfirmedEmail && (
        <TouchableOpacity onPress={handleResendVerification} style={styles.resendContainer}>
          <Text style={styles.resendLink}>Resend verification email</Text>
        </TouchableOpacity>
      )}

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#666"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#666"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        onPress={() => { setShowForgotPassword(true); setResetEmail(email); }}
        style={styles.forgotContainer}
      >
        <Text style={styles.forgotLink}>Forgot password?</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Log In'}</Text>
      </TouchableOpacity>

      <Link href="/(auth)/signup" style={styles.link}>
        Don't have an account? Sign up
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06001a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    fontSize: 42,
    fontWeight: '900',
    color: '#a855f7',
    marginBottom: 8,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 16,
    color: '#888',
    marginBottom: 40,
  },
  input: {
    width: '100%',
    backgroundColor: '#110020',
    borderWidth: 1,
    borderColor: '#2d1a4a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  forgotContainer: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotLink: {
    color: '#a855f7',
    fontSize: 13,
  },
  button: {
    width: '100%',
    backgroundColor: '#a855f7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  link: {
    color: '#a855f7',
    marginTop: 20,
    fontSize: 14,
  },
  error: {
    color: '#f87171',
    marginBottom: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  success: {
    color: '#34d399',
    marginBottom: 24,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  resendContainer: {
    marginBottom: 12,
  },
  resendLink: {
    color: '#60a5fa',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
