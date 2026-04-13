import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// TODO: Implement full plan screen — see GitHub issue #plan-screen
// Features needed:
// - Create goal with name, target date, milestones
// - Check off milestones
// - Journal log entries with timestamps
// - Progress visualization

export default function PlanScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>My Plan</Text>
      </View>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderIcon}>🗺️</Text>
        <Text style={styles.placeholderTitle}>Set Your Goal</Text>
        <Text style={styles.placeholderSub}>
          Create a fitness plan with milestones and track your journey.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#06001a' },
  header: { padding: 20, paddingBottom: 10 },
  title: { color: '#fff', fontSize: 26, fontWeight: '900' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  placeholderIcon: { fontSize: 48, marginBottom: 16 },
  placeholderTitle: { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 8 },
  placeholderSub: { color: '#666', fontSize: 15, textAlign: 'center' },
});
