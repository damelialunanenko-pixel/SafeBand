import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { usePrimaryCareData } from '@/hooks/use-care-data';
import { useLocalization } from '@/localization';
import { disableSmsReading, enableSmsReading, isSmsAvailable, useSmsState } from '@/services/bracelet-sms';
import { saveWard } from '@/services/care-repository';

/** Settings block: bracelet SIM number + switch for reading bracelet SMS (Android only). */
export function SmsSettingsCard() {
  const { t } = useLocalization();
  const { ward } = usePrimaryCareData();
  const { enabled, last, error } = useSmsState();
  // null = not edited yet, show the saved number.
  const [draftPhone, setPhone] = useState<string | null>(null);
  const phone = draftPhone ?? ward?.braceletPhone ?? '';

  if (Platform.OS === 'web') return null;

  const savePhone = () => {
    if (!ward) return;
    saveWard(ward.id, { braceletPhone: phone.trim() })
      .then(() => Alert.alert(t('smsTitle'), t('smsPhoneSaved')))
      .catch(() => Alert.alert(t('smsTitle'), t('smsPhoneError')));
  };
  const toggle = async () => {
    if (enabled) { await disableSmsReading(); return; }
    if (!(await enableSmsReading())) Alert.alert(t('smsTitle'), t('smsPermissionDenied'));
  };

  const notice = Platform.OS === 'ios' ? t('smsUnsupportedIos') : !isSmsAvailable() ? t('smsUnsupportedBuild') : ward && !ward.braceletId ? t('smsNeedBracelet') : null;
  const time = last ? new Date(last.at).toLocaleString() : '';

  return (
    <View style={s.card}>
      <Text style={s.label}>{t('smsTitle')}</Text>
      <Text style={s.description}>{t('smsDescription')}</Text>
      {notice ? <Text style={s.warning}>{notice}</Text> : (
        <>
          <Text style={s.field}>{t('smsPhone')}</Text>
          <View style={s.row}>
            <TextInput style={s.input} value={phone} onChangeText={setPhone} placeholder={t('smsPhonePlaceholder')} keyboardType="phone-pad" autoComplete="tel" />
            <Pressable style={s.secondary} onPress={savePhone} disabled={!ward}><Text style={s.secondaryText}>{t('smsSavePhone')}</Text></Pressable>
          </View>
          <Text style={enabled ? s.ok : s.muted}>{t(enabled ? 'smsActive' : 'smsInactive')}</Text>
          {last ? <Text style={last.ok ? s.muted : s.warning}>{t(last.ok ? 'smsLast' : 'smsLastInvalid', { time })}</Text> : null}
          {error ? <Text style={s.warning}>{error === 'permission' ? t('smsPermissionDenied') : t('smsError', { message: error })}</Text> : null}
          <Pressable style={enabled ? s.secondary : s.primary} onPress={() => void toggle()} disabled={enabled === undefined}>
            <Text style={enabled ? s.secondaryText : s.primaryText}>{t(enabled ? 'smsDisable' : 'smsEnable')}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 10 },
  label: { fontSize: 14, fontWeight: '800', color: '#3974a5' },
  description: { color: '#5c7085', lineHeight: 20 },
  field: { fontWeight: '700', color: '#102a43' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#eef5fb', borderRadius: 8, padding: 11 },
  muted: { color: '#5c7085' },
  ok: { color: '#137333', fontWeight: '800' },
  warning: { color: '#8a5300', backgroundColor: '#fff4e0', padding: 10, borderRadius: 8 },
  primary: { backgroundColor: '#1976d2', borderRadius: 10, padding: 13, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '800' },
  secondary: { backgroundColor: '#e9eff5', borderRadius: 10, padding: 12, alignItems: 'center' },
  secondaryText: { color: '#102a43', fontWeight: '700' },
});
