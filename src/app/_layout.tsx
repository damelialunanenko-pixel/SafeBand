import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo } from 'react';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ToastProvider } from '@/components/ui';
import { LocalizationProvider, useLocalization } from '@/localization';
import { requiredRoute } from '@/services/auth-flow';
import { auth } from '@/services/firebase';
import { SessionProvider, useSession } from '@/services/session';
import { AppThemeProvider, fontAssets, useAppTheme } from '@/theme';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

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

/** React Navigation theme built from our tokens, so transitions never flash a foreign background. */
function NavigationTheme({ children }: { children: React.ReactNode }) {
  const { isDark, colors } = useAppTheme();
  const value = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: { ...base.colors, primary: colors.primary, background: colors.background, card: colors.card, text: colors.text, border: colors.border },
    };
  }, [isDark, colors]);
  return <ThemeProvider value={value}>{children}</ThemeProvider>;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const ready = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;

  return (
    <LocalizationProvider>
      <SessionProvider>
        <AppThemeProvider>
          <NavigationTheme>
            <ToastProvider>
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
            </ToastProvider>
          </NavigationTheme>
        </AppThemeProvider>
      </SessionProvider>
    </LocalizationProvider>
  );
}
