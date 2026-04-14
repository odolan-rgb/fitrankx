/**
 * reset-streaks — Supabase Edge Function
 *
 * Calls reset_missed_streaks() once per day to zero out streaks for users
 * who did not log an activity yesterday.
 *
 * Schedule this via Supabase Dashboard → Edge Functions → Schedule
 * or pg_cron:
 *   select cron.schedule('reset-streaks', '0 2 * * *', $$ select net.http_post(...) $$);
 *
 * Invoke manually:
 *   supabase functions invoke reset-streaks --header "Authorization: Bearer $CRON_SECRET"
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cronSecret = Deno.env.get('CRON_SECRET');

Deno.serve(async (req: Request) => {
  // Reject requests without the correct bearer token
  if (cronSecret) {
    const auth = req.headers.get('Authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { error } = await supabase.rpc('reset_missed_streaks');

  if (error) {
    console.error('reset_missed_streaks failed:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log('reset_missed_streaks completed successfully');
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
