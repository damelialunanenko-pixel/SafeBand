import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { auth } from '../services/firebase';

function AuthGuard() {
  const [user, setUser] = useState<any>(undefined);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user === undefined) return;
    const inAuthGroup = segments[0] === "auth" || segments[0] === undefined;
    if (!user && !inAuthGroup) {
      router.replace("/");
    } else if (user && inAuthGroup) {
      router.replace("/home");
    }
  }, [user, segments]);

  return null;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="home" />
        <Stack.Screen name="ward" />
        <Stack.Screen name="map" />
        <Stack.Screen name="history" />
      </Stack>
    </ThemeProvider>
  );
}
