import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

const noop = () => Promise.resolve();

export const impactAsync: typeof Haptics.impactAsync = isNative
  ? Haptics.impactAsync
  : (noop as any);

export const notificationAsync: typeof Haptics.notificationAsync = isNative
  ? Haptics.notificationAsync
  : (noop as any);

export const selectionAsync: typeof Haptics.selectionAsync = isNative
  ? Haptics.selectionAsync
  : (noop as any);

export const ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle;
export const NotificationFeedbackType = Haptics.NotificationFeedbackType;
