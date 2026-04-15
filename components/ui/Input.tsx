import React from 'react';
import { KeyboardTypeOptions, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../../lib/theme';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  error?: string;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  error,
}: InputProps) {
  const theme = useTheme();

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={[styles.label, { color: theme.text }]}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.border}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        style={[
          styles.input,
          { backgroundColor: theme.card, borderColor: error ? '#ef4444' : theme.border, color: theme.text },
        ]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    opacity: 0.8,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  error: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
});
