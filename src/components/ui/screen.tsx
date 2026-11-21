import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalization } from '@/localization';
import { makeStyles, useAppTheme } from '@/theme';
import { IconButton } from './icon-button';
import { AppText } from './text';

/** Height reserved under scroll content for the floating tab bar. */
export const TAB_BAR_HEIGHT = 68;
export const TAB_BAR_GAP = 12;

export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + TAB_BAR_GAP * 2 + Math.max(insets.bottom - 8, 0);
}

/** Soft blue gradient header with a glow in the top-right corner and rounded bottom edge. */
export function GradientHeader({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { gradients } = useAppTheme();
  const insets = useSafeAreaInsets();
  const s = useStyles();
  return (
    <View style={[s.header, { paddingTop: insets.top + 8 }, style]}>
      <LinearGradient colors={gradients.header} start={{ x: 0, y: 0 }} end={{ x: 0.2, y: 1 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={gradients.headerGlow} start={{ x: 1, y: 0 }} end={{ x: 0.35, y: 0.7 }} style={s.glow} pointerEvents="none" />
      {children}
    </View>
  );
}

type TopBarProps = {
  title?: string;
  /** Show a round back button (default: when there is history). */
  back?: boolean;
  onBack?: () => void;
  right?: ReactNode;
};

/** Back button · centred title · right slot. */
export function TopBar({ title, back, onBack, right }: TopBarProps) {
  const router = useRouter();
  const { t } = useLocalization();
  const s = useStyles();
  const showBack = back ?? router.canGoBack();
  return (
    <View style={s.bar}>
      <View style={s.side}>
        {showBack ? <IconButton icon="arrow-back" onPress={onBack ?? (() => router.back())} accessibilityLabel={t('back')} /> : null}
      </View>
      <AppText variant="h2" numberOfLines={1} style={s.barTitle} accessibilityRole="header">{title}</AppText>
      <View style={[s.side, s.sideRight]}>{right}</View>
    </View>
  );
}

type ScreenScrollProps = {
  children: ReactNode;
  header?: ReactNode;
  /** Leave room for the floating tab bar. */
  tabbed?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
};

/** Page background + optional header + scrolling content with screen padding. */
export function ScreenScroll({ children, header, tabbed, refreshing, onRefresh, contentStyle }: ScreenScrollProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const s = useStyles();
  return (
    <View style={s.page}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: tabbed ? tabSpace + 8 : insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? (
          <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.card} />
        ) : undefined}
      >
        {header ?? <View style={{ height: insets.top }} />}
        <View style={[s.content, contentStyle]}>{children}</View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  page: { flex: 1, backgroundColor: t.colors.background },
  header: {
    paddingHorizontal: t.spacing.screen, paddingBottom: t.spacing.xl, overflow: 'hidden',
    borderBottomLeftRadius: t.radius.xl, borderBottomRightRadius: t.radius.xl,
  },
  glow: { position: 'absolute', top: 0, right: 0, width: 260, height: 220 },
  bar: { flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: t.spacing.sm },
  side: { minWidth: t.touchTarget, flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
  sideRight: { justifyContent: 'flex-end' },
  barTitle: { flex: 1, textAlign: 'center' },
  content: { paddingHorizontal: t.spacing.screen, paddingTop: t.spacing.lg, gap: t.spacing.md },
}));
