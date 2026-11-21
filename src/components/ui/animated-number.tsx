import { useEffect } from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type TextStyle } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { useAppTheme, type TypographyVariant } from '@/theme';
import { AppText, toneColor, type TextTone } from './text';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type AnimatedNumberProps = {
  value?: number | null;
  variant?: TypographyVariant;
  tone?: TextTone;
  decimals?: number;
  /** Shown when there is no value. */
  placeholder?: string;
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
};

/**
 * Number that counts smoothly to each new value. The digits are written by a worklet
 * into a read-only TextInput, so no React state changes during the animation.
 */
export function AnimatedNumber({ value, variant = 'h1', tone = 'default', decimals = 0, placeholder = '—', style, accessibilityLabel }: AnimatedNumberProps) {
  const { typography, colors } = useAppTheme();
  const has = typeof value === 'number' && Number.isFinite(value);
  const current = useSharedValue(0);

  useEffect(() => {
    if (has) current.set(withTiming(value, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [has, value, current]);

  const animatedProps = useAnimatedProps(() => {
    const text = current.get().toFixed(decimals);
    return { text, defaultValue: text } as object;
  });

  if (!has) return <AppText variant={variant} tone={tone} style={style}>{placeholder}</AppText>;

  return (
    <View accessible accessibilityRole="text" accessibilityLabel={accessibilityLabel ?? value.toFixed(decimals)}>
      <AnimatedTextInput
        editable={false}
        pointerEvents="none"
        underlineColorAndroid="transparent"
        importantForAccessibility="no-hide-descendants"
        defaultValue={(0).toFixed(decimals)}
        animatedProps={animatedProps}
        maxFontSizeMultiplier={1.4}
        style={[typography[variant], { color: toneColor(tone, colors) }, styles.reset, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({ reset: { padding: 0, margin: 0, includeFontPadding: false, minWidth: 8 } });
