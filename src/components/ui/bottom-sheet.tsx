import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { useLocalization } from '@/localization';
import { makeStyles, useAppTheme } from '@/theme';
import { IconButton } from './icon-button';
import { AppText } from './text';

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Fraction of the window height the sheet may take (default 0.85). */
  maxHeight?: number;
};

/** Modal sheet that slides up over a dimmed backdrop and slides back down on close. */
export function BottomSheet({ visible, onClose, title, children, maxHeight = 0.85 }: BottomSheetProps) {
  const { motion } = useAppTheme();
  const { t } = useLocalization();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  // Stay mounted while the closing animation runs.
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    const duration = reduceMotion ? 0 : visible ? motion.slow : motion.base - 60;
    progress.set(withTiming(visible ? 1 : 0, { duration, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished && !visible) scheduleOnRN(setMounted, false);
    }));
  }, [visible, reduceMotion, motion, progress]);

  const backdrop = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.get()) * height }] }));

  return (
    <Modal visible={mounted} transparent statusBarTranslucent navigationBarTranslucent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, s.backdrop, backdrop]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('cancel')} />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.anchor} pointerEvents="box-none">
        <Animated.View
          style={[s.sheet, { maxHeight: height * maxHeight, paddingBottom: Math.max(insets.bottom, 16) }, sheet]}
          accessibilityViewIsModal
        >
          <View style={s.handle} />
          {title ? (
            <View style={s.header}>
              <AppText variant="h2" style={s.title} accessibilityRole="header">{title}</AppText>
              <IconButton icon="close" variant="soft" onPress={onClose} accessibilityLabel={t('cancel')} />
            </View>
          ) : null}
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  backdrop: { backgroundColor: t.colors.overlay },
  anchor: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: t.colors.background, borderTopLeftRadius: t.radius.xl, borderTopRightRadius: t.radius.xl,
    paddingTop: t.spacing.xs, ...t.shadows.lg,
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: t.colors.border, marginBottom: t.spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm, paddingHorizontal: t.spacing.screen, paddingBottom: t.spacing.sm },
  title: { flex: 1 },
}));
