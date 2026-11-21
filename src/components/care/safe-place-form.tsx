import { View } from 'react-native';
import { AppText, Button, FilterChip, IconCircle, Input } from '@/components/ui';
import { useLocalization } from '@/localization';
import { makeStyles } from '@/theme';
import type { SafePlace } from '@/types/care';

type Props = {
  draft: Partial<SafePlace>;
  onChange: (draft: Partial<SafePlace>) => void;
  schedule: string;
  onScheduleChange: (value: string) => void;
  presets: number[];
  onCancel: () => void;
  onSave: () => void;
};

/** Add / edit a safe place. The location is picked by tapping the map while this form is open. */
export function SafePlaceForm({ draft, onChange, schedule, onScheduleChange, presets, onCancel, onSave }: Props) {
  const { t } = useLocalization();
  const s = useStyles();
  return (
    <View>
      <View style={s.head}>
        <IconCircle name={draft.location ? 'location' : 'hand-left'} tone={draft.location ? 'success' : 'warning'} />
        <View style={s.flex}>
          <AppText variant="title">{t('safePlace')}</AppText>
          <AppText variant="caption" tone="muted">{t('mapInstructions')}</AppText>
        </View>
      </View>
      <Input icon="bookmark-outline" placeholder={t('placeName')} accessibilityLabel={t('placeName')} value={draft.name ?? ''} onChangeText={(name) => onChange({ ...draft, name })} />
      <Input icon="home-outline" placeholder={t('addressOptional')} accessibilityLabel={t('addressOptional')} value={draft.address ?? ''} onChangeText={(address) => onChange({ ...draft, address })} />
      <View style={s.presets} accessibilityRole="radiogroup">
        {presets.map((radius) => (
          <FilterChip key={radius} label={`${radius} m`} selected={draft.radius === radius} onPress={() => onChange({ ...draft, radius })} />
        ))}
      </View>
      <Input
        icon="resize-outline"
        placeholder={t('customRadius')}
        accessibilityLabel={t('customRadius')}
        keyboardType="numeric"
        value={draft.radius ? String(draft.radius) : ''}
        onChangeText={(value) => onChange({ ...draft, radius: Number(value) })}
      />
      <Input icon="time-outline" placeholder="08:00-18:00 (optional)" accessibilityLabel={t('scheduleOptional')} value={schedule} onChangeText={onScheduleChange} />
      <View style={s.buttons}>
        <Button variant="secondary" title={t('cancel')} onPress={onCancel} style={s.flex} />
        <Button title={t('save')} icon="checkmark" onPress={onSave} style={s.flex} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  head: { flexDirection: 'row', gap: t.spacing.sm, alignItems: 'center', marginBottom: t.spacing.md },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.xs, marginBottom: t.spacing.md },
  buttons: { flexDirection: 'row', gap: t.spacing.sm },
}));
