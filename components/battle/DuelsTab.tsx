import { View, Text, StyleSheet } from 'react-native';
import { ThemeColors } from '../../lib/theme';

interface Props {
  theme: ThemeColors;
}

// TODO: Implement full duels tab — see GitHub issue #6
// Features needed:
// - List of incoming/outgoing duels (from duels table)
// - Challenge a friend by squad code
// - Accept/decline incoming duel
// - Submit rep count to complete a duel
// - Winner determination + pts_reward credit

export default function DuelsTab({ theme }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚔️</Text>
      <Text style={styles.title}>Duels</Text>
      <Text style={styles.sub}>Challenge friends to 1v1 rep battles.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 8 },
  sub: { color: '#666', fontSize: 15, textAlign: 'center' },
});
