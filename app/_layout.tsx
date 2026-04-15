import { useEffect, useRef } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { useFitRankX } from '../lib/store';
import {
  requestPermissionsAndRegister,
  scheduleStreakReminder,
  showDuelAlert,
} from '../lib/notifications';
import { Duel } from '../types';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({});
  const { loadProfile, reset } = useFitRankX();
  // Keep a ref to the duel subscription so we can clean it up on sign-out
  const duelChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') {
        if (!session) {
          router.replace('/(auth)/login');
          return;
        }

        await loadProfile();
        const profile = useFitRankX.getState().profile;

        if (!profile || profile.age === null) {
          router.replace('/(auth)/onboarding');
        } else {
          router.replace('/(tabs)/');
          // Request notification permissions and store push token
          await requestPermissionsAndRegister(session.user.id);
          // Schedule the daily streak reminder (cancelled automatically
          // when the user logs an activity, re-scheduled on next open)
          await scheduleStreakReminder(profile.streak);
          // Start listening for incoming duel challenges
          subscribeToDuelAlerts(session.user.id);
        }
      } else if (event === 'SIGNED_IN') {
        await loadProfile();
        const profile = useFitRankX.getState().profile;
        if (session) {
          await requestPermissionsAndRegister(session.user.id);
          if (profile) await scheduleStreakReminder(profile.streak);
          subscribeToDuelAlerts(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        teardownDuelSubscription();
        reset();
        router.replace('/(auth)/login');
      }
    });

    return () => {
      subscription.unsubscribe();
      teardownDuelSubscription();
    };
  }, []);

  // ─── Duel subscription helpers ─────────────────────────────────────────

  function subscribeToDuelAlerts(userId: string) {
    // Avoid duplicate subscriptions if called multiple times
    if (duelChannelRef.current) return;

    const channel = supabase
      .channel('duel-alerts')
      .on<Duel>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'duels',
          filter: `challenged_id=eq.${userId}`,
        },
        async (payload) => {
          const duel = payload.new;
          // Fetch the challenger's display name for the notification body
          const { data: challenger } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', duel.challenger_id)
            .single();

          const name = challenger?.username ?? 'Someone';
          await showDuelAlert(name, duel.exercise);
        },
      )
      .subscribe();

    duelChannelRef.current = channel;
  }

  function teardownDuelSubscription() {
    if (duelChannelRef.current) {
      supabase.removeChannel(duelChannelRef.current);
      duelChannelRef.current = null;
    }
  }

  // ───────────────────────────────────────────────────────────────────────

  if (!loaded) return null;

  return (
    <ThemeProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}
