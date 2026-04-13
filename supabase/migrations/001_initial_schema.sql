-- FitRankX Initial Schema
-- Run this against your Supabase project

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- USERS (extends Supabase auth.users)
-- ─────────────────────────────────────────────
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_emoji text default '🏃',
  squad_code text unique not null default upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  pts integer not null default 0,
  streak integer not null default 0,
  last_active_date date,
  rank text not null default 'ROOKIE',
  theme text not null default 'nova',
  -- biometrics
  age integer,
  gender text check (gender in ('male', 'female', 'other')),
  height_ft integer,
  height_in integer,
  weight_lbs numeric(5,1),
  fitness_goal text check (fitness_goal in ('lose', 'gain', 'maintain', 'endurance')),
  activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read all profiles" on public.profiles
  for select using (true);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', 'user_' || substring(new.id::text, 1, 8)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────
-- ACTIVITIES
-- ─────────────────────────────────────────────
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete cascade not null,
  type text not null check (type in ('walk', 'run', 'workout', 'cycle', 'swim', 'yoga', 'steps')),
  pts_earned integer not null,
  multiplier numeric(3,2) not null default 1.0,
  combo_bonus boolean not null default false,
  logged_at timestamptz not null default now(),
  logged_date date not null default current_date
);

alter table public.activities enable row level security;

create policy "Users can read own activities" on public.activities
  for select using (auth.uid() = user_id);

create policy "Users can insert own activities" on public.activities
  for insert with check (auth.uid() = user_id);

create index activities_user_date on public.activities (user_id, logged_date desc);

-- ─────────────────────────────────────────────
-- DAILY CHALLENGES
-- ─────────────────────────────────────────────
create table public.daily_challenge_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete cascade not null,
  challenge_text text not null,
  pts_earned integer not null default 40,
  completed_at timestamptz not null default now(),
  challenge_date date not null default current_date,
  unique (user_id, challenge_date)
);

alter table public.daily_challenge_completions enable row level security;

create policy "Users can manage own challenge completions" on public.daily_challenge_completions
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- WEEKLY CHALLENGES
-- ─────────────────────────────────────────────
create table public.weekly_challenge_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete cascade not null,
  week_start date not null,
  challenge_type text not null,
  challenge_desc text not null,
  target integer not null,
  progress integer not null default 0,
  pts_earned integer not null default 200,
  claimed boolean not null default false,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

alter table public.weekly_challenge_completions enable row level security;

create policy "Users can manage own weekly challenges" on public.weekly_challenge_completions
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- BADGES
-- ─────────────────────────────────────────────
create table public.badges (
  key text primary key,
  name text not null,
  description text not null,
  emoji text not null,
  sort_order integer not null default 0
);

-- Seed badges (matching HTML prototype)
insert into public.badges (key, name, description, emoji, sort_order) values
  ('first_step',     'First Step',      'Log your first walk',                          '👟', 1),
  ('on_fire',        'On Fire',         '3-day streak',                                 '🔥', 2),
  ('week_warrior',   'Week Warrior',    '7-day streak',                                 '⚔️', 3),
  ('iron_will',      '14 Days Iron',    '14-day streak',                                '🛡️', 4),
  ('monthly_legend', 'Monthly Legend',  '30-day streak',                                '👑', 5),
  ('swimmer',        'Swimmer',         'Log a swim session',                           '🏊', 6),
  ('cyclist',        'Cyclist',         'Log a cycle session',                          '🚴', 7),
  ('yogi',           'Yogi',            'Log a yoga session',                           '🧘', 8),
  ('combo_king',     'Combo King',      'Hit the cardio combo bonus',                   '💥', 9),
  ('athlete',        'Athlete',         'Reach ATHLETE rank',                           '🏅', 10),
  ('beast',          'Beast Mode',      'Reach BEAST rank',                             '🦁', 11),
  ('elite',          'Elite',           'Reach ELITE rank',                             '💎', 12),
  ('savage',         'Savage',          'Reach SAVAGE rank',                            '⚡', 13),
  ('legend',         'Legend',          'Reach LEGEND rank',                            '🌟', 14),
  ('weekly_hero',    'Weekly Hero',     'Complete a weekly challenge',                  '🏆', 15),
  ('centurion',      'Centurion',       'Earn 100 points in one day',                   '💯', 16),
  ('grinder',        'Grinder',         'Log 5 activities in one day',                  '⚙️', 17);

alter table public.badges enable row level security;

create policy "Anyone can read badges" on public.badges
  for select using (true);

-- ─────────────────────────────────────────────
-- USER BADGES
-- ─────────────────────────────────────────────
create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete cascade not null,
  badge_key text references public.badges on delete cascade not null,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_key)
);

alter table public.user_badges enable row level security;

create policy "Users can read own badges" on public.user_badges
  for select using (auth.uid() = user_id);

create policy "Users can insert own badges" on public.user_badges
  for insert with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- FRIENDS
-- ─────────────────────────────────────────────
create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid references public.profiles on delete cascade not null,
  to_user_id uuid references public.profiles on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (from_user_id, to_user_id)
);

alter table public.friend_requests enable row level security;

create policy "Users can manage own friend requests" on public.friend_requests
  for all using (auth.uid() = from_user_id or auth.uid() = to_user_id);

-- Convenience view: accepted friendships
create view public.friends as
  select from_user_id as user_id, to_user_id as friend_id from public.friend_requests where status = 'accepted'
  union
  select to_user_id as user_id, from_user_id as friend_id from public.friend_requests where status = 'accepted';

-- ─────────────────────────────────────────────
-- WEIGHT LOG
-- ─────────────────────────────────────────────
create table public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete cascade not null,
  weight_lbs numeric(5,1) not null,
  logged_at timestamptz not null default now(),
  logged_date date not null default current_date
);

alter table public.weight_logs enable row level security;

create policy "Users can manage own weight logs" on public.weight_logs
  for all using (auth.uid() = user_id);

create index weight_logs_user_date on public.weight_logs (user_id, logged_date desc);

-- ─────────────────────────────────────────────
-- PLANS (goal tracker)
-- ─────────────────────────────────────────────
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete cascade not null,
  name text not null,
  goal text not null,
  target_date date,
  created_at timestamptz not null default now()
);

alter table public.plans enable row level security;

create policy "Users can manage own plans" on public.plans
  for all using (auth.uid() = user_id);

create table public.plan_milestones (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.plans on delete cascade not null,
  text text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  sort_order integer not null default 0
);

alter table public.plan_milestones enable row level security;

create policy "Users can manage own milestones" on public.plan_milestones
  for all using (
    exists (select 1 from public.plans where id = plan_id and user_id = auth.uid())
  );

create table public.plan_log_entries (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.plans on delete cascade not null,
  entry text not null,
  created_at timestamptz not null default now()
);

alter table public.plan_log_entries enable row level security;

create policy "Users can manage own plan logs" on public.plan_log_entries
  for all using (
    exists (select 1 from public.plans where id = plan_id and user_id = auth.uid())
  );

-- ─────────────────────────────────────────────
-- TIMED CHALLENGES (Battle tab)
-- ─────────────────────────────────────────────
create table public.timed_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete cascade not null,
  exercise text not null,
  duration_seconds integer not null,
  reps integer not null,
  score integer generated always as (reps) stored,
  recorded_at timestamptz not null default now()
);

alter table public.timed_scores enable row level security;

create policy "Users can manage own timed scores" on public.timed_scores
  for all using (auth.uid() = user_id);

create policy "Users can read others timed scores for leaderboard" on public.timed_scores
  for select using (true);

-- ─────────────────────────────────────────────
-- DUELS
-- ─────────────────────────────────────────────
create table public.duels (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid references public.profiles on delete cascade not null,
  challenged_id uuid references public.profiles on delete cascade not null,
  exercise text not null,
  duration_seconds integer,
  challenger_reps integer,
  challenged_reps integer,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'completed', 'declined', 'expired')),
  winner_id uuid references public.profiles,
  pts_reward integer not null default 50,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  completed_at timestamptz
);

alter table public.duels enable row level security;

create policy "Users can manage own duels" on public.duels
  for all using (auth.uid() = challenger_id or auth.uid() = challenged_id);

-- ─────────────────────────────────────────────
-- CREWS
-- ─────────────────────────────────────────────
create table public.crews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text default '⚔️',
  created_by uuid references public.profiles on delete cascade not null,
  wins integer not null default 0,
  losses integer not null default 0,
  total_pts integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.crews enable row level security;

create policy "Anyone can read crews" on public.crews
  for select using (true);

create policy "Crew creator can update crew" on public.crews
  for update using (auth.uid() = created_by);

create policy "Authenticated users can create crews" on public.crews
  for insert with check (auth.uid() = created_by);

create table public.crew_members (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid references public.crews on delete cascade not null,
  user_id uuid references public.profiles on delete cascade not null,
  role text not null default 'member' check (role in ('captain', 'member')),
  joined_at timestamptz not null default now(),
  unique (crew_id, user_id)
);

alter table public.crew_members enable row level security;

create policy "Anyone can read crew members" on public.crew_members
  for select using (true);

create policy "Users can manage own crew membership" on public.crew_members
  for all using (auth.uid() = user_id);

create table public.crew_battles (
  id uuid primary key default gen_random_uuid(),
  challenger_crew_id uuid references public.crews on delete cascade not null,
  challenged_crew_id uuid references public.crews on delete cascade not null,
  challenger_pts integer not null default 0,
  challenged_pts integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'active', 'completed')),
  winner_crew_id uuid references public.crews,
  battle_date date not null default current_date,
  ends_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

alter table public.crew_battles enable row level security;

create policy "Anyone can read crew battles" on public.crew_battles
  for select using (true);

-- ─────────────────────────────────────────────
-- REALTIME - enable for leaderboard
-- ─────────────────────────────────────────────
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.activities;
alter publication supabase_realtime add table public.duels;
alter publication supabase_realtime add table public.crew_battles;
