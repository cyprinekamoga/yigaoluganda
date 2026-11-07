import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useSyncExternalStore } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initAudio } from '@/audio/engine';
import { useApp } from '@/state/store';
import { C } from '@/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  // No custom fonts to load: the app uses the system font (San Francisco on Apple devices).
  const hydrated = useSyncExternalStore(
    (onChange) => useApp.persist.onFinishHydration(onChange),
    () => useApp.persist.hasHydrated(),
  );

  const ready = hydrated;

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch(() => undefined);
    initAudio();
    useApp.getState().tick();
    const id = setInterval(() => useApp.getState().tick(), 30_000);
    return () => clearInterval(id);
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.paper } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="chapter/[id]" />
        <Stack.Screen name="lesson/[id]" options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="practice/[mode]" options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="phrase/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" />
      </Stack>
    </SafeAreaProvider>
  );
}
