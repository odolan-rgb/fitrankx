import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useTheme, ThemeColors } from '../../lib/theme';

export default function SignupScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const handleSignup = async () => {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) setError(error.message);
    else router.replace('/(auth)/onboarding');
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>FitRankX</Text>
      <Text style={styles.tagline}>Create your account.</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#666"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
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

      <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Creating account...' : 'Sign Up'}</Text>
      </TouchableOpacity>

      <Link href="/(auth)/login" style={styles.link}>
        Already have an account? Log in
      </Link>
    </View>
  );
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    logo: {
      fontSize: 42,
      fontWeight: '900',
      color: theme.primary,
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
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 16,
      color: theme.text,
      fontSize: 16,
      marginBottom: 12,
    },
    button: {
      width: '100%',
      backgroundColor: theme.primary,
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
      color: theme.primary,
      marginTop: 20,
      fontSize: 14,
    },
    error: {
      color: '#f87171',
      marginBottom: 12,
      fontSize: 14,
    },
  });
}
