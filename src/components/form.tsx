/**
 * Form building blocks for sign-in, registration and profile screens, built on the
 * themed UI kit in ./ui. Validation stays in services/validation.ts; errors arrive
 * here as translation keys.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Switch, View, type TextInputProps } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Option } from '@/config/security-questions';
import { useLocalization } from '@/localization';
import { formatPhoneInput } from '@/services/validation';
import { makeStyles, useAppTheme } from '@/theme';
import {
  Appear, AppText, Button as UiButton, Card as UiCard, Icon, Input, PressableScale, Select, selectionHaptic, Skeleton, type IconName,
  type TextTone,
} from './ui';

/** Tracks which fields the user has touched, so errors appear only after the first interaction. */
export function useTouched<K extends string>() {
  const [touched, setTouched] = useState<Partial<Record<K, boolean>>>({});
  const touch = (key: K) => setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  const touchAll = (keys: K[]) => setTouched(Object.fromEntries(keys.map((k) => [k, true])) as Record<K, boolean>);
  /** The error to show for `key`: only once it was touched. */
  const shown = (key: K, error: string | null | undefined) => (touched[key] ? error ?? null : null);
  return { touched, touch, touchAll, shown };
}

/** Page with a soft blue glow at the top, keyboard avoidance and a scrolling column. */
export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const { gradients } = useAppTheme();
  const insets = useSafeAreaInsets();
  const s = useStyles();
  const padding = { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 };
  return (
    <View style={s.page}>
      <LinearGradient colors={[gradients.header[0], gradients.header[1], 'transparent']} locations={[0, 0.55, 1]} style={s.glow} pointerEvents="none" />
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView contentContainerStyle={[s.content, padding]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Appear>{children}</Appear>
          </ScrollView>
        ) : (
          <View style={[s.flex, s.content, s.centered, padding]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

/** “Step n of m · title” with a bar that fills from the previous step to this one. */
export function StepIndicator({ step, total, title }: { step: number; total: number; title: string }) {
  const { t } = useLocalization();
  const { motion } = useAppTheme();
  const s = useStyles();
  const progress = useSharedValue((step - 1) / total);
  useEffect(() => {
    progress.set(withTiming(step / total, { duration: motion.slow * 2, easing: Easing.out(Easing.cubic) }));
  }, [step, total, progress, motion]);
  const fill = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));
  return (
    <View
      style={s.steps}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${t('stepProgress')}: ${t('stepOf', { n: step, m: total })}, ${title}`}
      accessibilityValue={{ min: 1, max: total, now: step }}
    >
      <View style={s.stepHead}>
        <AppText variant="captionStrong" tone="primary">{t('stepOf', { n: step, m: total })}</AppText>
        <AppText variant="caption" tone="muted" style={s.flex} numberOfLines={1}>· {title}</AppText>
      </View>
      <View style={s.stepTrack}>
        <Animated.View style={[s.stepFill, fill]} />
      </View>
    </View>
  );
}

export const Title = ({ children }: { children: ReactNode }) => {
  const s = useStyles();
  return <AppText variant="display" accessibilityRole="header" style={s.title}>{children}</AppText>;
};
export const Subtitle = ({ children }: { children: ReactNode }) => {
  const s = useStyles();
  return <AppText variant="body" tone="secondary" style={s.subtitle}>{children}</AppText>;
};
export const SectionTitle = ({ children }: { children: ReactNode }) => {
  const s = useStyles();
  return <AppText variant="h2" accessibilityRole="header" style={s.section}>{children}</AppText>;
};
export const Hint = ({ children, tone = 'muted' }: { children: ReactNode; tone?: TextTone }) => {
  const s = useStyles();
  return <AppText variant="caption" tone={tone} style={s.hint}>{children}</AppText>;
};

/** Form-level message: error (red) or success (green) banner. */
export function FormMessage({ children, tone = 'danger' }: { children: ReactNode; tone?: 'danger' | 'success' }) {
  const { colors } = useAppTheme();
  const s = useStyles();
  const danger = tone === 'danger';
  return (
    <View style={[s.message, danger ? s.messageDanger : s.messageSuccess]} accessibilityLiveRegion="polite" accessibilityRole={danger ? 'alert' : 'text'}>
      <Icon name={danger ? 'alert-circle' : 'checkmark-circle'} size={20} color={danger ? colors.onDangerSoft : colors.onSuccessSoft} />
      <AppText variant="bodyMedium" tone={danger ? 'danger' : 'success'} style={s.flex}>{children}</AppText>
    </View>
  );
}

/** Inline link inside a sentence (e.g. the privacy policy in the consent checkbox). */
export function InlineLink({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  return <AppText variant="bodyStrong" tone="primary" accessibilityRole="link" onPress={onPress} suppressHighlighting>{children}</AppText>;
}

type FieldProps = Omit<TextInputProps, 'onChangeText' | 'value' | 'style'> & {
  label: string; value: string; onChangeText: (v: string) => void; error?: string | null; hint?: string;
  onTouched?: () => void; right?: ReactNode; icon?: IconName;
};

export function Field({ label, value, onChangeText, error, hint, onTouched, right, icon, ...input }: FieldProps) {
  const { t } = useLocalization();
  return (
    <Input
      {...input}
      label={label}
      hint={hint}
      icon={icon}
      right={right}
      value={value}
      error={error ? t(error) : null}
      onChangeText={(v) => { onChangeText(v); onTouched?.(); }}
      onBlur={(e) => { onTouched?.(); input.onBlur?.(e); }}
    />
  );
}

export function PasswordField(props: Omit<FieldProps, 'right' | 'secureTextEntry'>) {
  const { t } = useLocalization();
  const { colors } = useAppTheme();
  const s = useStyles();
  const [visible, setVisible] = useState(false);
  return (
    <Field
      icon="lock-closed-outline"
      {...props}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      right={
        <PressableScale
          onPress={() => setVisible((v) => !v)}
          haptic={false}
          accessibilityLabel={visible ? t('hidePassword') : t('showPassword')}
          style={s.eye}
        >
          <Icon name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textMuted} />
        </PressableScale>
      }
    />
  );
}

export function PhoneField(props: Omit<FieldProps, 'keyboardType'>) {
  return (
    <Field
      icon="call-outline"
      {...props}
      keyboardType="phone-pad"
      autoComplete="tel"
      textContentType="telephoneNumber"
      onChangeText={(v) => props.onChangeText(formatPhoneInput(v))}
    />
  );
}

export function SelectField({ label, value, options, onChange, error, hint, onTouched, searchable }: {
  label: string; value: string; options: Option[]; onChange: (id: string) => void; error?: string | null; hint?: string;
  onTouched?: () => void; searchable?: boolean;
}) {
  const { t, language } = useLocalization();
  return (
    <Select
      label={label}
      hint={hint}
      value={value}
      options={options.map((o) => ({ id: o.id, label: o.label[language] }))}
      onChange={onChange}
      onClose={onTouched}
      searchable={searchable}
      error={error ? t(error) : null}
    />
  );
}

export function MultiSelect({ label, hint, options, value, onChange, error }: {
  label: string; hint?: string; options: Option[]; value: string[]; onChange: (ids: string[]) => void; error?: string | null;
}) {
  const { t, language } = useLocalization();
  const s = useStyles();
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <View style={s.field}>
      <AppText variant="captionStrong" tone="secondary" style={s.fieldLabel}>{label}</AppText>
      {hint ? <AppText variant="caption" tone="muted" style={s.fieldLabel}>{hint}</AppText> : null}
      <View style={s.checkList}>
        {options.map((o) => (
          <CheckRow key={o.id} checked={value.includes(o.id)} onPress={() => toggle(o.id)} label={o.label[language]} role="checkbox" />
        ))}
      </View>
      {error ? <FieldErrorText>{t(error)}</FieldErrorText> : null}
    </View>
  );
}

export function Checkbox({ checked, onChange, children, error, label }: {
  checked: boolean; onChange: (v: boolean) => void; children: ReactNode; error?: string | null; label?: string;
}) {
  const { t } = useLocalization();
  const s = useStyles();
  return (
    <View style={s.field}>
      <CheckRow checked={checked} onPress={() => onChange(!checked)} role="checkbox" label={label}>{children}</CheckRow>
      {error ? <FieldErrorText>{t(error)}</FieldErrorText> : null}
    </View>
  );
}

function CheckRow({ checked, onPress, label, children, role }: {
  checked: boolean; onPress: () => void; label?: string; children?: ReactNode; role: 'checkbox';
}) {
  const { colors } = useAppTheme();
  const s = useStyles();
  return (
    <PressableScale
      accessibilityRole={role}
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      haptic={false}
      scaleTo={0.98}
      onPress={() => { selectionHaptic(); onPress(); }}
      style={[s.checkRow, checked && s.checkRowOn]}
    >
      <View style={[s.box, checked && s.boxOn]}>{checked ? <Icon name="checkmark" size={16} color={colors.onPrimary} /> : null}</View>
      <View style={s.flex}>{children ?? <AppText variant="bodyMedium">{label}</AppText>}</View>
    </PressableScale>
  );
}

function FieldErrorText({ children }: { children: ReactNode }) {
  const { colors } = useAppTheme();
  const s = useStyles();
  return (
    <View style={s.errorRow} accessibilityLiveRegion="polite">
      <Icon name="alert-circle" size={15} color={colors.onDangerSoft} />
      <AppText variant="caption" tone="danger" style={s.flex}>{children}</AppText>
    </View>
  );
}

/** A rule that turns green when satisfied (password checklist). */
export function RuleRow({ ok, text }: { ok: boolean; text: string }) {
  const { colors } = useAppTheme();
  const s = useStyles();
  return (
    <View style={s.rule} accessible accessibilityLabel={text} accessibilityState={{ checked: ok }}>
      <Icon name={ok ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={ok ? colors.success : colors.textMuted} />
      <AppText variant="caption" tone={ok ? 'success' : 'muted'}>{text}</AppText>
    </View>
  );
}

export function Button({ title, onPress, disabled, loading, variant = 'primary', big, icon }: {
  title: string; onPress: () => void; disabled?: boolean; loading?: boolean; variant?: 'primary' | 'secondary' | 'danger' | 'link'; big?: boolean; icon?: IconName;
}) {
  const s = useStyles();
  return (
    <UiButton
      title={title}
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      icon={icon}
      variant={variant === 'link' ? 'ghost' : variant}
      size={big ? 'lg' : variant === 'link' ? 'sm' : 'md'}
      style={s.button}
    />
  );
}

/** Label + themed switch in a card row (e.g. “Same address as the caregiver”). */
export function SwitchRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  const { colors } = useAppTheme();
  const s = useStyles();
  return (
    <View style={[s.checkRow, s.switchRow]}>
      <AppText variant="bodyMedium" style={s.flex}>{label}</AppText>
      <Switch
        value={value}
        onValueChange={(v) => { selectionHaptic(); onValueChange(v); }}
        accessibilityLabel={label}
        trackColor={{ true: colors.primaryStrong, false: colors.border }}
        thumbColor={colors.card}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

/** Answer summary row: question label + chosen answer. */
export function SummaryRow({ label, value }: { label: string; value: string }) {
  const s = useStyles();
  return (
    <View style={s.summary} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="caption" tone="muted">{label}</AppText>
      <AppText variant="title">{value}</AppText>
    </View>
  );
}

/** Shimmer placeholders while a form draft loads. */
export function FormSkeleton({ label }: { label: string }) {
  const s = useStyles();
  return (
    <View style={s.skeleton} accessible accessibilityLabel={label} accessibilityState={{ busy: true }}>
      <Skeleton width="60%" height={32} />
      {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} height={54} radius={16} />)}
    </View>
  );
}

export const Card = ({ children }: { children: ReactNode }) => {
  const s = useStyles();
  return <UiCard style={s.card}>{children}</UiCard>;
};

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  page: { flex: 1, backgroundColor: t.colors.background },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
  content: { paddingHorizontal: t.spacing.screen },
  centered: { justifyContent: 'center', alignItems: 'center' },
  title: { marginBottom: t.spacing.xs },
  subtitle: { marginBottom: t.spacing.lg },
  section: { marginTop: t.spacing.sm, marginBottom: t.spacing.sm },
  hint: { marginBottom: t.spacing.sm },
  steps: { marginBottom: t.spacing.lg, gap: t.spacing.xs },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepTrack: { height: 8, borderRadius: t.radius.pill, backgroundColor: t.colors.primarySoft, overflow: 'hidden' },
  stepFill: { height: '100%', borderRadius: t.radius.pill, backgroundColor: t.colors.primaryStrong },
  message: {
    flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs, padding: t.spacing.md,
    borderRadius: t.radius.md, marginBottom: t.spacing.sm,
  },
  messageDanger: { backgroundColor: t.colors.dangerSoft },
  messageSuccess: { backgroundColor: t.colors.successSoft },
  eye: { width: t.touchTarget, height: t.touchTarget, alignItems: 'center', justifyContent: 'center', marginRight: -t.spacing.xs },
  field: { marginBottom: t.spacing.md },
  fieldLabel: { marginBottom: 6, marginLeft: 4 },
  checkList: { gap: t.spacing.xs },
  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm, minHeight: 52, padding: t.spacing.sm,
    borderRadius: t.radius.md, backgroundColor: t.colors.card, borderWidth: 1.5, borderColor: t.colors.border,
  },
  checkRowOn: { borderColor: t.colors.primary, backgroundColor: t.colors.primarySoft },
  box: {
    width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: t.colors.textMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  boxOn: { backgroundColor: t.colors.primaryStrong, borderColor: t.colors.primaryStrong },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginLeft: 4 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  button: { marginTop: t.spacing.xs },
  switchRow: { marginBottom: t.spacing.md },
  summary: { gap: 2, paddingVertical: t.spacing.sm, borderBottomWidth: 1, borderBottomColor: t.colors.border },
  skeleton: { alignSelf: 'stretch', gap: t.spacing.md },
  card: { marginBottom: t.spacing.md },
}));
