import { View, Text, StyleSheet } from 'react-native';
import { ThemeColors } from '../../lib/theme';

interface Props {
  theme: ThemeColors;
}

// TODO: Implement full crew tab — see GitHub issue #7
// Features needed:
// - Create a crew or join one by invite code
// - Crew roster with member pts
// - Challenge another crew to a battle
// - Active battle progress (crew pts total)
// - Battle history / win-loss record

export default function CrewTab({ theme }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>👥</Text>
      <Text style={styles.title}>Crew Battles</Text>
      <Text style={styles.sub}>Form a crew. Battle other squads.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 8 },
  sub: { color: '#666', fontSize: 15, textAlign: 'center' },
});
