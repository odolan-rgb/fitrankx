import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BadgeDef } from '../../constants/game';
import { useTheme } from '../../lib/theme';

interface BadgeProps {
  badge: BadgeDef;
  earned?: boolean;
  earnedAt?: string;
}

export function Badge({ badge, earned = false, earnedAt }: BadgeProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: earned ? theme.card : theme.bg,
          borderColor: earned ? theme.primary : theme.border,
          opacity: earned ? 1 : 0.45,
        },
      ]}
    >
      <Text style={styles.emoji}>{badge.emoji}</Text>
      <Text style={[styles.name, { color: theme.text }]}>{badge.name}</Text>
      <Text style={[styles.desc, { color: theme.text }]}>{badge.description}</Text>
      {earned && earnedAt ? (
        <Text style={[styles.date, { color: theme.primary }]}>
          {new Date(earnedAt).toLocaleDateString()}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  emoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  desc: {
    fontSize: 11,
    textAlign: 'center',
    opacity: 0.6,
  },
  date: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
});
