/**
 * update-crew-battles — Supabase Edge Function (daily cron)
 *
 * Finds all crew battles where ends_at < now() and status = 'active',
 * resolves the winner (higher pts wins; challenger wins ties), marks the
 * battle completed, and increments wins/losses on the respective crew rows.
 *
 * Runs: daily at 01:00 UTC via config.toml schedule `0 1 * * *`
 *
 * Deploy:
 *   supabase functions deploy update-crew-battles
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cronSecret = Deno.env.get('CRON_SECRET');

Deno.serve(async (req: Request) => {
  if (cronSecret) {
    const auth = req.headers.get('Authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const now = new Date().toISOString();

  console.log(`[update-crew-battles] Running at ${now}`);

  // 1. Fetch all expired active battles
  const { data: expiredBattles, error: fetchError } = await supabase
    .from('crew_battles')
    .select('id, challenger_crew_id, challenged_crew_id, challenger_pts, challenged_pts')
    .eq('status', 'active')
    .lt('ends_at', now);

  if (fetchError) {
    console.error('[update-crew-battles] Failed to fetch battles:', fetchError.message);
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!expiredBattles || expiredBattles.length === 0) {
    console.log('[update-crew-battles] No expired battles to resolve.');
    return new Response(JSON.stringify({ ok: true, resolved: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log(`[update-crew-battles] Resolving ${expiredBattles.length} battle(s)…`);

  let resolved = 0;
  let failed = 0;

  for (const battle of expiredBattles) {
    // Challenger wins on tie
    const challengerWins = battle.challenger_pts >= battle.challenged_pts;
    const winnerCrewId = challengerWins ? battle.challenger_crew_id : battle.challenged_crew_id;
    const loserCrewId = challengerWins ? battle.challenged_crew_id : battle.challenger_crew_id;

    console.log(
      `[update-crew-battles] Battle ${battle.id}: ` +
      `challenger=${battle.challenger_pts}pts vs challenged=${battle.challenged_pts}pts → ` +
      `winner crew ${winnerCrewId}`,
    );

    // Use the complete_crew_battle RPC for an atomic update
    // (see migration 004_push_token_and_helpers.sql)
    const { error: rpcError } = await supabase.rpc('complete_crew_battle', {
      p_battle_id: battle.id,
      p_winner_crew_id: winnerCrewId,
      p_loser_crew_id: loserCrewId,
    });

    if (rpcError) {
      console.error(`[update-crew-battles] Failed to resolve battle ${battle.id}:`, rpcError.message);
      failed++;
    } else {
      resolved++;
    }
  }

  console.log(`[update-crew-battles] Done. resolved=${resolved} failed=${failed}`);

  return new Response(
    JSON.stringify({ ok: true, resolved, failed, total: expiredBattles.length }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
