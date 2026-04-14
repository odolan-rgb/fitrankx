import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from '../lib/supabase';
import { useFitRankX } from '../lib/store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({});
  const { loadProfile, reset } = useFitRankX();

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
        }
      } else if (event === 'SIGNED_IN') {
        loadProfile();
      } else if (event === 'SIGNED_OUT') {
        reset();
        router.replace('/(auth)/login');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!loaded) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
