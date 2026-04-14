import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useTheme, ThemeColors } from '../../lib/theme';

// TODO: Implement full battle screen — see GitHub issues #battle-timer, #duels, #crews
// Features needed:
// - TIMER tab: select exercise + duration, countdown, rep input, score save
// - DUELS tab: challenge a friend, view incoming duels, submit score
// - CREW tab: create/join crew, crew leaderboard, challenge other crews

type BattleTab = 'timer' | 'duels' | 'crew';

export default function BattleScreen() {
  const [activeTab, setActiveTab] = useState<BattleTab>('timer');
  const { theme } = useTheme();
  const styles = makeStyles(theme);

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
        {activeTab === 'timer' && <TimerPlaceholder theme={theme} />}
        {activeTab === 'duels' && <DuelsPlaceholder theme={theme} />}
        {activeTab === 'crew' && <CrewPlaceholder theme={theme} />}
      </View>
    </SafeAreaView>
  );
}

function TimerPlaceholder({ theme }: { theme: ThemeColors }) {
  return (
    <View style={placeholderStyles.placeholder}>
      <Text style={placeholderStyles.placeholderIcon}>⏱️</Text>
      <Text style={[placeholderStyles.placeholderTitle, { color: theme.text }]}>Timed Challenges</Text>
      <Text style={placeholderStyles.placeholderSub}>Pick an exercise, set a timer, go hard.</Text>
    </View>
  );
}

function DuelsPlaceholder({ theme }: { theme: ThemeColors }) {
  return (
    <View style={placeholderStyles.placeholder}>
      <Text style={placeholderStyles.placeholderIcon}>⚔️</Text>
      <Text style={[placeholderStyles.placeholderTitle, { color: theme.text }]}>Duels</Text>
      <Text style={placeholderStyles.placeholderSub}>Challenge friends to 1v1 rep battles.</Text>
    </View>
  );
}

function CrewPlaceholder({ theme }: { theme: ThemeColors }) {
  return (
    <View style={placeholderStyles.placeholder}>
      <Text style={placeholderStyles.placeholderIcon}>👥</Text>
      <Text style={[placeholderStyles.placeholderTitle, { color: theme.text }]}>Crew Battles</Text>
      <Text style={placeholderStyles.placeholderSub}>Form a crew. Battle other squads.</Text>
    </View>
  );
}

const placeholderStyles = StyleSheet.create({
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  placeholderIcon: { fontSize: 48, marginBottom: 16 },
  placeholderTitle: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
  placeholderSub: { color: '#666', fontSize: 15, textAlign: 'center' },
});

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    header: { padding: 20, paddingBottom: 0 },
    title: { color: theme.text, fontSize: 26, fontWeight: '900', marginBottom: 16 },
    tabs: { flexDirection: 'row', gap: 8, marginBottom: 0 },
    tab: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
    },
    tabActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    tabText: { color: '#555', fontWeight: '700', fontSize: 12 },
    tabTextActive: { color: '#fff' },
    content: { flex: 1 },
  });
}
