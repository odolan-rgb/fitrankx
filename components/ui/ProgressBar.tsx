import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '../../lib/theme';

interface ProgressBarProps {
  progress: number; // 0–100
  color?: string;
  height?: number;
}

export function ProgressBar({ progress, color, height = 8 }: ProgressBarProps) {
  const theme = useTheme();
  const barColor = color ?? theme.primary;
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: Math.min(100, Math.max(0, progress)),
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={[styles.track, { height, backgroundColor: theme.border }]}>
      <Animated.View
        style={[
          styles.fill,
          {
            height,
            backgroundColor: barColor,
            width: animatedWidth.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: 999,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    borderRadius: 999,
  },
});
