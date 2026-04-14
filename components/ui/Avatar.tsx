import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../lib/theme';

interface AvatarProps {
  emoji: string;
  size?: number;
}

export function Avatar({ emoji, size = 48 }: AvatarProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
