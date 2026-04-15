// ─────────────────────────────────────────────
// FitRankX — Core Types
// ─────────────────────────────────────────────

export type ActivityType = 'walk' | 'run' | 'workout' | 'cycle' | 'swim' | 'yoga' | 'steps';

export type Rank = 'ROOKIE' | 'ATHLETE' | 'BEAST' | 'ELITE' | 'SAVAGE' | 'LEGEND';

export type Theme = 'nova' | 'cyber' | 'solar' | 'phantom' | 'crimson';

export type FitnessGoal = 'lose' | 'gain' | 'maintain' | 'endurance';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export type Gender = 'male' | 'female' | 'other';

export type DuelStatus = 'pending' | 'accepted' | 'completed' | 'declined' | 'expired';

export type CrewBattleStatus = 'pending' | 'active' | 'completed';

// ─────────────────────────────────────────────
// Database row types (mirrors Supabase schema)
// ─────────────────────────────────────────────

export interface Profile {
  id: string;
  username: string;
  avatar_emoji: string;
  squad_code: string;
  pts: number;
  streak: number;
  last_active_date: string | null;
  rank: Rank;
  theme: Theme;
  age: number | null;
  gender: Gender | null;
  height_ft: number | null;
  height_in: number | null;
  weight_lbs: number | null;
  fitness_goal: FitnessGoal | null;
  activity_level: ActivityLevel | null;
  user_timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  user_id: string;
  type: ActivityType;
  pts_earned: number;
  multiplier: number;
  combo_bonus: boolean;
  logged_at: string;
  logged_date: string;
}

export interface Badge {
  key: string;
  name: string;
  description: string;
  emoji: string;
  sort_order: number;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_key: string;
  earned_at: string;
  badge?: Badge;
}

export interface WeightLog {
  id: string;
  user_id: string;
  weight_lbs: number;
  logged_at: string;
  logged_date: string;
}

export interface Plan {
  id: string;
  user_id: string;
  name: string;
  goal: string;
  target_date: string | null;
  created_at: string;
  milestones?: PlanMilestone[];
  log_entries?: PlanLogEntry[];
}

export interface PlanMilestone {
  id: string;
  plan_id: string;
  text: string;
  completed: boolean;
  completed_at: string | null;
  sort_order: number;
}

export interface PlanLogEntry {
  id: string;
  plan_id: string;
  entry: string;
  created_at: string;
}

export interface TimedScore {
  id: string;
  user_id: string;
  exercise: string;
  duration_seconds: number;
  reps: number;
  score: number;
  recorded_at: string;
}

export interface Duel {
  id: string;
  challenger_id: string;
  challenged_id: string;
  exercise: string;
  duration_seconds: number | null;
  challenger_reps: number | null;
  challenged_reps: number | null;
  status: DuelStatus;
  winner_id: string | null;
  pts_reward: number;
  created_at: string;
  expires_at: string;
  completed_at: string | null;
  challenger?: Profile;
  challenged?: Profile;
}

export interface Crew {
  id: string;
  name: string;
  emoji: string;
  created_by: string;
  wins: number;
  losses: number;
  total_pts: number;
  created_at: string;
  members?: CrewMember[];
}

export interface CrewMember {
  id: string;
  crew_id: string;
  user_id: string;
  role: 'captain' | 'member';
  joined_at: string;
  profile?: Profile;
}

export interface CrewBattle {
  id: string;
  challenger_crew_id: string;
  challenged_crew_id: string;
  challenger_pts: number;
  challenged_pts: number;
  status: CrewBattleStatus;
  winner_crew_id: string | null;
  battle_date: string;
  ends_at: string;
  created_at: string;
  challenger_crew?: Crew;
  challenged_crew?: Crew;
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined';

export interface FriendRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: FriendRequestStatus;
  created_at: string;
  updated_at: string;
}

export interface DailyChallengeCompletion {
  id: string;
  user_id: string;
  challenge_text: string;
  pts_earned: number;
  completed_at: string;
  challenge_date: string;
}

export interface WeeklyChallengeCompletion {
  id: string;
  user_id: string;
  week_start: string;
  challenge_type: string;
  challenge_desc: string;
  target: number;
  progress: number;
  pts_earned: number;
  claimed: boolean;
  claimed_at: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────
// App state types (Zustand)
// ─────────────────────────────────────────────

export interface AppState {
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
  isLoading: boolean;
  error: string | null;
}
