import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../lib/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
}: ButtonProps) {
  const theme = useTheme();

  const bgColor =
    variant === 'primary' ? theme.primary :
    variant === 'secondary' ? theme.card :
    'transparent';

  const borderColor =
    variant === 'primary' ? theme.primary :
    theme.border;

  const textColor = variant === 'ghost' ? theme.primary : '#ffffff';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bgColor, borderColor },
        (disabled || loading) && styles.dimmed,
        pressed && styles.pressed,
      ]}
    >
      {icon && <View style={styles.icon}>{icon}</View>}
      {loading
        ? <ActivityIndicator color={textColor} size="small" />
        : <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      }
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
  icon: {
    marginRight: 8,
  },
  dimmed: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
});
