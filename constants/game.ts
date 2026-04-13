// ─────────────────────────────────────────────
// FitRankX — Game Constants
// Ported from the HTML prototype
// ─────────────────────────────────────────────

import { ActivityType, Rank, Theme } from '../types';

// ─── Activities ───────────────────────────────

export interface ActivityDef {
  type: ActivityType;
  label: string;
  icon: string;
  pts: number;
  isCardio: boolean;
}

export const ACTIVITIES: ActivityDef[] = [
  { type: 'walk',    label: 'Walk',       icon: '🚶', pts: 20, isCardio: true  },
  { type: 'run',     label: 'Run',        icon: '🏃', pts: 35, isCardio: true  },
  { type: 'workout', label: 'Workout',    icon: '💪', pts: 40, isCardio: false },
  { type: 'cycle',   label: 'Cycle',      icon: '🚴', pts: 30, isCardio: true  },
  { type: 'swim',    label: 'Swim',       icon: '🏊', pts: 45, isCardio: true  },
  { type: 'yoga',    label: 'Yoga',       icon: '🧘', pts: 15, isCardio: false },
  { type: 'steps',   label: '10K Steps',  icon: '👟', pts: 25, isCardio: true  },
];

export const ACTIVITY_MAP = Object.fromEntries(
  ACTIVITIES.map(a => [a.type, a])
) as Record<ActivityType, ActivityDef>;

// ─── Combo Bonus ──────────────────────────────

/** +30 pts when 2+ cardio activities logged in one day */
export const COMBO_BONUS_PTS = 30;
export const COMBO_CARDIO_THRESHOLD = 2;

// ─── Ranks ────────────────────────────────────

export interface RankDef {
  rank: Rank;
  label: string;
  minPts: number;
  maxPts: number;
  color: string;
  emoji: string;
}

export const RANKS: RankDef[] = [
  { rank: 'ROOKIE',  label: 'Rookie',  minPts: 0,     maxPts: 500,   color: '#9ca3af', emoji: '🌱' },
  { rank: 'ATHLETE', label: 'Athlete', minPts: 500,   maxPts: 1500,  color: '#60a5fa', emoji: '🏅' },
  { rank: 'BEAST',   label: 'Beast',   minPts: 1500,  maxPts: 4000,  color: '#34d399', emoji: '🦁' },
  { rank: 'ELITE',   label: 'Elite',   minPts: 4000,  maxPts: 8000,  color: '#a855f7', emoji: '💎' },
  { rank: 'SAVAGE',  label: 'Savage',  minPts: 8000,  maxPts: 15000, color: '#f97316', emoji: '⚡' },
  { rank: 'LEGEND',  label: 'Legend',  minPts: 15000, maxPts: Infinity, color: '#facc15', emoji: '👑' },
];

export function getRankForPts(pts: number): RankDef {
  return RANKS.slice().reverse().find(r => pts >= r.minPts) ?? RANKS[0];
}

export function getRankProgress(pts: number): number {
  const rank = getRankForPts(pts);
  if (rank.maxPts === Infinity) return 100;
  const range = rank.maxPts - rank.minPts;
  const progress = pts - rank.minPts;
  return Math.min(100, Math.round((progress / range) * 100));
}

// ─── Streak Multipliers ───────────────────────

export interface StreakMultiplier {
  minDays: number;
  multiplier: number;
  label: string;
}

export const STREAK_MULTIPLIERS: StreakMultiplier[] = [
  { minDays: 30, multiplier: 2.0,  label: '2x' },
  { minDays: 14, multiplier: 1.5,  label: '1.5x' },
  { minDays: 7,  multiplier: 1.25, label: '1.25x' },
  { minDays: 3,  multiplier: 1.1,  label: '1.1x' },
  { minDays: 0,  multiplier: 1.0,  label: '1x' },
];

export function getStreakMultiplier(streak: number): number {
  return STREAK_MULTIPLIERS.find(s => streak >= s.minDays)?.multiplier ?? 1.0;
}

// ─── Daily Challenges ─────────────────────────

export const DAILY_CHALLENGE_POOL = [
  'Do 20 push-ups',
  'Walk for 30 minutes',
  'Complete 50 squats',
  'Do 15 minutes of stretching',
  'Run for 20 minutes',
  'Complete 3 sets of pull-ups',
  'Do a 10-minute plank challenge',
  'Complete 100 jumping jacks',
];

export const DAILY_CHALLENGE_PTS = 40;

// ─── Weekly Challenges ────────────────────────

export type WeeklyChallengeType = 'activities' | 'points' | 'days' | 'challenges' | 'combo';

export interface WeeklyChallengeDef {
  type: WeeklyChallengeType;
  desc: string;
  target: number;
  pts: number;
}

export const WEEKLY_CHALLENGES: WeeklyChallengeDef[] = [
  { type: 'activities',  desc: 'Log {target} activities this week',         target: 5,   pts: 200 },
  { type: 'points',      desc: 'Earn {target} points this week',            target: 300, pts: 200 },
  { type: 'days',        desc: 'Stay active for {target} days this week',   target: 5,   pts: 200 },
  { type: 'challenges',  desc: 'Complete {target} daily challenges',        target: 3,   pts: 200 },
  { type: 'combo',       desc: 'Hit the cardio combo {target} times',       target: 2,   pts: 200 },
];

// ─── Badges ───────────────────────────────────

export interface BadgeDef {
  key: string;
  name: string;
  description: string;
  emoji: string;
}

export const BADGE_DEFS: BadgeDef[] = [
  { key: 'first_step',     name: 'First Step',      description: 'Log your first walk',           emoji: '👟' },
  { key: 'on_fire',        name: 'On Fire',          description: '3-day streak',                  emoji: '🔥' },
  { key: 'week_warrior',   name: 'Week Warrior',     description: '7-day streak',                  emoji: '⚔️' },
  { key: 'iron_will',      name: '14 Days Iron',     description: '14-day streak',                 emoji: '🛡️' },
  { key: 'monthly_legend', name: 'Monthly Legend',   description: '30-day streak',                 emoji: '👑' },
  { key: 'swimmer',        name: 'Swimmer',          description: 'Log a swim session',            emoji: '🏊' },
  { key: 'cyclist',        name: 'Cyclist',          description: 'Log a cycle session',           emoji: '🚴' },
  { key: 'yogi',           name: 'Yogi',             description: 'Log a yoga session',            emoji: '🧘' },
  { key: 'combo_king',     name: 'Combo King',       description: 'Hit the cardio combo bonus',    emoji: '💥' },
  { key: 'athlete',        name: 'Athlete',          description: 'Reach ATHLETE rank',            emoji: '🏅' },
  { key: 'beast',          name: 'Beast Mode',       description: 'Reach BEAST rank',              emoji: '🦁' },
  { key: 'elite',          name: 'Elite',            description: 'Reach ELITE rank',              emoji: '💎' },
  { key: 'savage',         name: 'Savage',           description: 'Reach SAVAGE rank',             emoji: '⚡' },
  { key: 'legend',         name: 'Legend',           description: 'Reach LEGEND rank',             emoji: '🌟' },
  { key: 'weekly_hero',    name: 'Weekly Hero',      description: 'Complete a weekly challenge',   emoji: '🏆' },
  { key: 'centurion',      name: 'Centurion',        description: 'Earn 100 points in one day',    emoji: '💯' },
  { key: 'grinder',        name: 'Grinder',          description: 'Log 5 activities in one day',   emoji: '⚙️' },
];

// ─── Themes ───────────────────────────────────

export interface ThemeDef {
  theme: Theme;
  label: string;
  primary: string;
  secondary: string;
  bg: string;
  emoji: string;
}

export const THEMES: ThemeDef[] = [
  { theme: 'nova',    label: 'Nova',    primary: '#a855f7', secondary: '#ec4899', bg: '#06001a', emoji: '🌌' },
  { theme: 'cyber',   label: 'Cyber',   primary: '#06b6d4', secondary: '#3b82f6', bg: '#000a14', emoji: '🤖' },
  { theme: 'solar',   label: 'Solar',   primary: '#f59e0b', secondary: '#ef4444', bg: '#1a0a00', emoji: '☀️' },
  { theme: 'phantom', label: 'Phantom', primary: '#10b981', secondary: '#8b5cf6', bg: '#001a08', emoji: '👻' },
  { theme: 'crimson', label: 'Crimson', primary: '#ef4444', secondary: '#f97316', bg: '#1a0000', emoji: '🔴' },
];

// ─── Battle / Duels ───────────────────────────

export const BATTLE_EXERCISES = [
  'Push-ups', 'Squats', 'Burpees', 'Pull-ups', 'Sit-ups',
  'Lunges', 'Jumping Jacks', 'Mountain Climbers', 'Dips', 'Box Jumps',
];

export const TIMER_PRESETS = [30, 60, 120, 300]; // seconds

export const DUEL_PTS_REWARD = 50;
export const DUEL_EXPIRY_HOURS = 24;

// ─── Health Calculations ──────────────────────

export const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary:   1.2,
  light:       1.375,
  moderate:    1.55,
  active:      1.725,
  very_active: 1.9,
};

export const GOAL_CALORIE_ADJUSTMENTS: Record<string, number> = {
  lose:       -500,
  gain:       +300,
  maintain:   0,
  endurance:  +200,
};
