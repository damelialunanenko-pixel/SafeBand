import { useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text,
  TextInput, View, type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Option } from '@/config/security-questions';
import { useLocalization } from '@/localization';
import { formatPhoneInput } from '@/services/validation';

export const colors = {
  page: '#f4f9ff', card: '#ffffff', title: '#102a43', text: '#334e68', muted: '#5c7085', label: '#3974a5',
  primary: '#1976d2', border: '#c9d8e8', error: '#c62828', ok: '#2e7d32', placeholder: '#8296ab',
};

/** Tracks which fields the user has touched, so errors appear only after the first interaction. */
export function useTouched<K extends string>() {
  const [touched, setTouched] = useState<Partial<Record<K, boolean>>>({});
  const touch = (key: K) => setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  const touchAll = (keys: K[]) => setTouched(Object.fromEntries(keys.map((k) => [k, true])) as Record<K, boolean>);
  /** The error to show for `key`: only once it was touched. */
  const shown = (key: K, error: string | null | undefined) => (touched[key] ? error ?? null : null);
  return { touched, touch, touchAll, shown };
}

export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  return (
    <SafeAreaView style={s.page}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">{children}</ScrollView> : <View style={[s.flex, s.content]}>{children}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function StepIndicator({ step, total, title }: { step: number; total: number; title: string }) {
  const { t } = useLocalization();
  return (
    <View style={s.steps} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: total, now: step }}>
      <Text style={s.stepText}>{t('stepOf', { n: step, m: total })} · {title}</Text>
      <View style={s.stepBar}>
        {Array.from({ length: total }, (_, i) => <View key={i} style={[s.stepDot, i < step && s.stepDotDone]} />)}
      </View>
    </View>
  );
}

export const Title = ({ children }: { children: React.ReactNode }) => <Text style={s.title} accessibilityRole="header">{children}</Text>;
export const Subtitle = ({ children }: { children: React.ReactNode }) => <Text style={s.subtitle}>{children}</Text>;
export const SectionTitle = ({ children }: { children: React.ReactNode }) => <Text style={s.section}>{children}</Text>;
export const Hint = ({ children }: { children: React.ReactNode }) => <Text style={s.hint}>{children}</Text>;

export function FieldError({ error }: { error?: string | null }) {
  const { t } = useLocalization();
  return error ? <Text style={s.error} accessibilityLiveRegion="polite">{t(error)}</Text> : null;
}

type FieldProps = Omit<TextInputProps, 'onChangeText' | 'value' | 'style'> & {
  label: string; value: string; onChangeText: (v: string) => void; error?: string | null; hint?: string;
  onTouched?: () => void; right?: React.ReactNode;
};

export function Field({ label, value, onChangeText, error, hint, onTouched, right, ...input }: FieldProps) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
      <View style={[s.inputRow, error ? s.inputError : null]}>
        <TextInput
          {...input}
          value={value}
          accessibilityLabel={label}
          placeholderTextColor={colors.placeholder}
          style={s.input}
          onChangeText={(v) => { onChangeText(v); onTouched?.(); }}
          onBlur={(e) => { onTouched?.(); input.onBlur?.(e); }}
        />
        {right}
      </View>
      <FieldError error={error} />
    </View>
  );
}

export function PasswordField(props: Omit<FieldProps, 'right' | 'secureTextEntry'>) {
  const { t } = useLocalization();
  const [visible, setVisible] = useState(false);
  return (
    <Field
      {...props}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      right={
        <Pressable onPress={() => setVisible((v) => !v)} accessibilityRole="button" style={s.inlineButton} hitSlop={8}>
          <Text style={s.link}>{visible ? t('hidePassword') : t('showPassword')}</Text>
        </Pressable>
      }
    />
  );
}

export function PhoneField(props: Omit<FieldProps, 'keyboardType'>) {
  return <Field {...props} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" onChangeText={(v) => props.onChangeText(formatPhoneInput(v))} />;
}

export function SelectField({ label, value, options, onChange, error, hint, onTouched, searchable }: {
  label: string; value: string; options: Option[]; onChange: (id: string) => void; error?: string | null; hint?: string;
  onTouched?: () => void; searchable?: boolean;
}) {
  const { t, language } = useLocalization();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.id === value);
  const visible = query ? options.filter((o) => o.label[language].toLowerCase().includes(query.toLowerCase())) : options;
  const close = () => { setOpen(false); setQuery(''); onTouched?.(); };
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => setOpen(true)} style={[s.inputRow, s.select, error ? s.inputError : null]}>
        <Text style={selected ? s.selectValue : s.selectPlaceholder}>{selected ? selected.label[language] : t('choose')}</Text>
        <Text style={s.chevron}>▾</Text>
      </Pressable>
      <FieldError error={error} />
      <Modal visible={open} animationType="slide" onRequestClose={close}>
        <SafeAreaView style={s.page}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{label}</Text>
            <Pressable onPress={close} accessibilityRole="button" hitSlop={10}><Text style={s.link}>{t('cancel')}</Text></Pressable>
          </View>
          {searchable ? <TextInput value={query} onChangeText={setQuery} placeholder={t('search')} placeholderTextColor={colors.placeholder} style={[s.input, s.search]} /> : null}
          <FlatList
            data={visible}
            keyExtractor={(o) => o.id}
            keyboardShouldPersistTaps="handled"
            numColumns={options.every((o) => o.label[language].length <= 2) ? 6 : 1}
            contentContainerStyle={s.modalList}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: item.id === value }}
                onPress={() => { onChange(item.id); close(); }}
                style={[s.option, item.id === value && s.optionSelected, item.label[language].length <= 2 && s.optionLetter]}
              >
                <Text style={s.optionText}>{item.label[language]}</Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

export function MultiSelect({ label, hint, options, value, onChange, error }: {
  label: string; hint?: string; options: Option[]; value: string[]; onChange: (ids: string[]) => void; error?: string | null;
}) {
  const { language } = useLocalization();
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
      {options.map((o) => {
        const on = value.includes(o.id);
        return (
          <Pressable key={o.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggle(o.id)} style={[s.checkRow, on && s.optionSelected]}>
            <View style={[s.box, on && s.boxOn]}>{on ? <Text style={s.boxMark}>✓</Text> : null}</View>
            <Text style={s.checkText}>{o.label[language]}</Text>
          </Pressable>
        );
      })}
      <FieldError error={error} />
    </View>
  );
}

export function Checkbox({ checked, onChange, children, error }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode; error?: string | null }) {
  return (
    <View style={s.field}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => onChange(!checked)} style={s.checkRow}>
        <View style={[s.box, checked && s.boxOn]}>{checked ? <Text style={s.boxMark}>✓</Text> : null}</View>
        <View style={s.flex}>{children}</View>
      </Pressable>
      <FieldError error={error} />
    </View>
  );
}

/** A rule that turns green when satisfied (password checklist). */
export const RuleRow = ({ ok, text }: { ok: boolean; text: string }) => (
  <Text style={[s.rule, ok ? s.ruleOk : null]} accessibilityState={{ checked: ok }}>{ok ? '✓' : '•'} {text}</Text>
);

export function Button({ title, onPress, disabled, loading, variant = 'primary', big }: {
  title: string; onPress: () => void; disabled?: boolean; loading?: boolean; variant?: 'primary' | 'secondary' | 'danger' | 'link'; big?: boolean;
}) {
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      disabled={off}
      onPress={onPress}
      style={[s.button, VARIANTS[variant], big && s.big, off && s.disabled]}
    >
      {loading ? <ActivityIndicator color={variant === 'secondary' || variant === 'link' ? colors.primary : '#fff'} /> : (
        <Text style={[s.buttonText, (variant === 'secondary' || variant === 'link') && s.buttonTextAlt]}>{title}</Text>
      )}
    </Pressable>
  );
}

export const Card = ({ children }: { children: React.ReactNode }) => <View style={s.card}>{children}</View>;

export const s = StyleSheet.create({
  flex: { flex: 1 },
  page: { flex: 1, backgroundColor: colors.page },
  content: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 26, fontWeight: '800', color: colors.title, marginBottom: 6 },
  subtitle: { fontSize: 15, color: colors.muted, marginBottom: 18, lineHeight: 21 },
  section: { fontSize: 17, fontWeight: '800', color: colors.title, marginTop: 10, marginBottom: 10 },
  steps: { marginBottom: 16 },
  stepText: { color: colors.label, fontWeight: '700', marginBottom: 8 },
  stepBar: { flexDirection: 'row', gap: 6 },
  stepDot: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.border },
  stepDotDone: { backgroundColor: colors.primary },
  field: { marginBottom: 14 },
  label: { color: colors.label, marginBottom: 6, fontWeight: '700' },
  hint: { color: colors.muted, fontSize: 13, marginBottom: 6, lineHeight: 18 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  inputError: { borderColor: colors.error },
  input: { flex: 1, color: colors.title, padding: 13, fontSize: 16 },
  inlineButton: { paddingHorizontal: 12 },
  error: { color: colors.error, marginTop: 5, fontSize: 13 },
  link: { color: colors.primary, fontWeight: '700' },
  select: { padding: 13, justifyContent: 'space-between' },
  selectValue: { color: colors.title, fontSize: 16, flex: 1 },
  selectPlaceholder: { color: colors.placeholder, fontSize: 16, flex: 1 },
  chevron: { color: colors.muted, fontSize: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.title, flex: 1 },
  modalList: { padding: 12, gap: 8 },
  search: { flex: 0, marginHorizontal: 12, backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  option: { padding: 14, borderRadius: 10, backgroundColor: colors.card, marginBottom: 8 },
  optionLetter: { flex: 1, margin: 4, alignItems: 'center' },
  optionSelected: { backgroundColor: '#cfe9ff' },
  optionText: { color: colors.title, fontSize: 16, fontWeight: '600' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 10, backgroundColor: colors.card, marginBottom: 6 },
  checkText: { color: colors.title, fontSize: 15, flex: 1 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.label, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  boxMark: { color: '#fff', fontWeight: '900' },
  rule: { color: colors.muted, fontSize: 13, marginBottom: 2 },
  ruleOk: { color: colors.ok, fontWeight: '700' },
  button: { padding: 15, borderRadius: 11, alignItems: 'center', marginTop: 8 },
  big: { paddingVertical: 22, borderRadius: 16 },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: '#e3f0fc' },
  danger: { backgroundColor: colors.error },
  linkButton: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.45 },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  buttonTextAlt: { color: colors.primary },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 14 },
});

const VARIANTS = { primary: s.primary, secondary: s.secondary, danger: s.danger, link: s.linkButton } as const;
