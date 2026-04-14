import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useTheme, ThemeColors } from '../../lib/theme';
import { Profile } from '../../types';
import { getRankForPts } from '../../constants/game';

// TODO: Implement full leaderboard — see GitHub issue #leaderboard
// Features needed:
// - Tabs: Global / Friends
// - Real-time updates via Supabase subscriptions
// - Friend add via squad code
// - Highlight current user's position

export default function LeaderboardScreen() {
  const [leaders, setLeaders] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('pts', { ascending: false })
      .limit(50);

    setLeaders(data ?? []);
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {leaders.map((p, i) => {
            const rank = getRankForPts(p.pts);
            const isMe = p.id === currentUserId;
            return (
              <View key={p.id} style={[styles.row, isMe && styles.rowMe]}>
                <Text style={styles.position}>#{i + 1}</Text>
                <Text style={styles.avatar}>{p.avatar_emoji}</Text>
                <View style={styles.info}>
                  <Text style={styles.username}>{p.username}{isMe ? ' (you)' : ''}</Text>
                  <Text style={styles.rankLabel}>{rank.emoji} {rank.label}</Text>
                </View>
                <View style={styles.right}>
                  <Text style={styles.pts}>{p.pts}</Text>
                  <Text style={styles.ptsLabel}>pts</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    header: { padding: 20, paddingBottom: 10 },
    title: { color: theme.text, fontSize: 26, fontWeight: '900' },
    list: { padding: 16, paddingBottom: 40 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    rowMe: { borderColor: theme.primary, backgroundColor: theme.card },
    position: { color: '#555', fontWeight: '700', width: 30 },
    avatar: { fontSize: 24, marginRight: 12 },
    info: { flex: 1 },
    username: { color: theme.text, fontWeight: '700', fontSize: 15 },
    rankLabel: { color: '#888', fontSize: 12, marginTop: 2 },
    right: { alignItems: 'flex-end' },
    pts: { color: theme.primary, fontWeight: '900', fontSize: 18 },
    ptsLabel: { color: '#555', fontSize: 11 },
  });
}
