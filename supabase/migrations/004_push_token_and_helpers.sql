-- FitRankX Migration 004 — Push token column + crew-battle helper RPC
--
-- Adds:
--   profiles.push_token     — Expo push token stored per user
--   complete_crew_battle()  — atomic RPC used by update-crew-battles edge fn

-- ─────────────────────────────────────────────
-- Push token on profiles
-- ─────────────────────────────────────────────
alter table public.profiles
  add column if not exists push_token text;

-- Index for the send-streak-reminders query that filters on NOT NULL push_token
create index if not exists profiles_push_token_idx
  on public.profiles (push_token)
  where push_token is not null;

-- ─────────────────────────────────────────────
-- Atomic crew-battle finalization
-- Called by the update-crew-battles edge function.
-- Marks the battle completed and increments win/loss counters in one
-- transaction so there's no window where totals are inconsistent.
-- ─────────────────────────────────────────────
create or replace function public.complete_crew_battle(
  p_battle_id     uuid,
  p_winner_crew_id uuid,
  p_loser_crew_id  uuid
) returns void
language plpgsql
security definer
as $$
begin
  -- Mark battle as completed with winner
  update public.crew_battles
  set
    status          = 'completed',
    winner_crew_id  = p_winner_crew_id
  where id = p_battle_id;

  -- Increment winner's win count
  update public.crews
  set wins = wins + 1
  where id = p_winner_crew_id;

  -- Increment loser's loss count
  update public.crews
  set losses = losses + 1
  where id = p_loser_crew_id;
end;
$$;
