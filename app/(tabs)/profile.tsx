import { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFitRankX } from '../../lib/store';
import { useTheme, ThemeColors, THEME_COLORS } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import { THEMES, BADGE_DEFS } from '../../constants/game';
import { Theme } from '../../types';

// TODO: Implement full profile screen — see GitHub issue #profile-screen
// Features needed:
// - Editable biometrics (age, height, weight, gender)
// - Fitness goal + activity level pickers
// - BMI / BMR / TDEE / target calorie display
// - Squad code display + share

export default function ProfileScreen() {
  const { profile, badges, loadBadges, reset } = useFitRankX();
  const { theme, themeName, setTheme } = useTheme();
  const styles = makeStyles(theme);

  useEffect(() => {
    loadBadges();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    reset();
    router.replace('/(auth)/login');
  };

  const handleSetTheme = (t: Theme) => {
    setTheme(t);
  };

  const earnedByKey = Object.fromEntries(badges.map((b) => [b.badge_key, b]));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar + identity */}
        <View style={styles.avatarRow}>
          <Text style={styles.avatar}>{profile?.avatar_emoji ?? '🏃'}</Text>
          <View>
            <Text style={styles.username}>{profile?.username ?? '...'}</Text>
            <Text style={styles.squadCode}>Squad: {profile?.squad_code ?? '------'}</Text>
          </View>
        </View>

        {/* Badge showcase */}
        <Text style={styles.sectionTitle}>Badges ({badges.length}/{BADGE_DEFS.length})</Text>
        <View style={styles.badgeGrid}>
          {BADGE_DEFS.map((def) => {
            const userBadge = earnedByKey[def.key];
            const earned = !!userBadge;
            const earnedDate = earned
              ? new Date(userBadge.earned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : null;

            return (
              <View key={def.key} style={[styles.badgeCard, earned ? styles.badgeCardEarned : styles.badgeCardLocked]}>
                <Text style={[styles.badgeEmoji, !earned && styles.badgeEmojiLocked]}>{def.emoji}</Text>
                <Text style={[styles.badgeName, !earned && styles.badgeNameLocked]} numberOfLines={1}>{def.name}</Text>
                <Text style={[styles.badgeDesc, !earned && styles.badgeDescLocked]} numberOfLines={2}>{def.description}</Text>
                {earned && earnedDate
                  ? <Text style={styles.badgeDate}>{earnedDate}</Text>
                  : <Text style={styles.badgeLock}>🔒</Text>
                }
              </View>
            );
          })}
        </View>

        {/* Theme selector */}
        <Text style={styles.sectionTitle}>Theme</Text>
        <View style={styles.themesRow}>
          {THEMES.map((t) => (
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
    content: { padding: 20, paddingBottom: 48 },
    avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 28 },
    avatar: { fontSize: 52 },
    username: { color: theme.text, fontSize: 22, fontWeight: '900' },
    squadCode: { color: theme.primary, fontSize: 13, marginTop: 2, fontWeight: '600' },
    sectionTitle: { color: '#888', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 14, letterSpacing: 1 },
    badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
    badgeCard: { width: '30%', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, minHeight: 120 },
    badgeCardEarned: { backgroundColor: theme.card, borderColor: theme.primary },
    badgeCardLocked: { backgroundColor: theme.bg, borderColor: theme.border },
    badgeEmoji: { fontSize: 28, marginBottom: 6 },
    badgeEmojiLocked: { opacity: 0.25 },
    badgeName: { color: theme.text, fontSize: 11, fontWeight: '800', textAlign: 'center', marginBottom: 3 },
    badgeNameLocked: { color: '#444' },
    badgeDesc: { color: '#aaa', fontSize: 9, textAlign: 'center', lineHeight: 13 },
    badgeDescLocked: { color: '#333' },
    badgeDate: { color: theme.primary, fontSize: 9, fontWeight: '700', marginTop: 4 },
    badgeLock: { fontSize: 10, marginTop: 4, opacity: 0.4 },
    themesRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
    themeBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    themeBtnActive: { borderWidth: 3, borderColor: '#fff' },
    themeEmoji: { fontSize: 20 },
    signOutBtn: { borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 16, alignItems: 'center' },
    signOutText: { color: '#888', fontWeight: '700' },
  });
}
