# FitRankX — Claude Context

## What this app is
Gamified fitness mobile app. Users log activities to earn points, climb ranks (ROOKIE → LEGEND), maintain streaks, and compete socially through duels and crew battles.

Stack: Expo + React Native + TypeScript + Supabase + Zustand + NativeWind.

## Product decisions (locked)

### Social + gamification both, not either/or
The app is social-first with solo gamification as the foundation. Friends can see each other's progress. Duels (1v1) and Crew battles are core features, not stretch.

### Onboarding philosophy: let them browse the store first
New users should be able to get into the app and look around immediately — like walking into a store before a salesperson asks for your details. Zero friction at signup beyond username + password.

- Onboarding after signup is **optional and skippable at every step**. Each biometric step has a "Skip for now →" link. The wizard can be exited at any point and completed later from the Profile screen.
- The app should feel immediately usable even with zero biometrics filled in. Show placeholder states, not locked screens.
- Bait with the experience: let them see the rank system, the leaderboard, the battle screen — *then* ask for data when they want to use a specific feature.

### Feature gating via health data
Biometrics are collected progressively — requested at the moment they're needed, not upfront:
- Duels prompt "Complete your profile to unlock Duels" inline on the duel screen — not at onboarding
- BMI/BMR/TDEE on Profile only renders once data exists, with a soft nudge to fill it in
- Never block navigation or show a hard gate on the main tabs

### Notifications: post-launch
Push notifications (streak reminders, duel alerts) are deferred. Don't build Supabase Edge Functions or cron infrastructure for this until after launch.

### Health integration (Apple Health / Google Fit): post-launch
Not in scope for v1.

## Stretch goals
- **Friend bets**: Users can wager points on duel outcomes. Loser's points transfer to winner. Requires: bet proposal UI, acceptance flow, escrow logic (hold pts during duel), resolution on duel completion. Keep the Duel schema extensible for a `wager_pts` column.

## Build order (agreed)
1. Supabase env + auth persistence
2. Streak engine fix + badge system
3. Home screen (daily challenge, points animation)
4. Onboarding (lightweight — username, avatar, skip biometrics)
5. Profile biometrics (fill-in-later, gates duels)
6. Weight tracking
7. Plan screen
8. Leaderboard (friends tab + real-time)
9. Battle timer
10. Duels (gated behind biometrics)
11. Crews
12. Shared component library (refactor when duplication hurts)

## Key files
- `constants/game.ts` — all game logic, THEMES, RANKS, ACTIVITIES, BADGE_DEFS
- `lib/store.ts` — Zustand store, all Supabase mutations
- `lib/theme.tsx` — ThemeContext, useTheme(), ThemeProvider (wraps root layout)
- `types/index.ts` — all TypeScript interfaces mirroring Supabase schema
- `supabase/migrations/` — DB schema
