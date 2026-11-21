import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useLocalization } from '@/localization';
import { makeStyles, useAppTheme } from '@/theme';
import { BottomSheet } from './bottom-sheet';
import { selectionHaptic } from './haptics';
import { Icon } from './icon';
import { Input } from './input';
import { PressableScale } from './pressable-scale';
import { AppText } from './text';

export type SelectOption = { id: string; label: string };

type SelectProps = {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (id: string) => void;
  /** Called when the sheet closes (used to mark the field as touched). */
  onClose?: () => void;
  placeholder?: string;
  hint?: string;
  error?: string | null;
  searchable?: boolean;
};

/** Field that opens a bottom sheet with the options (optionally searchable). */
export function Select({ label, value, options, onChange, onClose, placeholder, hint, error, searchable }: SelectProps) {
  const { t } = useLocalization();
  const { colors } = useAppTheme();
  const s = useStyles();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.id === value);
  const shown = query ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : options;
  // Single letters (e.g. a friend's initial) fit a compact grid.
  const grid = options.every((o) => o.label.length <= 2);
  const close = () => { setOpen(false); setQuery(''); onClose?.(); };

  return (
    <View style={s.field}>
      <AppText variant="captionStrong" tone="secondary" style={s.label}>{label}</AppText>
      {hint ? <AppText variant="caption" tone="muted" style={s.label}>{hint}</AppText> : null}
      <PressableScale
        onPress={() => setOpen(true)}
        scaleTo={0.98}
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder ?? t('choose')}`}
        style={[s.box, error ? s.boxError : null]}
      >
        <AppText variant="bodyMedium" tone={selected ? 'default' : 'muted'} style={s.flex} numberOfLines={1}>
          {selected?.label ?? placeholder ?? t('choose')}
        </AppText>
        <Icon name="chevron-down" size={18} color={colors.textMuted} />
      </PressableScale>
      {error ? (
        <View style={s.errorRow} accessibilityLiveRegion="polite">
          <Icon name="alert-circle" size={15} color={colors.onDangerSoft} />
          <AppText variant="caption" tone="danger">{error}</AppText>
        </View>
      ) : null}

      <BottomSheet visible={open} onClose={close} title={label}>
        {searchable ? (
          <Input icon="search" value={query} onChangeText={setQuery} placeholder={t('search')} containerStyle={s.search} autoCorrect={false} />
        ) : null}
        <FlatList
          key={grid ? 'grid' : 'list'}
          data={shown}
          keyExtractor={(o) => o.id}
          numColumns={grid ? 6 : 1}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.list}
          columnWrapperStyle={grid ? s.gridRow : undefined}
          renderItem={({ item }) => {
            const on = item.id === value;
            return (
              <PressableScale
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={item.label}
                haptic={false}
                scaleTo={0.97}
                onPress={() => { selectionHaptic(); onChange(item.id); close(); }}
                style={[s.option, grid && s.optionGrid, on && s.optionOn]}
              >
                <AppText variant="bodyMedium" tone={on ? 'onPrimarySoft' : 'default'} style={!grid && s.flex}>{item.label}</AppText>
                {on && !grid ? <Icon name="checkmark-circle" size={22} color={colors.primary} /> : null}
              </PressableScale>
            );
          }}
        />
      </BottomSheet>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  field: { marginBottom: t.spacing.md },
  label: { marginBottom: 6, marginLeft: 4 },
  box: {
    flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs, minHeight: 54, paddingHorizontal: t.spacing.md,
    borderRadius: t.radius.md, borderWidth: 1.5, borderColor: t.colors.border, backgroundColor: t.colors.card,
  },
  boxError: { borderColor: t.colors.danger },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginLeft: 4 },
  flex: { flex: 1 },
  search: { marginHorizontal: t.spacing.screen, marginBottom: t.spacing.xs },
  list: { paddingHorizontal: t.spacing.screen, paddingBottom: t.spacing.md, gap: t.spacing.xs },
  gridRow: { gap: t.spacing.xs },
  option: {
    flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: t.spacing.md,
    borderRadius: t.radius.md, backgroundColor: t.colors.card,
  },
  optionGrid: { flex: 1, justifyContent: 'center', paddingHorizontal: 0 },
  optionOn: { backgroundColor: t.colors.primarySoft },
}));
