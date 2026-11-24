import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Updates from 'expo-updates';
import { useEffect, useRef } from 'react';
import { useToast } from '@/components/ui';
import { useLocalization } from '@/localization';

/** Long enough to read the message and reach the button. */
const PROMPT_MS = 15_000;

/** True only in a release build (APK) that has EAS Update configured — not in dev mode or Expo Go. */
export const canCheckForUpdates = () =>
  !__DEV__ && Updates.isEnabled && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

/**
 * Soft update check on launch: if an EAS update was published to this build's channel, download
 * it and offer to restart. Declining is fine — expo-updates applies it on the next cold start anyway.
 */
export function useAppUpdates() {
  const { t } = useLocalization();
  const toast = useToast();
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current || !canCheckForUpdates()) return;
    checked.current = true;
    void (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable) return;
        const fetched = await Updates.fetchUpdateAsync();
        if (!fetched.isNew) return;
        toast.show(t('updateReady'), 'primary', {
          duration: PROMPT_MS,
          action: { label: t('updateRestart'), onPress: () => void Updates.reloadAsync().catch(() => undefined) },
        });
      } catch {
        // Offline or the update server is unreachable: keep running the current bundle.
      }
    })();
  }, [t, toast]);
}
