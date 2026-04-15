import { View, Text, StyleSheet } from 'react-native';
import { ThemeColors } from '../../lib/theme';

interface Props {
  theme: ThemeColors;
}

// TODO: Implement full timer tab — see GitHub issue #5
// Features needed:
// - Exercise selector (from BATTLE_EXERCISES)
// - Timer preset buttons (30s / 60s / 120s / 300s)
// - Countdown display with start/stop
// - Rep input on completion
// - Save score to timed_scores table

export default function TimerTab({ theme }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⏱️</Text>
      <Text style={styles.title}>Timed Challenges</Text>
      <Text style={styles.sub}>Pick an exercise, set a timer, go hard.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 8 },
  sub: { color: '#666', fontSize: 15, textAlign: 'center' },
});
