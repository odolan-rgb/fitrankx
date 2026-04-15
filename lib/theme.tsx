import { useFitRankX } from './store';
import { THEMES } from '../constants/game';

export interface ThemeColors {
  primary: string;
  secondary: string;
  bg: string;
}

export function useTheme(): ThemeColors {
  const themeKey = useFitRankX(s => s.profile?.theme ?? 'nova');
  const def = THEMES.find(t => t.theme === themeKey) ?? THEMES[0];
  return { primary: def.primary, secondary: def.secondary, bg: def.bg };
}
