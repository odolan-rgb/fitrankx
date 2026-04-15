/**
 * reset-streaks — Supabase Edge Function (daily cron)
 *
 * Resets streak to 0 for any user whose last_active_date is older than
 * yesterday (i.e. they didn't log an activity today or yesterday).
 *
 * Runs: daily at midnight UTC via config.toml schedule `0 0 * * *`
 *
 * Invoke manually:
 *   supabase functions invoke reset-streaks \
 *     --header "Authorization: Bearer $CRON_SECRET"
 *
 * Deploy:
 *   supabase functions deploy reset-streaks
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cronSecret = Deno.env.get('CRON_SECRET');

Deno.serve(async (req: Request) => {
  // Guard: only allow requests with the cron secret (when configured)
  if (cronSecret) {
    const auth = req.headers.get('Authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Compute yesterday as an ISO date string (YYYY-MM-DD) in UTC
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayISO = yesterday.toISOString().split('T')[0];

  const runAt = new Date().toISOString();
  console.log(`[reset-streaks] Running at ${runAt}. Resetting streaks for users inactive before ${yesterdayISO}.`);

  // Reset streaks and return affected rows so we can log the count.
  // Service role key bypasses RLS; .select('id') turns the UPDATE into
  // UPDATE … RETURNING id, giving us back which rows were affected.
  const { data: reset, error } = await supabase
    .from('profiles')
    .update({ streak: 0 })
    .lt('last_active_date', yesterdayISO)
    .gt('streak', 0)
    .select('id');

  if (error) {
    console.error('[reset-streaks] Update failed:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const resetCount = reset?.length ?? 0;
  console.log(`[reset-streaks] Done. Reset ${resetCount} streak(s).`);

  return new Response(
    JSON.stringify({ ok: true, reset_count: resetCount, run_at: runAt }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
