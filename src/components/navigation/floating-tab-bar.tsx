import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { Keyboard, Platform, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Glass, Icon, PressableScale, selectionHaptic, TAB_BAR_GAP, TAB_BAR_HEIGHT, type IconName } from '@/components/ui';
import { makeStyles, useAppTheme } from '@/theme';

export type TabIcon = { active: IconName; inactive: IconName };

const ITEM = 52;
const PAD = (TAB_BAR_HEIGHT - ITEM) / 2;

/**
 * Floating glass “pill” tab bar. The active tab is a blue disc that springs between
 * the icons on the UI thread.
 */
export function FloatingTabBar({ state, descriptors, emitter, navigateToTab, insets, icons }: BottomTabBarProps & { icons: Record<string, TabIcon> }) {
  const { colors, motion } = useAppTheme();
  const s = useStyles();
  const position = useSharedValue(state.index);
  const keyboardVisible = useKeyboardVisible();

  useEffect(() => { position.set(withSpring(state.index, motion.gentleSpring)); }, [state.index, position, motion]);

  const bubble = useAnimatedStyle(() => ({ transform: [{ translateX: position.get() * ITEM }] }));

  if (keyboardVisible) return null;

  return (
    <Animated.View entering={FadeIn.duration(motion.base)} style={[s.host, { bottom: Math.max(insets.bottom - 8, 0) + TAB_BAR_GAP }]} pointerEvents="box-none">
      <View style={s.shadow}>
        <Glass style={s.pill} intensity={60}>
          <Animated.View style={[s.bubble, bubble]} />
          <View style={s.row} accessibilityRole="tablist">
            {state.routes.map((route, i) => {
              const focused = state.index === i;
              const { options } = descriptors[route.key];
              const label = typeof options.title === 'string' ? options.title : route.name;
              const icon = icons[route.name];
              const onPress = () => {
                const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  selectionHaptic();
                  navigateToTab(route.key);
                }
              };
              return (
                <PressableScale
                  key={route.key}
                  onPress={onPress}
                  onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
                  haptic={false}
                  scaleTo={0.9}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: focused }}
                  accessibilityLabel={label}
                  style={s.item}
                >
                  <Icon name={icon ? (focused ? icon.active : icon.inactive) : 'ellipse'} size={24} color={focused ? colors.onPrimary : colors.textSecondary} />
                </PressableScale>
              );
            })}
          </View>
        </Glass>
      </View>
    </Animated.View>
  );
}

/** Hides the floating bar while the keyboard is open (it would otherwise float above the keyboard on Android). */
function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return visible;
}

const useStyles = makeStyles((t) => ({
  host: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  shadow: { borderRadius: t.radius.pill, ...t.shadows.lg },
  pill: { borderRadius: t.radius.pill, padding: PAD, borderWidth: 1, borderColor: t.colors.border },
  row: { flexDirection: 'row' },
  item: { width: ITEM, height: ITEM, borderRadius: ITEM / 2, alignItems: 'center', justifyContent: 'center' },
  bubble: {
    position: 'absolute', top: PAD, left: PAD, width: ITEM, height: ITEM, borderRadius: ITEM / 2,
    backgroundColor: t.colors.primaryStrong,
  },
}));
