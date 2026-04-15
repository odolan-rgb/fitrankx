// ─────────────────────────────────────────────
// FitRankX — Badge Unlock Service
// ─────────────────────────────────────────────

import { supabase } from './supabase';
import { BADGE_DEFS, BadgeDef } from '../constants/game';
import { Profile, Activity } from '../types';

export interface BadgeCheckContext {
  profile: Profile;
  todayActivities: Activity[];
}

/**
 * Checks all badge conditions for the given user and awards any newly
 * unlocked badges. Returns the BadgeDef objects for every badge that
 * was awarded this call (empty array if none).
 *
 * Safe to call repeatedly — the user_badges table has a unique constraint
 * on (user_id, badge_key) so duplicate inserts are silently ignored.
 */
export async function checkAndAwardBadges(
  userId: string,
  ctx: BadgeCheckContext
): Promise<BadgeDef[]> {
  // 1. Fetch badge keys the user has already earned
  const { data: existing } = await supabase
    .from('user_badges')
    .select('badge_key')
    .eq('user_id', userId);

  const earnedKeys = new Set((existing ?? []).map((b) => b.badge_key as string));

  // 2. Fetch all-time activity types & combo history for this user
  const { data: allActivities } = await supabase
    .from('activities')
    .select('type, combo_bonus')
    .eq('user_id', userId);

  const allTypes = new Set((allActivities ?? []).map((a) => a.type as string));
  const everHadCombo = (allActivities ?? []).some((a) => a.combo_bonus);

  // 3. Check whether any weekly challenge has ever been claimed
  const { data: weeklyClaims } = await supabase
    .from('weekly_challenge_completions')
    .select('id')
    .eq('user_id', userId)
    .eq('claimed', true)
    .limit(1);

  const hasWeeklyClaim = (weeklyClaims ?? []).length > 0;

  // 4. Compute today's aggregate stats
  const todayPts = ctx.todayActivities.reduce((sum, a) => sum + a.pts_earned, 0);
  const todayCount = ctx.todayActivities.length;

  // 5. Evaluate every badge condition
  const conditions: Record<string, boolean> = {
    first_step:     allTypes.has('walk'),
    on_fire:        ctx.profile.streak >= 3,
    week_warrior:   ctx.profile.streak >= 7,
    iron_will:      ctx.profile.streak >= 14,
    monthly_legend: ctx.profile.streak >= 30,
    swimmer:        allTypes.has('swim'),
    cyclist:        allTypes.has('cycle'),
    yogi:           allTypes.has('yoga'),
    combo_king:     everHadCombo,
    athlete:        ['ATHLETE', 'BEAST', 'ELITE', 'SAVAGE', 'LEGEND'].includes(ctx.profile.rank),
    beast:          ['BEAST', 'ELITE', 'SAVAGE', 'LEGEND'].includes(ctx.profile.rank),
    elite:          ['ELITE', 'SAVAGE', 'LEGEND'].includes(ctx.profile.rank),
    savage:         ['SAVAGE', 'LEGEND'].includes(ctx.profile.rank),
    legend:         ctx.profile.rank === 'LEGEND',
    weekly_hero:    hasWeeklyClaim,
    centurion:      todayPts >= 100,
    grinder:        todayCount >= 5,
  };

  // 6. Collect badge keys that are newly unlocked
  const newKeys = Object.entries(conditions)
    .filter(([key, met]) => met && !earnedKeys.has(key))
    .map(([key]) => key);

  if (newKeys.length === 0) return [];

  // 7. Persist to DB — the unique constraint handles any races gracefully
  await supabase
    .from('user_badges')
    .upsert(
      newKeys.map((key) => ({ user_id: userId, badge_key: key })),
      { onConflict: 'user_id,badge_key', ignoreDuplicates: true }
    );

  // 8. Return the full BadgeDef objects so callers can display notifications
  return BADGE_DEFS.filter((b) => newKeys.includes(b.key));
}
