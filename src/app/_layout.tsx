import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useSyncExternalStore } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ACCOUNTS } from '@/account/config';
import { selectAccess, selectSignedIn, startAccount, useAccount } from '@/account/store';
import { clearOpeningLink } from '@/account/supabase';
import { initAudio } from '@/audio/engine';
import { useReminderSchedule } from '@/reminders/useReminders';
import { useLearners } from '@/learners/store';
import { useApp } from '@/state/store';
import { C } from '@/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  // No custom fonts to load: the app uses the system font (San Francisco on Apple devices).
  const appHydrated = useSyncExternalStore(
    (onChange) => useApp.persist.onFinishHydration(onChange),
    () => useApp.persist.hasHydrated(),
  );
  const learnersHydrated = useSyncExternalStore(
    (onChange) => useLearners.persist.onFinishHydration(onChange),
    () => useLearners.persist.hasHydrated(),
  );
  const hydrated = appHydrated && learnersHydrated;

  const accountReady = useAccount((s) => s.ready);
  const signedIn = useAccount(selectSignedIn);
  const access = useAccount(selectAccess);
  const recovering = useAccount((s) => s.recovering);
  const confirmLink = useAccount((s) => s.confirmLink);
  useEffect(() => startAccount(), []);
  useReminderSchedule();

  const ready = hydrated && accountReady;
  // With accounts on, the course needs a login and an active subscription (no free trial).
  const canLearn = !ACCOUNTS || (signedIn && access && !recovering);

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch(() => undefined);
    initAudio();
    useApp.getState().tick();
    const id = setInterval(() => useApp.getState().tick(), 30_000);
    const clear = setTimeout(clearOpeningLink, 300);
    return () => {
      clearInterval(id);
      clearTimeout(clear);
    };
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.paper } }}>
        {/* A screen whose guard is false redirects to the first available screen below. */}
        <Stack.Protected guard={canLearn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="chapter/[id]" />
          <Stack.Screen name="lesson/[id]" options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} />
          <Stack.Screen name="practice/[mode]" options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} />
          <Stack.Screen name="phrase/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="placement" options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} />
          <Stack.Screen name="learners" />
          <Stack.Screen name="certificate/[part]" />
        </Stack.Protected>
        <Stack.Protected guard={ACCOUNTS && !signedIn}>
          <Stack.Screen name="sign-up" />
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="forgot-password" />
        </Stack.Protected>
        <Stack.Protected guard={ACCOUNTS && signedIn && !access && !recovering}>
          <Stack.Screen name="subscribe" />
        </Stack.Protected>
        <Stack.Protected guard={ACCOUNTS && signedIn && recovering}>
          <Stack.Screen name="reset-password" />
        </Stack.Protected>
        <Stack.Protected guard={!ACCOUNTS}>
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        </Stack.Protected>
        {/* Without a subscription, "Choose your plan" is the only screen, so it is where the app goes. */}
        <Stack.Protected guard={canLearn}>
          <Stack.Screen name="settings" />
        </Stack.Protected>
        {/* Where the sign-up and password e-mails lead, signed in or not. Only when opened from such a link,
            so it is never where the app sends someone by default. */}
        <Stack.Protected guard={ACCOUNTS && confirmLink}>
          <Stack.Screen name="confirm" />
        </Stack.Protected>
      </Stack>
    </SafeAreaProvider>
  );
}
