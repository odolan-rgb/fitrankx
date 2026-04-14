import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import { Theme } from '../types';
import { useFitRankX } from './store';

// ─────────────────────────────────────────────
// Color tokens per theme
// ─────────────────────────────────────────────

export interface ThemeColors {
  primary: string;
  secondary: string;
  bg: string;
  card: string;
  border: string;
  text: string;
}

export const THEME_COLORS: Record<Theme, ThemeColors> = {
  nova:    { primary: '#a855f7', secondary: '#ec4899', bg: '#06001a', card: '#110020', border: '#2d1a4a', text: '#ffffff' },
  cyber:   { primary: '#06b6d4', secondary: '#3b82f6', bg: '#000a14', card: '#001020', border: '#0a2040', text: '#ffffff' },
  solar:   { primary: '#f59e0b', secondary: '#ef4444', bg: '#1a0a00', card: '#201000', border: '#402000', text: '#ffffff' },
  phantom: { primary: '#10b981', secondary: '#8b5cf6', bg: '#001a08', card: '#001510', border: '#0a3020', text: '#ffffff' },
  crimson: { primary: '#ef4444', secondary: '#f97316', bg: '#1a0000', card: '#200000', border: '#400000', text: '#ffffff' },
};

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

interface ThemeContextValue {
  theme: ThemeColors;
  themeName: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: THEME_COLORS.nova,
  themeName: 'nova',
  setTheme: () => {},
});

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { profile, updateProfile } = useFitRankX();
  const [themeName, setThemeName] = useState<Theme>('nova');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Sync with profile.theme when profile loads or changes
  useEffect(() => {
    if (profile?.theme) {
      setThemeName(profile.theme);
    }
  }, [profile?.theme]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      // 300ms fade: out → swap → in
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setThemeName(newTheme);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      });
      // Persist to DB immediately (optimistic)
      updateProfile({ theme: newTheme });
    },
    [fadeAnim, updateProfile],
  );

  return (
    <ThemeContext.Provider value={{ theme: THEME_COLORS[themeName], themeName, setTheme }}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {children}
      </Animated.View>
    </ThemeContext.Provider>
  );
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useTheme() {
  return useContext(ThemeContext);
}
