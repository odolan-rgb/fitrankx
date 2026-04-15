-- FitRankX Migration 004 — Push notification token storage
-- Adds push_token column to profiles so the server can send
-- push notifications via Expo's push service.

alter table public.profiles
  add column if not exists push_token text;
