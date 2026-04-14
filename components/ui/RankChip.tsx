import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RANKS } from '../../constants/game';
import { Rank } from '../../types';

interface RankChipProps {
  rank: Rank;
}

export function RankChip({ rank }: RankChipProps) {
  const rankDef = RANKS.find(r => r.rank === rank) ?? RANKS[0];
  // Background is a low-opacity tint of the rank color
  const bgColor = rankDef.color + '22';

  return (
    <View style={[styles.chip, { backgroundColor: bgColor, borderColor: rankDef.color }]}>
      <Text style={styles.emoji}>{rankDef.emoji}</Text>
      <Text style={[styles.label, { color: rankDef.color }]}>{rankDef.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  emoji: {
    fontSize: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
});
