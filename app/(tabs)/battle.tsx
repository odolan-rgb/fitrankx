import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

// TODO: Implement full battle screen — see GitHub issues #battle-timer, #duels, #crews
// Features needed:
// - TIMER tab: select exercise + duration, countdown, rep input, score save
// - DUELS tab: challenge a friend, view incoming duels, submit score
// - CREW tab: create/join crew, crew leaderboard, challenge other crews

type BattleTab = 'timer' | 'duels' | 'crew';

export default function BattleScreen() {
  const [activeTab, setActiveTab] = useState<BattleTab>('timer');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Battle</Text>
        <View style={styles.tabs}>
          {(['timer', 'duels', 'crew'] as BattleTab[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.content}>
        {activeTab === 'timer' && <TimerPlaceholder />}
        {activeTab === 'duels' && <DuelsPlaceholder />}
        {activeTab === 'crew' && <CrewPlaceholder />}
      </View>
    </SafeAreaView>
  );
}

function TimerPlaceholder() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderIcon}>⏱️</Text>
      <Text style={styles.placeholderTitle}>Timed Challenges</Text>
      <Text style={styles.placeholderSub}>Pick an exercise, set a timer, go hard.</Text>
    </View>
  );
}

function DuelsPlaceholder() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderIcon}>⚔️</Text>
      <Text style={styles.placeholderTitle}>Duels</Text>
      <Text style={styles.placeholderSub}>Challenge friends to 1v1 rep battles.</Text>
    </View>
  );
}

function CrewPlaceholder() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderIcon}>👥</Text>
      <Text style={styles.placeholderTitle}>Crew Battles</Text>
      <Text style={styles.placeholderSub}>Form a crew. Battle other squads.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#06001a' },
  header: { padding: 20, paddingBottom: 0 },
  title: { color: '#fff', fontSize: 26, fontWeight: '900', marginBottom: 16 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 0 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#110020',
    borderWidth: 1,
    borderColor: '#2d1a4a',
  },
  tabActive: { backgroundColor: '#a855f7', borderColor: '#a855f7' },
  tabText: { color: '#555', fontWeight: '700', fontSize: 12 },
  tabTextActive: { color: '#fff' },
  content: { flex: 1 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  placeholderIcon: { fontSize: 48, marginBottom: 16 },
  placeholderTitle: { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 8 },
  placeholderSub: { color: '#666', fontSize: 15, textAlign: 'center' },
});
