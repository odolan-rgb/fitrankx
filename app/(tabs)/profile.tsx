import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFitRankX } from '../../lib/store';
import { useTheme, ThemeColors, THEME_COLORS } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import { THEMES } from '../../constants/game';
import { Theme } from '../../types';

// TODO: Implement full profile screen — see GitHub issue #profile-screen
// Features needed:
// - Editable biometrics (age, height, weight, gender)
// - Fitness goal + activity level pickers
// - BMI / BMR / TDEE / target calorie display
// - Badge showcase
// - Squad code display + share

export default function ProfileScreen() {
  const { profile, badges, reset } = useFitRankX();
  const { theme, themeName, setTheme } = useTheme();
  const styles = makeStyles(theme);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    reset();
    router.replace('/(auth)/login');
  };

  const handleSetTheme = (t: Theme) => {
    setTheme(t);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarRow}>
          <Text style={styles.avatar}>{profile?.avatar_emoji ?? '🏃'}</Text>
          <View>
            <Text style={styles.username}>{profile?.username ?? '...'}</Text>
            <Text style={styles.squadCode}>Squad Code: {profile?.squad_code ?? '------'}</Text>
          </View>
        </View>

        {/* Badges */}
        {badges.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Badges</Text>
            <View style={styles.badgesRow}>
              {badges.map(b => (
                <Text key={b.id} style={styles.badge}>{b.badge?.emoji}</Text>
              ))}
            </View>
          </>
        )}

        {/* Theme selector */}
        <Text style={styles.sectionTitle}>Theme</Text>
        <View style={styles.themesRow}>
          {THEMES.map(t => (
            <TouchableOpacity
              key={t.theme}
              style={[
                styles.themeBtn,
                { backgroundColor: THEME_COLORS[t.theme].primary },
                themeName === t.theme && styles.themeBtnActive,
              ]}
              onPress={() => handleSetTheme(t.theme)}
            >
              <Text style={styles.themeEmoji}>{t.emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    content: { padding: 20, paddingBottom: 40 },
    avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 28 },
    avatar: { fontSize: 52 },
    username: { color: theme.text, fontSize: 22, fontWeight: '900' },
    squadCode: { color: theme.primary, fontSize: 13, marginTop: 2, fontWeight: '600' },
    sectionTitle: { color: '#888', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12 },
    badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
    badge: { fontSize: 28, backgroundColor: theme.card, padding: 8, borderRadius: 10 },
    themesRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
    themeBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    themeBtnActive: { borderWidth: 3, borderColor: '#ffffff' },
    themeEmoji: { fontSize: 20 },
    signOutBtn: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    signOutText: { color: '#888', fontWeight: '700' },
  });
}
