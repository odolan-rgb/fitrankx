import { create } from 'zustand';
import { supabase } from './supabase';
import {
  Profile, Activity, UserBadge, WeightLog, Plan,
  TimedScore, Duel, Crew, DailyChallengeCompletion,
  WeeklyChallengeCompletion, ActivityType,
} from '../types';
import {
  ACTIVITY_MAP, COMBO_BONUS_PTS, COMBO_CARDIO_THRESHOLD,
  getStreakMultiplier, DAILY_CHALLENGE_PTS,
  getStreakMultiplier, getRankForPts, DAILY_CHALLENGE_PTS, BadgeDef,
} from '../constants/game';
import { checkAndAwardBadges } from './badges';

// ─────────────────────────────────────────────
// State shape
// ─────────────────────────────────────────────

interface FitRankXState {
  // Data
  profile: Profile | null;
  todayActivities: Activity[];
  badges: UserBadge[];
  weightLogs: WeightLog[];
  plans: Plan[];
  timedScores: TimedScore[];
  duels: Duel[];
  crew: Crew | null;
  todayChallenge: DailyChallengeCompletion | null;
  weeklyChallenge: WeeklyChallengeCompletion | null;

  // UI state
  isLoading: boolean;
  error: string | null;
  pendingBadges: BadgeDef[];

  // Actions
  loadProfile: () => Promise<void>;
  logActivity: (type: ActivityType) => Promise<{ ptsEarned: number; comboBonus: boolean } | null>;
  clearPendingBadges: () => void;
  completeDailyChallenge: (challengeText: string) => Promise<void>;
  loadTodayChallenge: () => Promise<void>;
  logWeight: (weightLbs: number) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  loadTodayActivities: () => Promise<void>;
  loadWeightLogs: () => Promise<void>;
  loadBadges: () => Promise<void>;
  // Plan actions
  loadPlans: () => Promise<void>;
  createPlan: (name: string, goal: string, targetDate: string | null, milestoneTexts: string[]) => Promise<Plan | null>;
  toggleMilestone: (milestoneId: string, completed: boolean) => Promise<void>;
  addJournalEntry: (planId: string, entry: string) => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
  reset: () => void;
}

// ─────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────

export const useFitRankX = create<FitRankXState>((set, get) => ({
  profile: null,
  todayActivities: [],
  badges: [],
  weightLogs: [],
  plans: [],
  timedScores: [],
  duels: [],
  crew: null,
  todayChallenge: null,
  weeklyChallenge: null,
  isLoading: false,
  error: null,
  pendingBadges: [],

  loadProfile: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      set({ error: error.message });
      return;
    }
    set({ profile: data });
  },

  loadTodayActivities: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', user.id)
      .eq('logged_date', today)
      .order('logged_at', { ascending: false });

    set({ todayActivities: data ?? [] });
  },

  logActivity: async (type: ActivityType) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const state = get();
    const profile = state.profile;
    if (!profile) return null;

    const actDef = ACTIVITY_MAP[type];
    const multiplier = getStreakMultiplier(profile.streak);
    const basePts = actDef.pts;

    // Check for cardio combo bonus
    const todayCardio = state.todayActivities.filter(a => ACTIVITY_MAP[a.type]?.isCardio);
    const comboBonus =
      actDef.isCardio &&
      todayCardio.length >= COMBO_CARDIO_THRESHOLD - 1 &&
      !state.todayActivities.some(a => a.combo_bonus);

    const ptsEarned = Math.round(basePts * multiplier) + (comboBonus ? COMBO_BONUS_PTS : 0);

    // Derive local date for correct timezone-aware streak calculation
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Insert activity
    const { data: activity, error: actError } = await supabase
      .from('activities')
      .insert({
        user_id: user.id,
        type,
        pts_earned: ptsEarned,
        multiplier,
        combo_bonus: comboBonus,
        logged_date: today,
      })
      .select()
      .single();

    if (actError) {
      set({ error: actError.message });
      return null;
    }

    // Update streak server-side — tamper-proof Postgres function
    await supabase.rpc('update_streak', {
      p_user_id: user.id,
      p_activity_date: today,
    });

    // Update pts and rank
    const newPts = profile.pts + ptsEarned;

    await supabase
      .from('profiles')
      .update({ pts: newPts })
      .eq('id', user.id);

    // Refresh state
    await Promise.all([
      get().loadProfile(),
      get().loadTodayActivities(),
    ]);

    // Check and award any newly unlocked badges
    const updatedProfile = get().profile;
    const updatedActivities = get().todayActivities;
    if (updatedProfile) {
      const newBadges = await checkAndAwardBadges(user.id, {
        profile: updatedProfile,
        todayActivities: updatedActivities,
      });
      if (newBadges.length > 0) {
        await get().loadBadges();
        set({ pendingBadges: newBadges });
      }
    }

    return { ptsEarned, comboBonus };
  },

  completeDailyChallenge: async (challengeText: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('daily_challenge_completions')
      .insert({
        user_id: user.id,
        challenge_text: challengeText,
        pts_earned: DAILY_CHALLENGE_PTS,
        challenge_date: today,
      })
      .select()
      .single();

    if (error) {
      set({ error: error.message });
      return;
    }

    // Add pts to profile
    const profile = get().profile;
    if (profile) {
      await supabase
        .from('profiles')
        .update({ pts: profile.pts + DAILY_CHALLENGE_PTS })
        .eq('id', user.id);
    }

    set({ todayChallenge: data });
    await get().loadProfile();
  },

  loadTodayChallenge: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('daily_challenge_completions')
      .select('*')
      .eq('user_id', user.id)
      .eq('challenge_date', today)
      .maybeSingle();

    set({ todayChallenge: data ?? null });
  },

  logWeight: async (weightLbs: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('weight_logs')
      .insert({ user_id: user.id, weight_lbs: weightLbs });

    if (error) {
      set({ error: error.message });
      return;
    }

    await get().loadWeightLogs();
  },

  loadWeightLogs: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('logged_date', { ascending: false })
      .limit(20);

    set({ weightLogs: data ?? [] });
  },

  loadBadges: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_badges')
      .select('*, badge:badges(*)')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false });

    set({ badges: data ?? [] });
  },

  updateProfile: async (updates: Partial<Profile>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      set({ error: error.message });
      return;
    }

    await get().loadProfile();
  },

  clearPendingBadges: () => set({ pendingBadges: [] }),

  // ─── Plan actions ──────────────────────────

  loadPlans: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('plans')
      .select('*, milestones:plan_milestones(*), log_entries:plan_log_entries(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) { set({ error: error.message }); return; }

    const plans = (data ?? []).map(p => ({
      ...p,
      milestones: (p.milestones ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
      log_entries: (p.log_entries ?? []).sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    }));
    set({ plans });
  },

  createPlan: async (name, goal, targetDate, milestoneTexts) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: plan, error: planError } = await supabase
      .from('plans')
      .insert({ user_id: user.id, name, goal, target_date: targetDate })
      .select()
      .single();

    if (planError) { set({ error: planError.message }); return null; }

    if (milestoneTexts.length > 0) {
      await supabase.from('plan_milestones').insert(
        milestoneTexts.map((text, i) => ({ plan_id: plan.id, text, sort_order: i }))
      );
    }

    await get().loadPlans();
    return plan;
  },

  toggleMilestone: async (milestoneId, completed) => {
    const { error } = await supabase
      .from('plan_milestones')
      .update({ completed, completed_at: completed ? new Date().toISOString() : null })
      .eq('id', milestoneId);

    if (!error) await get().loadPlans();
  },

  addJournalEntry: async (planId, entry) => {
    const { error } = await supabase
      .from('plan_log_entries')
      .insert({ plan_id: planId, entry });

    if (!error) await get().loadPlans();
  },

  deletePlan: async (planId) => {
    const { error } = await supabase.from('plans').delete().eq('id', planId);
    if (!error) await get().loadPlans();
  },

  reset: () => set({
    profile: null,
    todayActivities: [],
    badges: [],
    weightLogs: [],
    plans: [],
    timedScores: [],
    duels: [],
    crew: null,
    todayChallenge: null,
    weeklyChallenge: null,
    pendingBadges: [],
    error: null,
  }),
}));
