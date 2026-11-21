import { useState, type ReactNode } from 'react';
import { TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { makeStyles, useAppTheme } from '@/theme';
import { Icon, type IconName } from './icon';
import { AppText } from './text';

export type InputProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  icon?: IconName;
  /** Help text under the label. */
  hint?: string;
  /** Example value, shown under the field («Например: …»). */
  example?: string;
  /** Already translated error message. */
  error?: string | null;
  right?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

/** Text field: label, optional icon, hint/example, animated focus border and error state. */
export function Input({ label, icon, hint, example, error, right, containerStyle, onFocus, onBlur, ...input }: InputProps) {
  const { colors, motion } = useAppTheme();
  const s = useStyles();
  const focus = useSharedValue(0);
  const [focused, setFocused] = useState(false);
  const borderStyle = useAnimatedStyle(() => ({
    borderColor: error ? colors.danger : interpolateColor(focus.get(), [0, 1], [colors.border, colors.primary]),
  }));

  return (
    <View style={[s.field, containerStyle]}>
      {label ? <AppText variant="captionStrong" tone="secondary" style={s.label}>{label}</AppText> : null}
      {hint ? <AppText variant="caption" tone="muted" style={s.hint}>{hint}</AppText> : null}
      <Animated.View style={[s.box, focused && s.boxFocused, borderStyle]}>
        {icon ? <Icon name={icon} size={20} color={focused ? colors.primary : colors.textMuted} /> : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.placeholder}
          selectionColor={colors.primary}
          maxFontSizeMultiplier={1.6}
          {...input}
          style={s.input}
          onFocus={(e) => { setFocused(true); focus.set(withTiming(1, { duration: motion.fast })); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); focus.set(withTiming(0, { duration: motion.fast })); onBlur?.(e); }}
        />
        {right}
      </Animated.View>
      {error ? (
        <View style={s.errorRow} accessibilityLiveRegion="polite">
          <Icon name="alert-circle" size={15} color={colors.onDangerSoft} />
          <AppText variant="caption" tone="danger" style={s.flex}>{error}</AppText>
        </View>
      ) : example ? (
        <AppText variant="caption" tone="muted" style={s.example}>{example}</AppText>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  field: { marginBottom: t.spacing.md },
  label: { marginBottom: 6, marginLeft: 4 },
  hint: { marginBottom: 6, marginLeft: 4 },
  box: {
    flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs, minHeight: 54,
    paddingHorizontal: t.spacing.md, borderRadius: t.radius.md, borderWidth: 1.5,
    backgroundColor: t.colors.card,
  },
  boxFocused: t.shadows.sm,
  input: { flex: 1, color: t.colors.text, ...t.typography.bodyMedium, paddingVertical: t.spacing.sm },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginLeft: 4 },
  example: { marginTop: 6, marginLeft: 4 },
  flex: { flex: 1 },
}));
