import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getStreakMultiplier, STREAK_MULTIPLIERS } from '../../constants/game';
import { useTheme } from '../../lib/theme';

interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  const theme = useTheme();
  const multiplier = getStreakMultiplier(streak);
  const multiplierLabel = STREAK_MULTIPLIERS.find(s => streak >= s.minDays)?.label ?? '1x';

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={styles.fire}>{streak > 0 ? '🔥' : '❄️'}</Text>
      <Text style={[styles.count, { color: theme.text }]}>{streak}</Text>
      {multiplier > 1 ? (
        <View style={[styles.pill, { backgroundColor: theme.primary + '33', borderColor: theme.primary }]}>
          <Text style={[styles.multiplier, { color: theme.primary }]}>{multiplierLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  fire: {
    fontSize: 18,
  },
  count: {
    fontSize: 18,
    fontWeight: '800',
  },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  multiplier: {
    fontSize: 12,
    fontWeight: '700',
  },
});
