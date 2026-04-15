// ─────────────────────────────────────────────
// FitRankX — Weekly Challenge Service
// ─────────────────────────────────────────────

import { supabase } from './supabase';
import { WEEKLY_CHALLENGES } from '../constants/game';
import { WeeklyChallengeCompletion } from '../types';

// ─── Date helpers ─────────────────────────────

/** ISO date string (YYYY-MM-DD) of the Monday that starts the current week. */
function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun, 1 = Mon … 6 = Sat
  const daysToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now.getTime() - daysToMonday * 86_400_000);
  return monday.toISOString().split('T')[0];
}

/** ISO date string of the Monday *after* the given week start (exclusive upper bound). */
function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().split('T')[0];
}

/**
 * Approximate week-of-year index used to deterministically seed the
 * challenge type so every user gets the same type each week.
 */
function getWeekSeed(): number {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  return Math.floor((now.getTime() - yearStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

// ─── Public API ───────────────────────────────

/**
 * Returns the current week's challenge row for the user, creating one if it
 * doesn't exist. The challenge type is seeded by week number so it rotates
 * consistently for all users.
 */
export async function getOrCreateWeeklyChallenge(
  userId: string
): Promise<WeeklyChallengeCompletion | null> {
  const weekStart = getWeekStart();

  const { data: existing } = await supabase
    .from('weekly_challenge_completions')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle();

  if (existing) return existing;

  const def = WEEKLY_CHALLENGES[getWeekSeed() % WEEKLY_CHALLENGES.length];
  const desc = def.desc.replace('{target}', String(def.target));

  const { data: created, error } = await supabase
    .from('weekly_challenge_completions')
    .insert({
      user_id: userId,
      week_start: weekStart,
      challenge_type: def.type,
      challenge_desc: desc,
      target: def.target,
      progress: 0,
      pts_earned: def.pts,
    })
    .select()
    .single();

  if (error) return null;
  return created;
}

/**
 * Recalculates progress for the current week's challenge by querying
 * relevant activity / challenge rows, then updates the DB record.
 *
 * Returns the updated (or unchanged, if already claimed) record.
 */
export async function updateWeeklyChallengeProgress(
  userId: string
): Promise<WeeklyChallengeCompletion | null> {
  const weekStart = getWeekStart();

  const { data: challenge } = await supabase
    .from('weekly_challenge_completions')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle();

  if (!challenge) return null;
  // Don't touch an already-claimed row
  if (challenge.claimed) return challenge;

  const weekEnd = getWeekEnd(weekStart);
  let progress = 0;

  switch (challenge.challenge_type) {
    case 'activities': {
      const { count } = await supabase
        .from('activities')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('logged_date', weekStart)
        .lt('logged_date', weekEnd);
      progress = count ?? 0;
      break;
    }

    case 'points': {
      // Activities pts
      const { data: acts } = await supabase
        .from('activities')
        .select('pts_earned')
        .eq('user_id', userId)
        .gte('logged_date', weekStart)
        .lt('logged_date', weekEnd);
      const actPts = (acts ?? []).reduce((s, a) => s + a.pts_earned, 0);

      // Daily challenge pts
      const { data: dailies } = await supabase
        .from('daily_challenge_completions')
        .select('pts_earned')
        .eq('user_id', userId)
        .gte('challenge_date', weekStart)
        .lt('challenge_date', weekEnd);
      const dailyPts = (dailies ?? []).reduce((s, d) => s + d.pts_earned, 0);

      progress = actPts + dailyPts;
      break;
    }

    case 'days': {
      const { data: acts } = await supabase
        .from('activities')
        .select('logged_date')
        .eq('user_id', userId)
        .gte('logged_date', weekStart)
        .lt('logged_date', weekEnd);
      progress = new Set((acts ?? []).map((a) => a.logged_date)).size;
      break;
    }

    case 'challenges': {
      const { count } = await supabase
        .from('daily_challenge_completions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('challenge_date', weekStart)
        .lt('challenge_date', weekEnd);
      progress = count ?? 0;
      break;
    }

    case 'combo': {
      const { count } = await supabase
        .from('activities')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('combo_bonus', true)
        .gte('logged_date', weekStart)
        .lt('logged_date', weekEnd);
      progress = count ?? 0;
      break;
    }
  }

  // Cap at target so progress never overshoots
  const capped = Math.min(progress, challenge.target);

  const { data: updated } = await supabase
    .from('weekly_challenge_completions')
    .update({ progress: capped })
    .eq('id', challenge.id)
    .select()
    .single();

  return updated ?? { ...challenge, progress: capped };
}

/**
 * Marks the current week's challenge as claimed and awards pts_earned to the
 * user's profile. Only succeeds if progress >= target and not yet claimed.
 *
 * Returns true on success, false if conditions aren't met.
 */
export async function claimWeeklyReward(userId: string): Promise<boolean> {
  const weekStart = getWeekStart();

  const { data: challenge } = await supabase
    .from('weekly_challenge_completions')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle();

  if (!challenge || challenge.claimed || challenge.progress < challenge.target) {
    return false;
  }

  await supabase
    .from('weekly_challenge_completions')
    .update({ claimed: true, claimed_at: new Date().toISOString() })
    .eq('id', challenge.id);

  const { data: profile } = await supabase
    .from('profiles')
    .select('pts')
    .eq('id', userId)
    .single();

  if (profile) {
    await supabase
      .from('profiles')
      .update({ pts: profile.pts + challenge.pts_earned })
      .eq('id', userId);
  }

  return true;
}
