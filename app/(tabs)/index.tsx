import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFitRankX } from '../../lib/store';
import {
  ACTIVITIES,
  DAILY_CHALLENGE_POOL,
  DAILY_CHALLENGE_PTS,
  COMBO_BONUS_PTS,
  getRankForPts,
  getRankProgress,
  getStreakMultiplier,
} from '../../constants/game';
import { ActivityType } from '../../types';

// Seed today's challenge by date so it stays consistent all day
function getDailyChallenge(): string {
  const d = new Date();
  const seed =
    d.getFullYear() * 1000 +
    Math.floor(
      (d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000
    );
  return DAILY_CHALLENGE_POOL[seed % DAILY_CHALLENGE_POOL.length];
}

export default function HomeScreen() {
  const {
    profile,
    todayActivities,
    todayChallenge,
    logActivity,
    completeDailyChallenge,
    loadProfile,
    loadTodayActivities,
    loadTodayChallenge,
  } = useFitRankX();

  const rank = profile ? getRankForPts(profile.pts) : null;
  const rankProgress = profile ? getRankProgress(profile.pts) : 0;
  const multiplier = profile ? getStreakMultiplier(profile.streak) : 1;
  const todaysChallenge = getDailyChallenge();

  // Point burst animation
  const [burstText, setBurstText] = useState('');
  const [burstVisible, setBurstVisible] = useState(false);
  const burstOpacity = useRef(new Animated.Value(0)).current;
  const burstY = useRef(new Animated.Value(0)).current;

  // Combo burst animation
  const [comboVisible, setComboVisible] = useState(false);
  const comboOpacity = useRef(new Animated.Value(0)).current;
  const comboScale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    loadProfile();
    loadTodayActivities();
    loadTodayChallenge();
  }, []);

  const handleLogActivity = async (type: ActivityType) => {
    const result = await logActivity(type);
    if (!result) return;

    // Animate point burst
    setBurstText(`+${result.ptsEarned}`);
    burstOpacity.setValue(1);
    burstY.setValue(0);
    setBurstVisible(true);

    Animated.parallel([
      Animated.timing(burstOpacity, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
      Animated.timing(burstY, {
        toValue: -90,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start(() => setBurstVisible(false));

    // Combo bonus overlay
    if (result.comboBonus) {
      comboOpacity.setValue(1);
      comboScale.setValue(0.6);
      setComboVisible(true);

      Animated.parallel([
        Animated.spring(comboScale, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(1400),
          Animated.timing(comboOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => setComboVisible(false));
    }
  };

  const handleDailyChallenge = async () => {
    if (todayChallenge) return;
    await completeDailyChallenge(todaysChallenge);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hey, {profile?.username ?? '...'} 👋</Text>
            <Text style={styles.pts}>{profile?.pts?.toLocaleString() ?? 0} pts</Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakFire}>🔥</Text>
            <Text style={styles.streakCount}>{profile?.streak ?? 0}</Text>
            <Text style={styles.streakSub}>day streak</Text>
          </View>
        </View>

        {/* ── Streak multiplier badge (streak ≥ 3 only) ── */}
        {(profile?.streak ?? 0) >= 3 && multiplier > 1 && (
          <View style={styles.multiplierBadge}>
            <Text style={styles.multiplierText}>⚡ {multiplier}x streak multiplier active</Text>
          </View>
        )}

        {/* ── Rank card ── */}
        {rank && (
          <View style={styles.rankCard}>
            <View style={styles.rankRow}>
              <Text style={styles.rankEmoji}>{rank.emoji}</Text>
              <View style={styles.rankInfo}>
                <Text style={[styles.rankLabel, { color: rank.color }]}>{rank.label}</Text>
                <Text style={styles.rankSub}>{rankProgress}% to next rank</Text>
              </View>
              <Text style={styles.rankTotalPts}>{profile?.pts?.toLocaleString()} pts</Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${rankProgress}%` as any, backgroundColor: rank.color },
                ]}
              />
            </View>
          </View>
        )}

        {/* ── Daily challenge ── */}
        <Text style={styles.sectionTitle}>Daily Challenge</Text>
        <View style={[styles.challengeCard, !!todayChallenge && styles.challengeDone]}>
          <View style={styles.challengeRow}>
            <Text style={styles.challengeIcon}>{todayChallenge ? '✅' : '🎯'}</Text>
            <Text style={[styles.challengeText, !!todayChallenge && styles.challengeTextDone]}>
              {todaysChallenge}
            </Text>
          </View>
          {!todayChallenge ? (
            <TouchableOpacity style={styles.challengeBtn} onPress={handleDailyChallenge} activeOpacity={0.8}>
              <Text style={styles.challengeBtnText}>Complete · +{DAILY_CHALLENGE_PTS} pts</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.challengeCompleted}>
              Completed! +{todayChallenge.pts_earned} pts
            </Text>
          )}
        </View>

        {/* ── Activity grid ── */}
        <Text style={styles.sectionTitle}>Log Activity</Text>
        <View style={styles.activityGrid}>
          {ACTIVITIES.map(act => (
            <TouchableOpacity
              key={act.type}
              style={styles.activityBtn}
              onPress={() => handleLogActivity(act.type)}
              activeOpacity={0.7}
            >
              <Text style={styles.activityIcon}>{act.icon}</Text>
              <Text style={styles.activityLabel}>{act.label}</Text>
              <Text style={styles.activityPts}>+{act.pts}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Today's log ── */}
        {todayActivities.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Today's Log</Text>
            {todayActivities.map(a => {
              const def = ACTIVITIES.find(x => x.type === a.type);
              return (
                <View key={a.id} style={styles.logRow}>
                  <Text style={styles.logIcon}>{def?.icon}</Text>
                  <View style={styles.logInfo}>
                    <Text style={styles.logLabel}>{def?.label ?? a.type}</Text>
                    {a.combo_bonus && (
                      <Text style={styles.logCombo}>💥 Combo bonus</Text>
                    )}
                  </View>
                  <Text style={styles.logPts}>+{a.pts_earned}</Text>
                </View>
              );
            })}
          </>
        )}

      </ScrollView>

      {/* ── Point burst overlay ── */}
      {burstVisible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.burstOverlay,
            { opacity: burstOpacity, transform: [{ translateY: burstY }] },
          ]}
        >
          <Text style={styles.burstText}>{burstText}</Text>
        </Animated.View>
      )}

      {/* ── Combo burst overlay ── */}
      {comboVisible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.comboOverlay,
            { opacity: comboOpacity, transform: [{ scale: comboScale }] },
          ]}
        >
          <Text style={styles.comboTitle}>💥 CARDIO COMBO!</Text>
          <Text style={styles.comboPts}>+{COMBO_BONUS_PTS} BONUS PTS</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#06001a' },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: { color: '#9ca3af', fontSize: 14 },
  pts: { color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },

  // Streak badge
  streakBadge: {
    alignItems: 'center',
    backgroundColor: '#1a0030',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#2d1a4a',
  },
  streakFire: { fontSize: 22 },
  streakCount: { color: '#f97316', fontWeight: '800', fontSize: 20, lineHeight: 24 },
  streakSub: { color: '#6b7280', fontSize: 10, fontWeight: '600' },

  // Multiplier badge
  multiplierBadge: {
    backgroundColor: '#1a0c00',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f97316',
  },
  multiplierText: { color: '#f97316', fontWeight: '700', textAlign: 'center', fontSize: 13 },

  // Rank card
  rankCard: {
    backgroundColor: '#110020',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2d1a4a',
  },
  rankRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  rankEmoji: { fontSize: 30, marginRight: 12 },
  rankInfo: { flex: 1 },
  rankLabel: { fontSize: 20, fontWeight: '900' },
  rankSub: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  rankTotalPts: { color: '#9ca3af', fontSize: 13, fontWeight: '600' },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#2d1a4a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4 },

  // Section title
  sectionTitle: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 4,
  },

  // Daily challenge
  challengeCard: {
    backgroundColor: '#110020',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2d1a4a',
  },
  challengeDone: {
    borderColor: '#14532d',
    backgroundColor: '#0d1f12',
  },
  challengeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  challengeIcon: { fontSize: 20, marginRight: 10 },
  challengeText: { flex: 1, color: '#e5e7eb', fontSize: 15, fontWeight: '600', lineHeight: 20 },
  challengeTextDone: { color: '#6b7280' },
  challengeBtn: {
    backgroundColor: '#a855f7',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  challengeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  challengeCompleted: { color: '#4ade80', fontWeight: '600', fontSize: 13, textAlign: 'center' },

  // Activity grid
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  activityBtn: {
    backgroundColor: '#110020',
    borderRadius: 14,
    padding: 14,
    width: '30%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d1a4a',
  },
  activityIcon: { fontSize: 26, marginBottom: 5 },
  activityLabel: { color: '#d1d5db', fontSize: 12, marginBottom: 2, fontWeight: '600' },
  activityPts: { color: '#a855f7', fontWeight: '700', fontSize: 12 },

  // Today's log
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#1a0030',
  },
  logIcon: { fontSize: 20, marginRight: 12 },
  logInfo: { flex: 1 },
  logLabel: { color: '#d1d5db', fontWeight: '600', fontSize: 14 },
  logCombo: { color: '#f97316', fontSize: 11, marginTop: 1 },
  logPts: { color: '#a855f7', fontWeight: '700', fontSize: 14 },

  // Point burst overlay
  burstOverlay: {
    position: 'absolute',
    bottom: '35%',
    alignSelf: 'center',
    backgroundColor: 'transparent',
    pointerEvents: 'none',
  },
  burstText: {
    color: '#a855f7',
    fontSize: 38,
    fontWeight: '900',
    textShadowColor: '#a855f780',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },

  // Combo overlay
  comboOverlay: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    backgroundColor: '#1a0800',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderWidth: 2,
    borderColor: '#f97316',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  comboTitle: { color: '#f97316', fontSize: 22, fontWeight: '900', marginBottom: 4 },
  comboPts: { color: '#fbbf24', fontSize: 16, fontWeight: '700' },
});
