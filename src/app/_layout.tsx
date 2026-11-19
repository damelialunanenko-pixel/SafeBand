import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments, type Href } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { LocalizationProvider, useLocalization } from '@/localization';
import { requiredRoute } from '@/services/auth-flow';
import { auth } from '@/services/firebase';
import { SessionProvider, useSession } from '@/services/session';

/**
 * Redirects according to the session: signed out → start screen; email not verified →
 * /verify-email; no security answers → /security-setup; new device → /security-check;
 * no caregiver profile → /guardian-profile. The rules live in services/auth-flow.ts.
 */
function AuthGuard() {
  const { snapshot } = useSession();
  const { language } = useLocalization();
  const router = useRouter();
  const segments = useSegments();
  const segment = (segments[0] as string | undefined) ?? '';

  // Firebase emails (verification, password reset) in the app language.
  useEffect(() => { auth.languageCode = language; }, [language]);

  useEffect(() => {
    const target = requiredRoute(snapshot, segment);
    if (target) router.replace(target as Href);
  }, [snapshot, segment, router]);

  return null;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <LocalizationProvider><SessionProvider><ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="register" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="verify-email" />
        <Stack.Screen name="security-setup" />
        <Stack.Screen name="security-check" />
        <Stack.Screen name="guardian-profile" />
        <Stack.Screen name="home" />
        <Stack.Screen name="ward" />
        <Stack.Screen name="bracelet" />
        <Stack.Screen name="map" />
        <Stack.Screen name="history" />
        <Stack.Screen name="health" />
        <Stack.Screen name="settings" />
      </Stack>
    </ThemeProvider></SessionProvider></LocalizationProvider>
  );
}
