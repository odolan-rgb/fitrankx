/**
 * send-push — Supabase Edge Function (HTTP trigger)
 *
 * Thin wrapper around the Expo Push Notifications API. Called by the
 * app or other edge functions whenever a push notification needs to go out.
 *
 * POST body:
 *   { pushToken: string, title: string, body: string, data?: object }
 *
 * Responses:
 *   200  { ok: true, ticket: { status: "ok", id: "..." } }
 *   400  { error: "missing required field" }
 *   422  { error: string, details: ExpoErrorDetails }  — Expo rejected the message
 *   500  { error: string }                             — network / unexpected error
 *
 * Required secret:
 *   EXPO_ACCESS_TOKEN — Expo account access token (optional but recommended)
 *   supabase secrets set EXPO_ACCESS_TOKEN=your_token
 *
 * Deploy:
 *   supabase functions deploy send-push
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Expo error detail codes we can map to meaningful HTTP responses
const EXPO_CLIENT_ERRORS = new Set([
  'DeviceNotRegistered',
  'InvalidCredentials',
  'MessageTooBig',
]);

interface PushPayload {
  pushToken: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

async function sendExpoPush(payload: PushPayload): Promise<ExpoTicket> {
  const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip, deflate',
  };
  if (expoAccessToken) {
    headers['Authorization'] = `Bearer ${expoAccessToken}`;
  }

  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      to: payload.pushToken,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      sound: 'default',
    }),
  });

  const json = await res.json();
  // Expo wraps single-send responses in { data: ticket }
  return (json?.data ?? json) as ExpoTicket;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let payload: PushPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { pushToken, title, body, data } = payload;

  if (!pushToken || !title || !body) {
    return new Response(
      JSON.stringify({ error: 'pushToken, title, and body are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Basic Expo token format check
  if (!pushToken.startsWith('ExponentPushToken[') && !pushToken.startsWith('ExpoPushToken[')) {
    return new Response(
      JSON.stringify({ error: 'pushToken must be an Expo push token' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  console.log(`[send-push] Sending "${title}" to ${pushToken.slice(0, 30)}…`);

  let ticket: ExpoTicket;
  try {
    ticket = await sendExpoPush({ pushToken, title, body, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[send-push] Network error calling Expo:', msg);
    return new Response(JSON.stringify({ error: `Expo unreachable: ${msg}` }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (ticket.status === 'error') {
    const errorCode = ticket.details?.error ?? 'Unknown';
    console.error(`[send-push] Expo rejected push. code=${errorCode} msg=${ticket.message}`);

    // DeviceNotRegistered / MessageRateExceeded are client errors — 422 so the
    // caller knows to remove the stale token or back off.
    const status = EXPO_CLIENT_ERRORS.has(errorCode) ? 422 : 500;
    return new Response(
      JSON.stringify({ error: ticket.message, details: ticket.details }),
      { status, headers: { 'Content-Type': 'application/json' } },
    );
  }

  console.log(`[send-push] OK — ticket id: ${ticket.id}`);
  return new Response(
    JSON.stringify({ ok: true, ticket }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
