/**
 * send-streak-reminders — Supabase Edge Function (daily cron)
 *
 * Runs every evening at 19:00 UTC. Finds all users who have a push token
 * but haven't logged any activity today, then sends each a streak-reminder
 * push notification via the Expo Push API.
 *
 * Runs: daily at 7 pm UTC via config.toml schedule `0 19 * * *`
 *
 * Deploy:
 *   supabase functions deploy send-streak-reminders
 *
 * Depends on:
 *   - profiles.push_token column (migration 004)
 *   - EXPO_ACCESS_TOKEN secret (optional but recommended)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cronSecret = Deno.env.get('CRON_SECRET');
const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN');

// Send a single push via Expo. Returns true on success.
async function sendPush(
  pushToken: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {},
): Promise<boolean> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip, deflate',
  };
  if (expoAccessToken) headers['Authorization'] = `Bearer ${expoAccessToken}`;

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ to: pushToken, title, body, data, sound: 'default' }),
    });
    const json = await res.json();
    const ticket = json?.data ?? json;
    if (ticket?.status === 'error') {
      console.warn(`[send-streak-reminders] Expo error for ${pushToken.slice(0, 20)}…: ${ticket.message}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[send-streak-reminders] Network error for ${pushToken.slice(0, 20)}…:`, err);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (cronSecret) {
    const auth = req.headers.get('Authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const today = new Date().toISOString().split('T')[0];

  console.log(`[send-streak-reminders] Running for date ${today}`);

  // 1. Fetch all users with a push token
  const { data: usersWithTokens, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, streak, push_token')
    .not('push_token', 'is', null);

  if (profilesError) {
    console.error('[send-streak-reminders] Failed to fetch profiles:', profilesError.message);
    return new Response(JSON.stringify({ error: profilesError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!usersWithTokens || usersWithTokens.length === 0) {
    console.log('[send-streak-reminders] No users with push tokens. Exiting.');
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Find which users already logged an activity today
  const { data: activeToday, error: actError } = await supabase
    .from('activities')
    .select('user_id')
    .eq('logged_date', today);

  if (actError) {
    console.error('[send-streak-reminders] Failed to fetch today activities:', actError.message);
    return new Response(JSON.stringify({ error: actError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const activeTodayIds = new Set((activeToday ?? []).map((a: { user_id: string }) => a.user_id));

  // 3. Filter to dormant users only
  const dormant = usersWithTokens.filter(
    (u: { id: string }) => !activeTodayIds.has(u.id),
  );

  console.log(
    `[send-streak-reminders] ${usersWithTokens.length} users with tokens, ` +
    `${activeTodayIds.size} active today, ${dormant.length} reminder(s) to send.`,
  );

  if (dormant.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 4. Send a reminder to each dormant user
  let sent = 0;
  let failed = 0;

  for (const user of dormant) {
    const streakDays = user.streak as number;
    const streakLine =
      streakDays > 0
        ? `Don't break your ${streakDays}-day streak!`
        : 'Start your streak today!';

    const ok = await sendPush(
      user.push_token as string,
      '🔥 Log an activity today',
      streakLine,
      { screen: 'home', userId: user.id },
    );

    if (ok) sent++;
    else failed++;
  }

  console.log(`[send-streak-reminders] Done. sent=${sent} failed=${failed}`);

  return new Response(
    JSON.stringify({ ok: true, sent, failed, total_eligible: dormant.length }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
