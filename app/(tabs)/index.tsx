import { useEffect, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFitRankX } from '../../lib/store';
import { useTheme, AppTheme } from '../../lib/theme';
import { ACTIVITIES, getRankForPts, getRankProgress, getStreakMultiplier } from '../../constants/game';

// Streak orange is a functional constant, not part of the palette
const STREAK_COLOR = '#f97316';

export default function HomeScreen() {
  const {
    profile, todayActivities,
    weeklyChallenge, loadWeeklyChallenge,
    claimWeeklyReward, logActivity,
  } = useFitRankX();

  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const rank = profile ? getRankForPts(profile.pts) : null;
  const rankProgress = profile ? getRankProgress(profile.pts) : 0;
  const multiplier = profile ? getStreakMultiplier(profile.streak) : 1;

  // Load weekly challenge on mount
  useEffect(() => {
    loadWeeklyChallenge();
  }, []);

  // Glowing pulse for the claim button
  const glowPulse = useRef(new Animated.Value(0.75)).current;
  const canClaim =
    !!weeklyChallenge &&
    weeklyChallenge.progress >= weeklyChallenge.target &&
    !weeklyChallenge.claimed;

  useEffect(() => {
    if (canClaim) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(glowPulse, { toValue: 0.75, duration: 700, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      glowPulse.setValue(0.75);
    }
  }, [canClaim]);

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

        {/* Multiplier badge */}
        {multiplier > 1 && (
          <View style={styles.multiplierBadge}>
            <Text style={styles.multiplierText}>⚡ {multiplier}x streak multiplier active</Text>
          </View>
        )}

        {/* Weekly challenge card */}
        {weeklyChallenge && (
          <View style={styles.weeklyCard}>
            <View style={styles.weeklyHeader}>
              <Text style={styles.weeklyTitle}>Weekly Challenge</Text>
              <Text style={styles.weeklyPts}>+{weeklyChallenge.pts_earned} pts</Text>
            </View>

            <Text style={styles.weeklyDesc}>{weeklyChallenge.challenge_desc}</Text>

            {/* Progress bar */}
            <View style={styles.weeklyProgressTrack}>
              <View
                style={[
                  styles.weeklyProgressFill,
                  {
                    width: `${Math.min(100, Math.round((weeklyChallenge.progress / weeklyChallenge.target) * 100))}%` as any,
                  },
                ]}
              />
            </View>
            <Text style={styles.weeklyProgressLabel}>
              {weeklyChallenge.progress} / {weeklyChallenge.target}
            </Text>

            {/* Claim / claimed state */}
            {weeklyChallenge.claimed ? (
              <View style={styles.claimedBadge}>
                <Text style={styles.claimedText}>✅ Claimed</Text>
              </View>
            ) : canClaim ? (
              <Animated.View style={{ opacity: glowPulse }}>
                <TouchableOpacity
                  style={styles.claimBtn}
                  onPress={claimWeeklyReward}
                  activeOpacity={0.8}
                >
                  <Text style={styles.claimBtnText}>🏆 Claim Reward</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : null}
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

        {/* Today's log */}
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

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    container: { flex: 1 },
    content: { padding: 20, paddingBottom: 40 },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    greeting: { color: theme.textSecondary, fontSize: 14 },
    pts: { color: theme.textPrimary, fontSize: 28, fontWeight: '900' },
    streakBadge: { alignItems: 'center', backgroundColor: theme.cardBg, borderRadius: 12, padding: 12 },
    streakFire: { fontSize: 20 },
    streakCount: { color: STREAK_COLOR, fontWeight: '800', fontSize: 18 },

    // Rank card
    rankCard: {
      backgroundColor: theme.cardBg,
      borderRadius: 16,
      padding: 20,
      marginBottom: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    rankEmoji: { fontSize: 32, marginBottom: 4 },
    rankLabel: { color: theme.primary, fontSize: 22, fontWeight: '900', marginBottom: 12 },
    progressBar: { width: '100%', height: 8, backgroundColor: theme.border, borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: theme.primary, borderRadius: 4 },
    rankSub: { color: theme.textMuted, fontSize: 12, marginTop: 8 },

    // Multiplier
    multiplierBadge: {
      backgroundColor: theme.cardBg,
      borderRadius: 10,
      padding: 10,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: STREAK_COLOR,
    },
    multiplierText: { color: STREAK_COLOR, fontWeight: '700', textAlign: 'center' },

    // Weekly challenge card
    weeklyCard: {
      backgroundColor: theme.cardBg,
      borderRadius: 16,
      padding: 18,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme.border,
    },
    weeklyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    weeklyTitle: { color: theme.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    weeklyPts: { color: theme.primary, fontSize: 13, fontWeight: '800' },
    weeklyDesc: { color: theme.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 14, lineHeight: 21 },
    weeklyProgressTrack: {
      height: 8,
      backgroundColor: theme.border,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 6,
    },
    weeklyProgressFill: {
      height: '100%',
      backgroundColor: theme.secondary,
      borderRadius: 4,
    },
    weeklyProgressLabel: { color: theme.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 12 },
    claimBtn: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    claimBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
    claimedBadge: {
      backgroundColor: theme.border,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    claimedText: { color: theme.textSecondary, fontWeight: '700', fontSize: 14 },

    // Section label
    sectionTitle: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginBottom: 12,
      marginTop: 8,
    },

    // Activity grid
    activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    activityBtn: {
      backgroundColor: theme.cardBg,
      borderRadius: 12,
      padding: 14,
      width: '30%',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    activityIcon: { fontSize: 24, marginBottom: 4 },
    activityLabel: { color: theme.textSecondary, fontSize: 12, marginBottom: 2 },
    activityPts: { color: theme.primary, fontWeight: '700', fontSize: 12 },

    // Today's log
    logRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    logIcon: { fontSize: 18, marginRight: 10 },
    logLabel: { color: theme.textSecondary, flex: 1, textTransform: 'capitalize' },
    logPts: { color: theme.primary, fontWeight: '700' },
  });
}
