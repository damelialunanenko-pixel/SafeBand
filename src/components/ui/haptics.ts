import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

/** Light tap for regular buttons and cards. */
export const tapHaptic = () => {
  if (enabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
};

/** Strong impact for SOS. */
export const heavyHaptic = () => {
  if (enabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
};

export const selectionHaptic = () => {
  if (enabled) void Haptics.selectionAsync().catch(() => undefined);
};

export const warningHaptic = () => {
  if (enabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
};
