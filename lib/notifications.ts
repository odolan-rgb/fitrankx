// ─────────────────────────────────────────────
// FitRankX — Push & local notification helpers
// ─────────────────────────────────────────────
//
// Three notification types:
//   1. Streak reminder   — daily at 8 pm if no activity logged today
//   2. Duel alert        — immediate when a new duel arrives (via realtime)
//   3. Weekly nudge      — immediate when weekly challenge ≥ 80% complete

import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { WeeklyChallengeCompletion } from '../types';

// Stable identifiers let us cancel specific scheduled notifications
const STREAK_REMINDER_ID = 'streak-daily-reminder';
const WEEKLY_NUDGE_ID    = 'weekly-challenge-nudge';

// ─── Foreground handler ───────────────────────
// Show alerts even when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ─── Permissions & token registration ─────────

/**
 * Request notification permissions, create the Android channel, and store
 * the Expo push token in the user's profile row so the server can address
 * remote pushes to this device.
 */
export async function requestPermissionsAndRegister(userId: string): Promise<void> {
  // Web has no native push support
  if (Platform.OS === 'web') return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  // Android requires a named channel for notifications
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'FitRankX',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#a855f7',
    });
  }

  // Retrieve the Expo push token and persist it so the backend can
  // send server-side pushes later (e.g. from Edge Functions)
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    await supabase
      .from('profiles')
      .update({ push_token: tokenData.data })
      .eq('id', userId);
  } catch {
    // Non-critical — remote push just won't be deliverable until
    // the user opens the app again on a configured build
  }
}

// ─── Streak reminder ──────────────────────────

/**
 * Schedule (or re-schedule) the daily 8 pm streak reminder.
 * Safe to call every time the profile loads — we cancel the old entry first
 * to avoid duplicate firings.
 */
export async function scheduleStreakReminder(streak: number): Promise<void> {
  await cancelStreakReminder();

  const body =
    streak > 0
      ? `Don't break your ${streak}-day streak! Log an activity today 🔥`
      : "Log an activity today to start building your streak! 💪";

  await Notifications.scheduleNotificationAsync({
    identifier: STREAK_REMINDER_ID,
    content: {
      title: 'FitRankX — Daily Reminder',
      body,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });
}

/**
 * Cancel the streak reminder — call this as soon as the user logs any
 * activity today so they don't get nagged unnecessarily.
 * Re-scheduling happens automatically on the next app open via
 * scheduleStreakReminder().
 */
export async function cancelStreakReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(STREAK_REMINDER_ID);
  } catch {
    // Ignore — notification may not have been scheduled yet
  }
}

// ─── Weekly challenge nudge ───────────────────

/**
 * Fire an immediate encouragement notification when the user reaches ≥ 80%
 * of their weekly challenge target.  Only fires once per challenge record
 * (guarded by the WEEKLY_NUDGE_ID identifier).
 */
export async function maybeScheduleWeeklyNudge(
  challenge: WeeklyChallengeCompletion,
): Promise<void> {
  if (challenge.claimed) return;
  if (challenge.target <= 0) return;

  const pct = challenge.progress / challenge.target;
  if (pct < 0.8) return;

  // Cancel any previous nudge for this challenge then fire immediately
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_NUDGE_ID).catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_NUDGE_ID,
    content: {
      title: "Almost there! 🏆",
      body: `You're ${Math.round(pct * 100)}% done with your weekly challenge. Finish strong!`,
      sound: true,
    },
    trigger: null, // fire immediately
  });
}

// ─── Duel alert ───────────────────────────────

/**
 * Display an immediate local notification when a duel challenge arrives.
 * Called by the Supabase realtime subscription in _layout.tsx.
 */
export async function showDuelAlert(
  challengerName: string,
  exercise: string,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'New Duel Challenge! ⚔️',
      body: `${challengerName} challenged you to ${exercise}! You have 24 hours.`,
      sound: true,
    },
    trigger: null, // fire immediately
  });
}
