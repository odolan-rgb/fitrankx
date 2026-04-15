import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TextInput, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Profile, FriendRequest } from '../../types';
import { getRankForPts } from '../../constants/game';

type Tab = 'global' | 'friends';
type AddResult = { message: string; type: 'success' | 'error' };
type RequestWithSender = FriendRequest & {
  sender?: Pick<Profile, 'id' | 'username' | 'avatar_emoji' | 'pts' | 'rank'>;
};

export default function LeaderboardScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('global');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Global tab
  const [leaders, setLeaders] = useState<Profile[]>([]);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [globalRefreshing, setGlobalRefreshing] = useState(false);

  // Friends tab
  const [friendsList, setFriendsList] = useState<Profile[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState<RequestWithSender[]>([]);
  const [squadCode, setSquadCode] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addResult, setAddResult] = useState<AddResult | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id ?? null;
      if (mounted) setCurrentUserId(uid);
      await fetchGlobal(uid, 'initial', mounted);
      if (mounted) subscribeToProfiles(uid);
    };

    init();

    return () => {
      mounted = false;
      channelRef.current?.unsubscribe();
    };
  }, []);

  // Load friends when switching to that tab
  useEffect(() => {
    if (activeTab === 'friends' && currentUserId) {
      fetchFriends(currentUserId);
    }
  }, [activeTab, currentUserId]);

  // ── Global leaderboard ─────────────────────────────────────────────────────

  const fetchGlobal = async (
    uid: string | null,
    mode: 'initial' | 'refresh' | 'silent' = 'initial',
    mounted = true,
  ) => {
    if (!mounted) return;
    if (mode === 'initial') setGlobalLoading(true);
    if (mode === 'refresh') setGlobalRefreshing(true);

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('pts', { ascending: false })
      .limit(50);

    if (!mounted) return;
    setLeaders(data ?? []);
    setGlobalLoading(false);
    setGlobalRefreshing(false);
  };

  const subscribeToProfiles = (uid: string | null) => {
    channelRef.current?.unsubscribe();
    channelRef.current = supabase
      .channel('leaderboard-profiles')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        () => fetchGlobal(uid, 'silent'),
      )
      .subscribe();
  };

  // ── Friends leaderboard ────────────────────────────────────────────────────

  const fetchFriends = async (uid: string) => {
    setFriendsLoading(true);

    // Both directions of accepted friendships in parallel
    const [{ data: sent }, { data: received }, { data: pending }] = await Promise.all([
      supabase
        .from('friend_requests')
        .select('to_user_id')
        .eq('from_user_id', uid)
        .eq('status', 'accepted'),
      supabase
        .from('friend_requests')
        .select('from_user_id')
        .eq('to_user_id', uid)
        .eq('status', 'accepted'),
      supabase
        .from('friend_requests')
        .select('*')
        .eq('to_user_id', uid)
        .eq('status', 'pending'),
    ]);

    const friendIds = [
      ...(sent?.map(r => r.to_user_id) ?? []),
      ...(received?.map(r => r.from_user_id) ?? []),
    ];

    // Include current user in the friends list for context
    const allIds = [...new Set([...friendIds, uid])];

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .in('id', allIds)
      .order('pts', { ascending: false });

    setFriendsList(profileData ?? []);

    // Resolve senders for pending requests
    let requestsWithSenders: RequestWithSender[] = pending ?? [];
    if (requestsWithSenders.length > 0) {
      const senderIds = requestsWithSenders.map(r => r.from_user_id);
      const { data: senders } = await supabase
        .from('profiles')
        .select('id, username, avatar_emoji, pts, rank')
        .in('id', senderIds);

      requestsWithSenders = requestsWithSenders.map(r => ({
        ...r,
        sender: senders?.find(s => s.id === r.from_user_id),
      }));
    }

    setIncomingRequests(requestsWithSenders);
    setFriendsLoading(false);
  };

  // ── Add friend by squad code ───────────────────────────────────────────────

  const sendFriendRequest = async () => {
    const code = squadCode.trim().toUpperCase();
    if (code.length !== 6) {
      setAddResult({ message: 'Enter a 6-character squad code.', type: 'error' });
      return;
    }
    if (!currentUserId) return;

    setAddLoading(true);
    setAddResult(null);

    const { data: target } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('squad_code', code)
      .single();

    if (!target) {
      setAddResult({ message: 'No user found with that squad code.', type: 'error' });
      setAddLoading(false);
      return;
    }

    if (target.id === currentUserId) {
      setAddResult({ message: "That's your own squad code!", type: 'error' });
      setAddLoading(false);
      return;
    }

    const { error } = await supabase
      .from('friend_requests')
      .insert({ from_user_id: currentUserId, to_user_id: target.id });

    if (error) {
      const msg =
        error.code === '23505'
          ? 'Request already sent or already friends.'
          : 'Could not send request. Try again.';
      setAddResult({ message: msg, type: 'error' });
    } else {
      setAddResult({ message: `Request sent to ${target.username}!`, type: 'success' });
      setSquadCode('');
    }
    setAddLoading(false);
  };

  // ── Accept / decline incoming request ─────────────────────────────────────

  const respondToRequest = async (requestId: string, accept: boolean) => {
    await supabase
      .from('friend_requests')
      .update({ status: accept ? 'accepted' : 'declined', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (currentUserId) fetchFriends(currentUserId);
  };

  // ── Shared row renderer ────────────────────────────────────────────────────

  const renderRow = (p: Profile, position: number) => {
    const rankDef = getRankForPts(p.pts);
    const isMe = p.id === currentUserId;
    const posLabel =
      position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `#${position}`;

    return (
      <View key={p.id} style={[styles.row, isMe && styles.rowMe]}>
        <Text style={styles.position}>{posLabel}</Text>
        <Text style={styles.avatar}>{p.avatar_emoji}</Text>
        <View style={styles.info}>
          <Text style={styles.username}>
            {p.username}
            {isMe ? ' (you)' : ''}
          </Text>
          <Text style={styles.rankLabel}>
            {rankDef.emoji} {rankDef.label}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.pts}>{p.pts.toLocaleString()}</Text>
          <Text style={styles.ptsLabel}>pts</Text>
          {p.streak > 0 && <Text style={styles.streak}>🔥 {p.streak}d</Text>}
        </View>
      </View>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
        <View style={styles.tabs}>
          {(['global', 'friends'] as Tab[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'global' ? 'Global' : 'Friends'}
              </Text>
              {tab === 'friends' && incomingRequests.length > 0 && (
                <View style={styles.badgeDot}>
                  <Text style={styles.badgeDotText}>{incomingRequests.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {activeTab === 'global' ? (
        globalLoading ? (
          <ActivityIndicator color="#a855f7" style={{ marginTop: 40 }} />
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={globalRefreshing}
                onRefresh={() => fetchGlobal(currentUserId, 'refresh')}
                tintColor="#a855f7"
              />
            }
          >
            {leaders.map((p, i) => renderRow(p, i + 1))}
          </ScrollView>
        )
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={friendsLoading}
              onRefresh={() => currentUserId && fetchFriends(currentUserId)}
              tintColor="#a855f7"
            />
          }
        >
          {/* Add friend by squad code */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Add Friend</Text>
            <View style={styles.addRow}>
              <TextInput
                style={styles.input}
                value={squadCode}
                onChangeText={t => {
                  setSquadCode(t.toUpperCase());
                  setAddResult(null);
                }}
                placeholder="Squad code (e.g. ABC123)"
                placeholderTextColor="#3a1a5a"
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.addBtn, addLoading && styles.addBtnDisabled]}
                onPress={sendFriendRequest}
                disabled={addLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.addBtnText}>{addLoading ? '…' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
            {addResult && (
              <Text
                style={addResult.type === 'success' ? styles.successText : styles.errorText}
              >
                {addResult.message}
              </Text>
            )}
          </View>

          {/* Incoming friend requests */}
          {incomingRequests.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>
                Friend Requests ({incomingRequests.length})
              </Text>
              {incomingRequests.map(req => (
                <View key={req.id} style={styles.requestRow}>
                  <Text style={styles.avatar}>{req.sender?.avatar_emoji ?? '🏃'}</Text>
                  <View style={styles.info}>
                    <Text style={styles.username}>{req.sender?.username ?? 'Unknown'}</Text>
                    <Text style={styles.rankLabel}>
                      {getRankForPts(req.sender?.pts ?? 0).emoji}{' '}
                      {getRankForPts(req.sender?.pts ?? 0).label}
                    </Text>
                  </View>
                  <View style={styles.reqBtns}>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => respondToRequest(req.id, true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.acceptTxt}>✓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.declineBtn}
                      onPress={() => respondToRequest(req.id, false)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.declineTxt}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Friends leaderboard */}
          <Text style={[styles.sectionLabel, { marginBottom: 10 }]}>Friends Ranking</Text>
          {friendsLoading ? (
            <ActivityIndicator color="#a855f7" style={{ marginTop: 20 }} />
          ) : friendsList.length <= 1 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🏆</Text>
              <Text style={styles.emptyText}>No friends yet</Text>
              <Text style={styles.emptySubtext}>
                Add friends by squad code above to see how you rank against each other.
              </Text>
            </View>
          ) : (
            friendsList.map((p, i) => renderRow(p, i + 1))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#06001a' },
  header: { padding: 20, paddingBottom: 12 },
  title: { color: '#fff', fontSize: 26, fontWeight: '900', marginBottom: 14 },

  // Tab switcher
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#0d0020',
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: { backgroundColor: '#1a0035' },
  tabText: { color: '#555', fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#a855f7' },
  badgeDot: {
    backgroundColor: '#a855f7',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    paddingHorizontal: 4,
  },
  badgeDotText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  // List
  list: { padding: 16, paddingBottom: 40 },

  // Leaderboard row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#110020',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2d1a4a',
  },
  rowMe: { borderColor: '#a855f7', backgroundColor: '#1a0035' },
  position: { color: '#555', fontWeight: '700', width: 36, fontSize: 14 },
  avatar: { fontSize: 24, marginRight: 12 },
  info: { flex: 1 },
  username: { color: '#fff', fontWeight: '700', fontSize: 15 },
  rankLabel: { color: '#888', fontSize: 12, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  pts: { color: '#a855f7', fontWeight: '900', fontSize: 18 },
  ptsLabel: { color: '#555', fontSize: 11 },
  streak: { color: '#f97316', fontSize: 11, marginTop: 2 },

  // Card
  card: {
    backgroundColor: '#110020',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2d1a4a',
  },
  sectionLabel: {
    color: '#a855f7',
    fontWeight: '800',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
  },

  // Add friend
  addRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: '#0d0020',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2d1a4a',
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
  },
  addBtn: {
    backgroundColor: '#a855f7',
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnDisabled: { backgroundColor: '#5a2d8a' },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  successText: { color: '#34d399', fontSize: 13, marginTop: 10 },
  errorText: { color: '#f87171', fontSize: 13, marginTop: 10 },

  // Friend requests
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reqBtns: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    backgroundColor: '#0a2a14',
    borderRadius: 8,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#34d399',
  },
  acceptTxt: { color: '#34d399', fontWeight: '800', fontSize: 16 },
  declineBtn: {
    backgroundColor: '#2a0a0a',
    borderRadius: 8,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f87171',
  },
  declineTxt: { color: '#f87171', fontWeight: '800', fontSize: 16 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#fff', fontWeight: '700', fontSize: 18, marginBottom: 8 },
  emptySubtext: {
    color: '#555',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
});
