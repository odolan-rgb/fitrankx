-- FitRankX Migration 002 — Robust streak engine
-- Moves streak calculation server-side to prevent client tampering
-- and adds timezone support for correct date boundaries.

-- ─────────────────────────────────────────────
-- Add user_timezone to profiles
-- ─────────────────────────────────────────────
alter table public.profiles
  add column if not exists user_timezone text not null default 'UTC';

-- ─────────────────────────────────────────────
-- SERVER-SIDE STREAK UPDATE
-- Called via RPC from logActivity() instead of client-side calculation.
-- The client passes its local date so timezone is respected.
-- ─────────────────────────────────────────────
create or replace function public.update_streak(p_user_id uuid, p_activity_date date)
returns void as $$
declare
  current_profile profiles%rowtype;
begin
  select * into current_profile from profiles where id = p_user_id;

  if current_profile.last_active_date = p_activity_date then
    -- Same day: no streak change
    return;
  elsif current_profile.last_active_date = p_activity_date - 1 then
    -- Consecutive day: extend streak
    update public.profiles
      set streak = streak + 1,
          last_active_date = p_activity_date
      where id = p_user_id;
  else
    -- Streak broken or first activity ever
    update public.profiles
      set streak = 1,
          last_active_date = p_activity_date
      where id = p_user_id;
  end if;
end;
$$ language plpgsql security definer;

-- ─────────────────────────────────────────────
-- DAILY CRON: RESET MISSED STREAKS
-- Zeros out streaks for users who didn't log yesterday.
-- Called once per day by the reset-streaks Edge Function.
-- ─────────────────────────────────────────────
create or replace function public.reset_missed_streaks()
returns void as $$
begin
  update public.profiles
  set streak = 0
  where streak > 0
    and last_active_date < current_date - 1;
end;
$$ language plpgsql security definer;
