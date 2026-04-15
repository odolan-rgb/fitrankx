// ─────────────────────────────────────────────
// FitRankX — Theme context & useTheme hook
// ─────────────────────────────────────────────

import React, { createContext, useContext, useMemo } from 'react';
import { Theme } from '../types';
import { useFitRankX } from './store';

export interface ThemeColors {
  primary: string;
  secondary: string;
  bg: string;
  card: string;
  border: string;
  text: string;
}

const THEME_COLORS: Record<Theme, ThemeColors> = {
  nova:    { primary: '#a855f7', secondary: '#ec4899', bg: '#06001a', card: '#110020', border: '#2d1a4a', text: '#ffffff' },
  cyber:   { primary: '#06b6d4', secondary: '#3b82f6', bg: '#000a14', card: '#001020', border: '#0a2040', text: '#ffffff' },
  solar:   { primary: '#f59e0b', secondary: '#ef4444', bg: '#1a0a00', card: '#201000', border: '#402000', text: '#ffffff' },
  phantom: { primary: '#10b981', secondary: '#8b5cf6', bg: '#001a08', card: '#001510', border: '#0a3020', text: '#ffffff' },
  crimson: { primary: '#ef4444', secondary: '#f97316', bg: '#1a0000', card: '#200000', border: '#400000', text: '#ffffff' },
};

const DEFAULT_THEME: Theme = 'nova';

const ThemeContext = createContext<ThemeColors>(THEME_COLORS[DEFAULT_THEME]);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const profile = useFitRankX(s => s.profile);
  const themeKey: Theme = profile?.theme ?? DEFAULT_THEME;
  const colors = useMemo(() => THEME_COLORS[themeKey] ?? THEME_COLORS[DEFAULT_THEME], [themeKey]);
  return React.createElement(ThemeContext.Provider, { value: colors }, children);
}

export function useTheme(): ThemeColors {
  return useContext(ThemeContext);
}
