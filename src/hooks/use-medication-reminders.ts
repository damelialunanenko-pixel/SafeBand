import * as Notifications from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { warningHaptic } from '@/components/ui';
import { useLocalization } from '@/localization';
import {
  cancelAllReminders, handleReminderResponse, installForegroundHandler, isReminder, refreshPermission, setupNotifications,
  syncReminders, useReminderState, vibrateForReminder,
} from '@/services/medication-reminders';
import { auth } from '@/services/firebase';
import { useSession } from '@/services/session';
import type { Ward } from '@/types/care';
import { useMedications } from './use-medications';

installForegroundHandler();

/**
 * Mounted once for the signed-in app (tabs layout). Keeps the scheduled reminders in sync with
 * Firestore, vibrates for reminders shown while the app is open and handles notification buttons —
 * including a button pressed while the app was closed (getLastNotificationResponseAsync).
 */
export function useMedicationReminders(ward: Ward | null) {
  const { t, language } = useLocalization();
  const { user } = useSession();
  const router = useRouter();
  const { enabled, permission } = useReminderState();
  const { meds, logsByKey, loading } = useMedications(ward?.id);
  const uid = user?.uid;
  const deps = useRef({ uid, t, router });
  useEffect(() => { deps.current = { uid, t, router }; });

  // Channel, buttons (localized) and permission status.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    void setupNotifications(t, language).catch(() => undefined);
  }, [t, language]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') void refreshPermission(); });
    return () => sub.remove();
  }, []);

  // Re-plan whenever medications, marks, the switch, the permission or the language change (and on start).
  useEffect(() => {
    if (Platform.OS === 'web' || !ward || loading || enabled === undefined || permission === undefined) return;
    const id = setTimeout(() => {
      void syncReminders({ wardId: ward.id, wardName: ward.name, meds, logs: logsByKey, t }).catch(() => undefined);
    }, 800);
    return () => clearTimeout(id);
  }, [ward, meds, logsByKey, loading, enabled, permission, t]);

  // The tabs unmount on sign-out (or account deletion): no reminders for that account on this phone.
  useEffect(() => () => { if (!auth.currentUser) void cancelAllReminders().catch(() => undefined); }, []);

  // Buttons and taps.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const handle = async (response: Notifications.NotificationResponse) => {
      const { uid: currentUid, t: currentT, router: currentRouter } = deps.current;
      const outcome = await handleReminderResponse(response, currentUid, currentT).catch(() => 'ignored' as const);
      if (outcome === 'opened') currentRouter.push('/medications' as Href);
    };
    const responses = Notifications.addNotificationResponseReceivedListener((r) => void handle(r));
    const received = Notifications.addNotificationReceivedListener((n) => {
      if (isReminder(n.request.content.data)) { vibrateForReminder(); warningHaptic(); }
    });
    // A button pressed while the app was closed.
    void Notifications.getLastNotificationResponseAsync().then(async (last) => {
      if (!last) return;
      await handle(last);
      await Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    }).catch(() => undefined);
    return () => { responses.remove(); received.remove(); };
  }, []);
}
