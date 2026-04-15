import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFitRankX } from '../../lib/store';
import { useTheme } from '../../lib/theme';
import { ACTIVITIES, getRankForPts, getRankProgress, getStreakMultiplier } from '../../constants/game';

// TODO: Implement full home screen — see GitHub issue #home-screen
// Features needed:
// - Activity logging buttons with point values
// - Daily challenge card
// - Streak display with multiplier
// - Weekly challenge progress
// - Points animation on log

export default function HomeScreen() {
  const { profile, todayActivities, logActivity } = useFitRankX();
  const { theme } = useTheme();
  const rank = profile ? getRankForPts(profile.pts) : null;
  const rankProgress = profile ? getRankProgress(profile.pts) : 0;
  const multiplier = profile ? getStreakMultiplier(profile.streak) : 1;

  // Warn if it's 7pm+ and the user hasn't logged anything today
  const streakAtRisk =
    profile !== null &&
    todayActivities.length === 0 &&
    new Date().getHours() >= 19;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hey, {profile?.username ?? '...'}</Text>
            <Text style={styles.pts}>{profile?.pts ?? 0} pts</Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakFire}>🔥</Text>
            <Text style={styles.streakCount}>{profile?.streak ?? 0}</Text>
          </View>
        </View>

        {/* Rank card */}
        {rank && (
          <View style={styles.rankCard}>
            <Text style={styles.rankEmoji}>{rank.emoji}</Text>
            <Text style={styles.rankLabel}>{rank.label}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${rankProgress}%` as any }]} />
            </View>
            <Text style={styles.rankSub}>{rankProgress}% to next rank</Text>
          </View>
        )}

        {/* Streak at risk warning */}
        {streakAtRisk && (
          <View style={[styles.streakWarning, { borderColor: theme.secondary, backgroundColor: theme.card }]}>
            <Text style={[styles.streakWarningText, { color: theme.secondary }]}>
              ⚠️ Streak at risk! Log an activity before midnight to keep your streak.
            </Text>
          </View>
        )}

        {/* Multiplier badge */}
        {multiplier > 1 && (
          <View style={styles.multiplierBadge}>
            <Text style={styles.multiplierText}>⚡ {multiplier}x streak multiplier active</Text>
          </View>
        )}

        {/* Activity buttons */}
        <Text style={styles.sectionTitle}>Log Activity</Text>
        <View style={styles.activityGrid}>
          {ACTIVITIES.map(act => (
            <TouchableOpacity
              key={act.type}
              style={styles.activityBtn}
              onPress={() => logActivity(act.type)}
            >
              <Text style={styles.activityIcon}>{act.icon}</Text>
              <Text style={styles.activityLabel}>{act.label}</Text>
              <Text style={styles.activityPts}>+{act.pts}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Today's logged */}
        {todayActivities.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Today</Text>
            {todayActivities.map(a => (
              <View key={a.id} style={styles.logRow}>
                <Text style={styles.logIcon}>{ACTIVITIES.find(x => x.type === a.type)?.icon}</Text>
                <Text style={styles.logLabel}>{a.type}</Text>
                <Text style={styles.logPts}>+{a.pts_earned}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#06001a' },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { color: '#ccc', fontSize: 14 },
  pts: { color: '#fff', fontSize: 28, fontWeight: '900' },
  streakBadge: { alignItems: 'center', backgroundColor: '#1a0030', borderRadius: 12, padding: 12 },
  streakFire: { fontSize: 20 },
  streakCount: { color: '#f97316', fontWeight: '800', fontSize: 18 },
  rankCard: {
    backgroundColor: '#110020',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d1a4a',
  },
  rankEmoji: { fontSize: 32, marginBottom: 4 },
  rankLabel: { color: '#a855f7', fontSize: 22, fontWeight: '900', marginBottom: 12 },
  progressBar: { width: '100%', height: 8, backgroundColor: '#2d1a4a', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#a855f7', borderRadius: 4 },
  rankSub: { color: '#666', fontSize: 12, marginTop: 8 },
  streakWarning: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  streakWarningText: { fontWeight: '700', textAlign: 'center', fontSize: 13 },
  multiplierBadge: {
    backgroundColor: '#1a1000',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f97316',
  },
  multiplierText: { color: '#f97316', fontWeight: '700', textAlign: 'center' },
  sectionTitle: { color: '#888', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12, marginTop: 8 },
  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  activityBtn: {
    backgroundColor: '#110020',
    borderRadius: 12,
    padding: 14,
    width: '30%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d1a4a',
  },
  activityIcon: { fontSize: 24, marginBottom: 4 },
  activityLabel: { color: '#ccc', fontSize: 12, marginBottom: 2 },
  activityPts: { color: '#a855f7', fontWeight: '700', fontSize: 12 },
  logRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a0030' },
  logIcon: { fontSize: 18, marginRight: 10 },
  logLabel: { color: '#ccc', flex: 1, textTransform: 'capitalize' },
  logPts: { color: '#a855f7', fontWeight: '700' },
});
