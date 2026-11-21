import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { useState } from 'react';
import { Alert } from 'react-native';
import { useLocalization } from '@/localization';
import { errorKey } from '@/services/auth-errors';
import { auth, functions } from '@/services/firebase';
import { clearLocalUserData } from '@/services/local-store';
import { Button, FormMessage, PasswordField } from './form';
import { AppText } from './ui';

const deleteAccountData = httpsCallable<void, { ok: true }>(functions, 'deleteAccountData');

/**
 * Settings → Delete account: password again (reauthenticateWithCredential), two confirmations,
 * then the Cloud Function removes Firestore data and the client deletes the Auth user.
 */
export function DeleteAccountCard() {
  const { t } = useLocalization();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    const user = auth.currentUser;
    if (!user?.email) return;
    setBusy(true); setError(null);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
      await deleteAccountData();
      await clearLocalUserData(user.uid);
      await deleteUser(user); // AuthGuard returns to the start screen
      Alert.alert(t('deleteAccount'), t('accountDeleted'));
    } catch (e) {
      const key = errorKey(e);
      setError(key === 'errUnknown' ? 'deleteAccountError' : key);
    } finally {
      setBusy(false);
    }
  };

  const confirmTwice = () =>
    Alert.alert(t('deleteAccountConfirm1'), t('deleteAccountDescription'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('continue'), style: 'destructive',
        onPress: () => Alert.alert(t('deleteAccountConfirm2'), '', [
          { text: t('cancel'), style: 'cancel' },
          { text: t('deleteForever'), style: 'destructive', onPress: () => void run() },
        ]),
      },
    ]);

  return (
    <>
      <AppText variant="title" tone="danger">{t('deleteAccount')}</AppText>
      <AppText variant="caption" tone="muted">{t('deleteAccountDescription')}</AppText>
      {open ? (
        <>
          <PasswordField label={t('deleteAccountPassword')} value={password} onChangeText={setPassword} placeholder={t('passwordPlaceholder')} autoComplete="current-password" />
          {error ? <FormMessage>{t(error)}</FormMessage> : null}
          <Button variant="danger" title={t('deleteAccount')} onPress={confirmTwice} disabled={!password} loading={busy} />
          <Button variant="link" title={t('cancel')} onPress={() => { setOpen(false); setPassword(''); setError(null); }} disabled={busy} />
        </>
      ) : (
        <Button variant="danger" title={t('deleteAccount')} onPress={() => setOpen(true)} />
      )}
    </>
  );
}
