// ─────────────────────────────────────────────
// FitRankX — Theme Hook
// ─────────────────────────────────────────────

import { useMemo } from 'react';
import { useFitRankX } from './store';
import { THEMES } from '../constants/game';
import type { Theme } from '../types';

export interface AppTheme {
  theme: Theme;
  label: string;
  emoji: string;
  /** Main accent — buttons, highlights, progress bars */
  primary: string;
  /** Secondary accent — gradients, sub-labels */
  secondary: string;
  /** Screen background */
  bg: string;
  /** Card / surface background */
  cardBg: string;
  /** Border / divider */
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
}

/** Per-theme card and border colors that complement each palette. */
const CARD_EXTRAS: Record<Theme, { cardBg: string; border: string }> = {
  nova:    { cardBg: '#110020', border: '#2d1a4a' },
  cyber:   { cardBg: '#001a28', border: '#0a3048' },
  solar:   { cardBg: '#2a1400', border: '#4a2800' },
  phantom: { cardBg: '#002a10', border: '#0a3a20' },
  crimson: { cardBg: '#2a0a0a', border: '#4a1515' },
};

/**
 * Returns the current user's theme colors merged with derived surface /
 * text colors. Falls back to the 'nova' theme when no profile is loaded.
 */
export function useTheme(): AppTheme {
  const themeName: Theme = useFitRankX((s) => s.profile?.theme ?? 'nova');

  return useMemo(() => {
    const def = THEMES.find((t) => t.theme === themeName) ?? THEMES[0];
    const extras = CARD_EXTRAS[def.theme];
    return {
      theme: def.theme,
      label: def.label,
      emoji: def.emoji,
      primary: def.primary,
      secondary: def.secondary,
      bg: def.bg,
      cardBg: extras.cardBg,
      border: extras.border,
      textPrimary: '#ffffff',
      textSecondary: '#cccccc',
      textMuted: '#888888',
    };
  }, [themeName]);
}
