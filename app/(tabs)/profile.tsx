import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFitRankX } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import { THEMES } from '../../constants/game';

// TODO: Implement full profile screen — see GitHub issue #profile-screen
// Features needed:
// - Editable biometrics (age, height, weight, gender)
// - Fitness goal + activity level pickers
// - BMI / BMR / TDEE / target calorie display
// - Theme selector (5 themes)
// - Badge showcase
// - Squad code display + share

export default function ProfileScreen() {
  const { profile, badges, reset } = useFitRankX();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    reset();
    router.replace('/(auth)/login');
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

        {/* Theme selector placeholder */}
        <Text style={styles.sectionTitle}>Theme</Text>
        <View style={styles.themesRow}>
          {THEMES.map(t => (
            <TouchableOpacity key={t.theme} style={[styles.themeBtn, { backgroundColor: t.primary }]}>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#06001a' },
  content: { padding: 20, paddingBottom: 40 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 28 },
  avatar: { fontSize: 52 },
  username: { color: '#fff', fontSize: 22, fontWeight: '900' },
  squadCode: { color: '#a855f7', fontSize: 13, marginTop: 2, fontWeight: '600' },
  sectionTitle: { color: '#888', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  badge: { fontSize: 28, backgroundColor: '#110020', padding: 8, borderRadius: 10 },
  themesRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  themeBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  themeEmoji: { fontSize: 20 },
  signOutBtn: {
    borderWidth: 1,
    borderColor: '#2d1a4a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  signOutText: { color: '#888', fontWeight: '700' },
});
