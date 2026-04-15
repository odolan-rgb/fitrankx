import { THEMES, ThemeDef } from '../constants/game';
import { useFitRankX } from './store';
import { useMemo } from 'react';

// ─────────────────────────────────────────────
// AppTheme — full color set derived from profile.theme
// ─────────────────────────────────────────────

export interface AppTheme extends ThemeDef {
  card: string;    // card / surface background
  border: string;  // subtle border color
  text: string;    // '#ffffff'
  muted: string;   // '#888888' — labels, subtitles
  dimmed: string;  // '#444444' — placeholder, de-emphasised
}

const CARD_EXTRAS: Record<string, { card: string; border: string }> = {
  nova:    { card: '#110020', border: '#2d1a4a' },
  cyber:   { card: '#001525', border: '#0a2d40' },
  solar:   { card: '#201500', border: '#3a2500' },
  phantom: { card: '#002515', border: '#0a3020' },
  crimson: { card: '#200010', border: '#3a0a15' },
};

export function useTheme(): AppTheme {
  const themeKey = useFitRankX(s => s.profile?.theme ?? 'nova');

  return useMemo(() => {
    const def = THEMES.find(t => t.theme === themeKey) ?? THEMES[0];
    const extras = CARD_EXTRAS[def.theme] ?? CARD_EXTRAS.nova;
    return {
      ...def,
      ...extras,
      text: '#ffffff',
      muted: '#888888',
      dimmed: '#444444',
    };
  }, [themeKey]);
}
