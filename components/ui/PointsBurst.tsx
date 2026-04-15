import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useTheme } from '../../lib/theme';

interface PointsBurstProps {
  pts: number;
  onComplete: () => void;
}

export function PointsBurst({ pts, onComplete }: PointsBurstProps) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -60,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start(() => onComplete());
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, { opacity, transform: [{ translateY }] }]}
    >
      <Text style={[styles.text, { color: theme.primary }]}>+{pts} pts</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  text: {
    fontSize: 28,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
