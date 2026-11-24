import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ToastProvider } from '@/components/ui';
import { useAppUpdates } from '@/hooks/use-app-updates';
import { LocalizationProvider, useLocalization } from '@/localization';
import { requiredRoute } from '@/services/auth-flow';
import { auth } from '@/services/firebase';
import { SessionProvider, useSession } from '@/services/session';
import { AppThemeProvider, fontAssets, useAppTheme } from '@/theme';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

/**
 * Redirects according to the session: signed out → start screen; email not verified →
 * /verify-email; no caregiver profile → /guardian-profile. The rules live in services/auth-flow.ts.
 */
function AuthGuard() {
  const { snapshot } = useSession();
  const { language } = useLocalization();
  const router = useRouter();
  const segments = useSegments();
  // First real path segment: route groups like `(tabs)` are not part of the URL.
  const segment = (segments as string[]).find((part) => !part.startsWith('(')) ?? '';

  // Firebase emails (verification, password reset) in the app language.
  useEffect(() => { auth.languageCode = language; }, [language]);

  useEffect(() => {
    const target = requiredRoute(snapshot, segment);
    if (target) router.replace(target as Href);
  }, [snapshot, segment, router]);

  return null;
}

/** Offers to restart when a newer EAS update has been downloaded (release builds only). */
function UpdatePrompt() {
  useAppUpdates();
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
  return (
    <ThemeProvider value={value}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </ThemeProvider>
  );
}

/** Screens slide in from the right (fade + slide from the bottom for modal-like screens), 300 ms. */
function RootStack() {
  const reduceMotion = useReducedMotion();
  const { colors } = useAppTheme();
  const push = reduceMotion ? 'none' : 'slide_from_right';
  const modal = reduceMotion ? 'none' : 'fade_from_bottom';
  return (
    <Stack screenOptions={{ headerShown: false, animation: push, animationDuration: 300, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" options={{ animation: reduceMotion ? 'none' : 'fade' }} />
      <Stack.Screen name="auth" />
      <Stack.Screen name="register" />
      <Stack.Screen name="privacy" options={{ animation: modal }} />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="guardian-profile" />
      <Stack.Screen name="(tabs)" options={{ animation: reduceMotion ? 'none' : 'fade' }} />
      <Stack.Screen name="ward" options={{ animation: modal }} />
      <Stack.Screen name="bracelet" />
      <Stack.Screen name="history" />
      <Stack.Screen name="medication-form" options={{ animation: modal }} />
    </Stack>
  );
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
              <UpdatePrompt />
              <RootStack />
            </ToastProvider>
          </NavigationTheme>
        </AppThemeProvider>
      </SessionProvider>
    </LocalizationProvider>
  );
}
