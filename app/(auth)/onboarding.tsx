import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTheme, ThemeColors } from '../../lib/theme';

// TODO: Implement full onboarding flow
// Issue: #onboarding — multi-step wizard collecting age, gender, height, weight, goal, activity level

export default function OnboardingScreen() {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to FitRankX</Text>
      <Text style={styles.subtitle}>Let's set up your profile</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.replace('/(tabs)/')}>
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
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
    title: {
      fontSize: 28,
      fontWeight: '900',
      color: theme.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: '#888',
      marginBottom: 40,
    },
    button: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 48,
      alignItems: 'center',
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
