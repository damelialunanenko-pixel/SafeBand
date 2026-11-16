import { useState } from 'react';
import { Platform, View } from 'react-native';
import { AppText, Button, Card, Chip, IconCircle, Input, useToast } from '@/components/ui';
import { usePrimaryCareData } from '@/hooks/use-care-data';
import { useLocalization } from '@/localization';
import { disableSmsReading, enableSmsReading, isSmsAvailable, useSmsState } from '@/services/bracelet-sms';
import { saveWard } from '@/services/care-repository';
import { formatPhoneInput, toE164, validatePhone } from '@/services/validation';
import { makeStyles } from '@/theme';

/** Settings block: bracelet SIM number + switch for reading bracelet SMS (Android only). */
export function SmsSettingsCard() {
  const { t } = useLocalization();
  const toast = useToast();
  const s = useStyles();
  const { ward } = usePrimaryCareData();
  const { enabled, last, error } = useSmsState();
  // null = not edited yet, show the saved number.
  const [draftPhone, setPhone] = useState<string | null>(null);
  const phone = draftPhone ?? formatPhoneInput(ward?.braceletPhone ?? '');
  const phoneError = draftPhone !== null ? validatePhone(phone) : null;

  if (Platform.OS === 'web') return null;

  const savePhone = () => {
    const e164 = toE164(phone);
    if (!ward || !e164) return;
    saveWard(ward.id, { braceletPhone: e164 })
      .then(() => { setPhone(null); toast.show(t('smsPhoneSaved'), 'success'); })
      .catch(() => toast.show(t('smsPhoneError'), 'danger'));
  };
  const toggle = async () => {
    if (enabled) { await disableSmsReading(); return; }
    if (!(await enableSmsReading())) toast.show(t('smsPermissionDenied'), 'danger');
  };

  // In Expo Go and on iOS the native module is absent — explain instead of failing.
  const notice = Platform.OS === 'ios' ? t('smsUnsupportedIos') : !isSmsAvailable() ? t('smsUnsupportedBuild') : ward && !ward.braceletId ? t('smsNeedBracelet') : null;
  const time = last ? new Date(last.at).toLocaleString() : '';

  return (
    <Card style={s.card}>
      <View style={s.head}>
        <IconCircle name="chatbubble-ellipses" tone="cyan" />
        <AppText variant="title" accessibilityRole="header" style={s.flex}>{t('smsTitle')}</AppText>
      </View>
      <AppText variant="body" tone="secondary">{t('smsDescription')}</AppText>
      {notice ? <AppText variant="caption" tone="warning">{notice}</AppText> : (
        <>
          <Input
            icon="call-outline"
            label={t('smsPhone')}
            value={phone}
            onChangeText={(v) => setPhone(formatPhoneInput(v))}
            placeholder={t('phonePlaceholder')}
            keyboardType="phone-pad"
            autoComplete="tel"
            error={phoneError ? t(phoneError) : null}
          />
          <Button variant="secondary" size="sm" title={t('smsSavePhone')} onPress={savePhone} disabled={!ward || draftPhone === null || !!phoneError} />
          <View style={s.row}>
            <Chip label={t(enabled ? 'smsActive' : 'smsInactive')} tone={enabled ? 'success' : 'neutral'} icon={enabled ? 'checkmark-circle' : 'pause-circle'} />
          </View>
          {last ? <AppText variant="caption" tone={last.ok ? 'muted' : 'warning'}>{t(last.ok ? 'smsLast' : 'smsLastInvalid', { time })}</AppText> : null}
          {error ? <AppText variant="caption" tone="danger">{error === 'permission' ? t('smsPermissionDenied') : t('smsError', { message: error })}</AppText> : null}
          <Button
            variant={enabled ? 'secondary' : 'primary'}
            icon={enabled ? 'stop-circle-outline' : 'mail-unread-outline'}
            title={t(enabled ? 'smsDisable' : 'smsEnable')}
            onPress={() => void toggle()}
            disabled={enabled === undefined || !ward?.braceletPhone}
          />
        </>
      )}
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  card: { gap: t.spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  row: { flexDirection: 'row' },
}));
