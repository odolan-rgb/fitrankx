import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useTheme } from '../../lib/theme';
import TimerTab from '../../components/battle/TimerTab';
import DuelsTab from '../../components/battle/DuelsTab';
import CrewTab from '../../components/battle/CrewTab';

type BattleTab = 'timer' | 'duels' | 'crew';

export default function BattleScreen() {
  const [activeTab, setActiveTab] = useState<BattleTab>('timer');
  const theme = useTheme();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Battle</Text>
        <View style={styles.tabs}>
          {(['timer', 'duels', 'crew'] as BattleTab[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && { backgroundColor: theme.primary, borderColor: theme.primary }]}
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
        {activeTab === 'timer' && <TimerTab theme={theme} />}
        {activeTab === 'duels' && <DuelsTab theme={theme} />}
        {activeTab === 'crew' && <CrewTab theme={theme} />}
      </View>
    </SafeAreaView>
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
  tabText: { color: '#555', fontWeight: '700', fontSize: 12 },
  tabTextActive: { color: '#fff' },
  content: { flex: 1 },
});
